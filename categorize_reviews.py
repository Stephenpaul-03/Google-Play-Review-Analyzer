"""Step 2: categorize each clean review with the configured engine (default: local Ollama model).

Run: python categorize_reviews.py --app <name> [--limit 50] [--fresh]
Reads data/<app_id>/reviews_clean.csv; appends to reviews_categorized.csv as it goes (safe to
stop with Ctrl+C and rerun) and rebuilds category_summary.csv at the end.
Categories come from the app profile (apps/<name>.toml); the engine is swappable (engines/__init__.py).
"""

import csv
import sys
import time
from collections import Counter

import ui
from common import (EXIT_CONFIG, EXIT_ENGINE, EXIT_MISSING_INPUT, EXIT_STOPPED, EXIT_UNEXPECTED, UNCLASSIFIED,
                    data_dir, fail, load_config, log, parse_args, read_csv, run, setting, setup_logging, short,
                    utc_now_iso, write_csv)
from engines import AttemptFailed, EngineUnavailable, load_engine

OUT_COLUMNS = ["review_id", "country", "rating", "review_date", "app_version", "thumbs_up", "text",
               "primary_category", "secondary_categories", "is_complaint", "sentiment", "summary", "model",
               "categorized_at", "error"]
SUMMARY_COLUMNS = ["category", "review_count", "percent", "avg_rating", "total_thumbs_up", "latest_review_date",
                   "top_app_version"]
SENTIMENTS = {"negative", "mixed", "neutral", "positive"}
MAX_UNCLASSIFIED_IN_A_ROW = 5
RETRY_SLEEP_SEC = 2
EXCEL_LOCKED = "Close reviews_categorized.csv in Excel and run again"


def validate_answer(answer: dict, category_ids: list[str]) -> dict:
    """Check types and categories, then tidy secondaries and summary. Raises ValueError if invalid."""
    expected = {"primary_category": str, "secondary_categories": list, "is_complaint": bool,
                "sentiment": str, "summary": str}
    for key, kind in expected.items():
        if not isinstance(answer.get(key), kind):
            raise ValueError(f"{key} missing or not {kind.__name__}")
    primary = answer["primary_category"]
    if primary not in category_ids:
        raise ValueError(f"unknown primary_category {primary!r}")
    secondaries: list[str] = []
    for name in answer["secondary_categories"]:
        if not isinstance(name, str) or name not in category_ids:
            raise ValueError(f"unknown secondary category {name!r}")
        if name != primary and name not in secondaries:
            secondaries.append(name)
    if answer["sentiment"] not in SENTIMENTS:
        raise ValueError(f"unknown sentiment {answer['sentiment']!r}")
    summary = " ".join(answer["summary"].split())[:200]
    if not summary:
        raise ValueError("empty summary")
    return {"primary_category": primary, "secondary_categories": ";".join(secondaries[:2]),
            "is_complaint": "true" if answer["is_complaint"] else "false",
            "sentiment": answer["sentiment"], "summary": summary, "error": ""}


def classify_review(engine, cfg: dict, review: dict) -> tuple[dict, int]:
    """Classify one review with retries; never raises for a bad answer (returns an unclassified row).
    Returns the row and the number of attempts used."""
    categories = cfg["categories"]
    ids = [c["id"] for c in categories]
    attempts = 1 + int(cfg.get("classify", {}).get("max_retries", 2))
    error = ""
    for attempt in range(attempts):
        try:
            result = validate_answer(engine.classify(cfg, review, categories), ids)
            used = attempt + 1
            break
        except (AttemptFailed, ValueError) as e:
            error = str(e)
            log.warning("review %s attempt %d/%d failed: %s", review["review_id"], attempt + 1, attempts, error)
            if attempt + 1 < attempts:
                time.sleep(RETRY_SLEEP_SEC)
    else:
        result = {"primary_category": UNCLASSIFIED, "secondary_categories": "", "is_complaint": "",
                  "sentiment": "", "summary": "", "error": error[:500]}
        used = attempts
    row = {key: review.get(key, "") for key in ("review_id", "country", "rating", "review_date", "app_version",
                                                "thumbs_up", "text")}
    row.update(result, model=engine.label(cfg), categorized_at=utc_now_iso())
    return row, used


def build_summary(rows: list[dict]) -> list[dict]:
    """One row per primary category over the whole categorized file, biggest first."""
    groups: dict[str, list[dict]] = {}
    for row in rows:
        groups.setdefault(row["primary_category"], []).append(row)
    summary = []
    for category, group in groups.items():
        versions = Counter(r["app_version"] for r in group if r["app_version"])
        summary.append({
            "category": category,
            "review_count": len(group),
            "percent": f"{len(group) / len(rows) * 100:.1f}",
            "avg_rating": f"{sum(int(r['rating']) for r in group) / len(group):.2f}",
            "total_thumbs_up": sum(int(r["thumbs_up"] or 0) for r in group),
            "latest_review_date": max(r["review_date"] for r in group),
            "top_app_version": versions.most_common(1)[0][0] if versions else "",
        })
    summary.sort(key=lambda s: s["review_count"], reverse=True)
    return summary


def warn_changed_categories(done_rows: list[dict], category_ids: list[str]) -> None:
    """Warn about categories in the existing output that are no longer configured (old rows are kept)."""
    used = {r["primary_category"] for r in done_rows}
    used |= {s for r in done_rows for s in r["secondary_categories"].split(";") if s}
    stale = sorted(used - set(category_ids) - {UNCLASSIFIED})
    if stale:
        ui.warn(f"Earlier results use categories no longer in the profile ({', '.join(stale)}); "
                "run with --fresh to recategorize everything")


def load_and_check_engine(cfg: dict):
    """Load the configured engine, check its config keys, and make sure it can run (exit 4 if not)."""
    name = cfg.get("classify", {}).get("engine", "ollama")
    try:
        engine = load_engine(name)
    except ImportError as e:
        fail(EXIT_CONFIG, f"Invalid config: classify.engine = {name!r} could not be loaded ({e})")
    for key in getattr(engine, "CONFIG_KEYS", []):
        if setting(cfg, key) in (None, ""):
            fail(EXIT_CONFIG, f"Invalid config: {key} is missing")
    try:
        engine.check(cfg)
    except EngineUnavailable as e:
        fail(EXIT_ENGINE, str(e))
    return engine


def start_fresh(out_path) -> None:
    """Move an existing categorized file aside so every review is categorized again."""
    if out_path.exists():
        backup = out_path.with_name(f"reviews_categorized.{time.strftime('%Y%m%d_%H%M%S')}.bak.csv")
        out_path.rename(backup)
        ui.info(f"Starting fresh; previous results kept in {backup.name}")


def main() -> None:
    """Categorize every not-yet-categorized review, appending as we go, then rebuild the summary."""
    args = parse_args("Categorize clean reviews.", extra=lambda p: p.add_argument(
        "--fresh", action="store_true", help="recategorize everything (the old file is kept as a .bak.csv)"))
    setup_logging("categorize_reviews")
    ui.stage("Categorizing reviews")
    cfg = load_config(args.config, args.app)
    engine = load_and_check_engine(cfg)
    ui.field("Engine", f"{cfg.get('classify', {}).get('engine', 'ollama')} · {engine.label(cfg)}")
    ui.field("Categories", f"{len(cfg['categories'])} from apps/{cfg['profile_name']}.toml")

    out_dir = data_dir(cfg)
    clean_path, out_path = out_dir / "reviews_clean.csv", out_dir / "reviews_categorized.csv"
    summary_path = out_dir / "category_summary.csv"
    if not clean_path.exists():
        fail(EXIT_MISSING_INPUT, "No clean reviews yet", f"run: python scrape_reviews.py --app {cfg['profile_name']}")
    reviews = read_csv(clean_path)
    if args.fresh:
        try:
            start_fresh(out_path)
        except PermissionError:
            fail(EXIT_UNEXPECTED, "reviews_categorized.csv is locked", "close it in Excel and run again")

    done_rows = read_csv(out_path) if out_path.exists() else []
    done_ids = {r["review_id"] for r in done_rows}
    warn_changed_categories(done_rows, [c["id"] for c in cfg["categories"]])
    todo = [r for r in reviews if r["review_id"] not in done_ids]
    remaining = len(todo)
    if args.limit is not None:
        todo = todo[:args.limit]
    ui.field("Reviews", f"{ui.number(len(reviews))} clean · {ui.number(len(done_ids))} already done · "
                        f"{ui.bold(ui.number(len(todo)))} to do now"
                        + (ui.dim(f" (--limit; {ui.number(remaining)} left in total)") if len(todo) < remaining else ""))
    log.info("Resuming: %d already done, %d to go", len(done_ids), len(todo))

    new_file = not out_path.exists()
    in_a_row = retried = failed = 0
    bar = ui.Progress("Progress", len(todo)) if todo else None
    try:
        with open(out_path, "w" if new_file else "a", encoding="utf-8-sig" if new_file else "utf-8",
                  newline="") as f:
            writer = csv.DictWriter(f, fieldnames=OUT_COLUMNS, quoting=csv.QUOTE_MINIMAL)
            if new_file:
                writer.writeheader()
            for i, review in enumerate(todo, 1):
                log.debug("review %s: %s", review["review_id"], review["text"][:80])
                row, attempts = classify_review(engine, cfg, review)
                writer.writerow(row)
                f.flush()
                retried += attempts > 1
                failed += row["primary_category"] == UNCLASSIFIED
                in_a_row = in_a_row + 1 if row["primary_category"] == UNCLASSIFIED else 0
                notes = " · ".join(n for n in (f"{retried} retried" if retried else "",
                                               f"{failed} failed" if failed else "") if n)
                bar.update(i, notes)
                if in_a_row >= MAX_UNCLASSIFIED_IN_A_ROW:
                    bar.finish()
                    try:
                        engine.check(cfg)
                        message = engine.UNAVAILABLE_HINT
                    except EngineUnavailable as e:
                        message = str(e)
                    fail(EXIT_ENGINE, f"{MAX_UNCLASSIFIED_IN_A_ROW} reviews in a row failed, so the run stopped",
                         f"{message} Then run the same command to continue.")
    except PermissionError:
        if bar:
            bar.finish()
        fail(EXIT_UNEXPECTED, "reviews_categorized.csv is locked", "close it in Excel and run again")
    except KeyboardInterrupt:
        if bar:
            bar.finish()
        ui.warn(f"Stopped after {ui.number(bar.done if bar else 0)} of {ui.number(len(todo))}. "
                "Everything finished is saved; run the same command to continue.")
        sys.exit(EXIT_STOPPED)

    elapsed = bar.finish() if bar else 0
    all_rows = read_csv(out_path)
    try:
        write_csv(summary_path, SUMMARY_COLUMNS, build_summary(all_rows) if all_rows else [])
    except PermissionError:
        fail(EXIT_UNEXPECTED, "category_summary.csv is locked", "close it in Excel and run again")
    if todo:
        ui.ok(f"Categorized {ui.number(len(todo))} reviews in {ui.duration(elapsed)}"
              + (ui.yellow(f" ({failed} could not be classified)") if failed else ""))
    else:
        ui.ok("Nothing new to categorize")
    labels = {c["id"]: c["label"] for c in cfg["categories"]}
    top = [s for s in build_summary(all_rows) if s["category"] not in ("other", UNCLASSIFIED)][:3] if all_rows else []
    if top:
        ui.field("Top", " · ".join(f"{labels.get(s['category'], s['category'])} {s['percent']}%" for s in top))
    ui.ok(f"Saved {short(out_path)} ({ui.number(len(all_rows))} reviews) and {summary_path.name}")


if __name__ == "__main__":
    run(main)
