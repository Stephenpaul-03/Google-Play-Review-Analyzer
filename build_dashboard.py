"""Step 3: prepare the dashboard data for one app (see docs/data-contract.md).

Run: python build_dashboard.py --app <name> [--open]
Writes data/<app_id>/dashboard_data.json, refreshes data/apps.json (the app switcher's index),
and, when the web app has been built (cd web && npm run build), a single offline
data/<app_id>/dashboard.html you can double-click or email.
"""

import json
import webbrowser
from collections import Counter

import ui
from common import (DATA_DIR, EXIT_MISSING_INPUT, ROOT, data_dir, fail, load_config, log, parse_args, read_csv,
                    run, setup_logging, short, utc_now_iso)

SCHEMA_VERSION = 1
WEB_BUILD = ROOT / "web" / "dist" / "index.html"
PLACEHOLDER = '<script id="dashboard-data" type="application/json">null</script>'


def to_int(value: str) -> int:
    """Parse an integer CSV cell, treating blanks as 0."""
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def to_float(value: str) -> float:
    """Parse a decimal CSV cell, treating blanks as 0."""
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def review_for_page(row: dict, clean: dict, keep_names: bool) -> dict:
    """A categorized row with proper JSON types, plus reply and name fields from the clean CSV."""
    out = dict(row)
    out["rating"] = to_int(row["rating"])
    out["thumbs_up"] = to_int(row["thumbs_up"])
    out["is_complaint"] = {"true": True, "false": False}.get(row["is_complaint"])
    out["secondary_categories"] = [s for s in row["secondary_categories"].split(";") if s]
    out["has_dev_reply"] = clean.get("has_dev_reply") == "true"
    out["dev_reply_date"] = clean.get("dev_reply_date", "")
    out["user_name"] = clean.get("user_name", "") if keep_names else ""
    return out


def summary_for_page(row: dict) -> dict:
    """A category_summary.csv row with numeric types."""
    out = dict(row)
    for key in ("review_count", "total_thumbs_up"):
        out[key] = to_int(row[key])
    for key in ("percent", "avg_rating"):
        out[key] = to_float(row[key])
    return out


def embed_json(data: dict) -> str:
    """Serialize data for a <script type="application/json"> block that review text cannot break out of."""
    return json.dumps(data, ensure_ascii=False).replace("</", "<\\/").replace("<!--", "\\u003c!--")


def build_data(cfg: dict) -> dict:
    """Assemble the dashboard data for one app from the pipeline outputs."""
    out_dir = data_dir(cfg)
    categorized, summary, meta_path, clean_path = (out_dir / "reviews_categorized.csv",
                                                   out_dir / "category_summary.csv", out_dir / "app_meta.json",
                                                   out_dir / "reviews_clean.csv")
    if not all(p.exists() for p in (categorized, summary, meta_path)):
        fail(EXIT_MISSING_INPUT, "No categorized reviews yet",
             f"run: python categorize_reviews.py --app {cfg['profile_name']}")
    app = cfg["app"]
    clean = {r["review_id"]: r for r in read_csv(clean_path)} if clean_path.exists() else {}
    rows = read_csv(categorized)
    models = Counter(r["model"] for r in rows if r["model"])
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    meta.update({
        "lang": meta.get("lang", app["lang"]),
        "built_at": utc_now_iso(),
        "play_url": f"https://play.google.com/store/apps/details?id={app['app_id']}",
        "keep_user_names": app["keep_user_names"],
        "engine": f"{cfg['classify'].get('engine', 'ollama')}:{models.most_common(1)[0][0]}" if models else "",
    })
    return {
        "schema_version": SCHEMA_VERSION,
        "meta": meta,
        "categories": [{"id": c["id"], "label": c["label"], "description": c["description"]}
                       for c in cfg["categories"]],
        "reviews": [review_for_page(r, clean.get(r["review_id"], {}), app["keep_user_names"]) for r in rows],
        "summary": [summary_for_page(r) for r in read_csv(summary)],
    }


def refresh_index() -> int:
    """Rebuild data/apps.json from every data/*/dashboard_data.json; return how many apps it lists."""
    apps = []
    for path in sorted(DATA_DIR.glob("*/dashboard_data.json")):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            log.warning("Skipping unreadable %s", path)
            continue
        meta = data.get("meta", {})
        apps.append({"app_id": meta.get("app_id", path.parent.name), "app_title": meta.get("app_title", ""),
                     "review_count": len(data.get("reviews", [])), "scraped_at": meta.get("scraped_at", ""),
                     "built_at": meta.get("built_at", "")})
    (DATA_DIR / "apps.json").write_text(json.dumps({"apps": apps}, ensure_ascii=False, indent=2), encoding="utf-8")
    return len(apps)


def main() -> None:
    """Write the data file and index, then the single-file dashboard if the web app is built."""
    args = parse_args("Build the review dashboard data.", with_limit=False, extra=lambda p: p.add_argument(
        "--open", action="store_true", help="open the single-file dashboard in the default browser"))
    setup_logging("build_dashboard")
    ui.stage("Building dashboard")
    cfg = load_config(args.config, args.app)
    data = build_data(cfg)
    out_dir = data_dir(cfg)

    data_path = out_dir / "dashboard_data.json"
    data_path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    count = refresh_index()
    ui.ok(f"Data: {short(data_path)} ({ui.number(len(data['reviews']))} reviews)")
    ui.ok(f"Index: data/apps.json ({count} app{'s' if count != 1 else ''})")

    if not WEB_BUILD.exists():
        ui.warn("Single-file dashboard skipped: the web app isn't built yet")
        ui.info(ui.dim("Build it once with:  cd web && npm install && npm run build"))
        return
    template = WEB_BUILD.read_text(encoding="utf-8")
    if PLACEHOLDER not in template:
        fail(EXIT_MISSING_INPUT, "web/dist/index.html has no data placeholder", "rebuild it: cd web && npm run build")
    html_path = out_dir / "dashboard.html"
    html_path.write_text(template.replace(PLACEHOLDER, PLACEHOLDER.replace(">null<", f">{embed_json(data)}<"), 1),
                         encoding="utf-8")
    ui.ok(f"Dashboard: {short(html_path)} ({html_path.stat().st_size / 1_048_576:.1f} MB)")
    ui.field("Open", f"{html_path.as_uri()}", width=6)
    ui.field("or", f"cd web && npm run preview   {ui.dim('(all apps, with an app switcher)')}", width=6)
    if args.open:
        webbrowser.open(html_path.as_uri())


if __name__ == "__main__":
    run(main)
