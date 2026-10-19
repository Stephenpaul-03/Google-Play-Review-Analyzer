"""Step 1: fetch public reviews, save them raw, clean them, and save the clean CSV.

Run: python scrape_reviews.py --app <name> [--limit 300]
Outputs (in data/<app_id>/): reviews_raw.jsonl, reviews_clean.csv, app_meta.json.
The review source is swappable: see sources/__init__.py. Nothing here depends on the categorizer.
"""

import json
import re
import time
from datetime import datetime, timezone

from common import (EXIT_CONFIG, EXIT_MISSING_INPUT, EXIT_UNEXPECTED, data_dir, fail, load_config, log,
                    parse_args, run, setup_logging, utc_now_iso, write_csv)
from sources import AppNotFound, FetchError, load_source

CLEAN_COLUMNS = ["review_id", "country", "rating", "text", "review_date", "app_version", "thumbs_up",
                 "has_dev_reply", "dev_reply_date", "user_name"]
RETRY_BACKOFF_SEC = (5, 15, 45)
WHITESPACE_RE = re.compile(r"\s+")


def parse_since_date(value: str) -> str:
    """Validate scrape.since_date and return it as a comparable UTC ISO string ('' when unset)."""
    if not value:
        return ""
    try:
        day = datetime.strptime(value, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except (TypeError, ValueError):
        fail(EXIT_CONFIG, 'Invalid config: scrape.since_date must be "YYYY-MM-DD" or ""')
    return day.strftime("%Y-%m-%dT%H:%M:%SZ")


def fetch_page(source, cfg: dict, country: str, token):
    """Fetch one page, retrying 3 times with backoff on errors. Returns (raws, token) or None."""
    app, page_size = cfg["app"], cfg["scrape"]["page_size"]
    for attempt in range(len(RETRY_BACKOFF_SEC) + 1):
        try:
            return source.fetch_page(app["app_id"], app["lang"], country, page_size, token)
        except FetchError as e:
            if attempt == len(RETRY_BACKOFF_SEC):
                break
            wait = RETRY_BACKOFF_SEC[attempt]
            log.warning("Request failed for %s (%s); retrying in %ss", country, e, wait)
            time.sleep(wait)
    log.warning("Giving up on %s after %d retries; keeping what was fetched", country, len(RETRY_BACKOFF_SEC))
    return None


def fetch_country(source, cfg: dict, country: str, cap: int, since_iso: str) -> list[dict]:
    """Page through the newest reviews for one country until a stop condition is hit.
    Returns items of {"raw": ..., "record": ...} with the country added to the record."""
    items: list[dict] = []
    seen: set[str] = set()
    token, page = None, 0
    while len(items) < cap:
        fetched = fetch_page(source, cfg, country, token)
        if fetched is None:
            break
        batch, token = fetched
        page += 1
        batch = [{"raw": raw, "record": {**source.to_record(raw), "country": country}}
                 for raw in batch[:cap - len(items)]]
        new_ids = {b["record"]["review_id"] for b in batch} - seen
        seen |= new_ids
        items.extend(batch)
        log.info("country=%s page=%d reviews=%d total=%d", country, page, len(batch), len(items))
        if not batch:
            break
        if not new_ids:
            log.info("country=%s page %d added no new reviews; stopping", country, page)
            break
        if since_iso and min((b["record"]["review_date"] or since_iso) for b in batch) < since_iso:
            break  # newest-first, so everything after this page is older still
        if token is None:
            break
        time.sleep(cfg["scrape"]["sleep_between_pages_sec"])
    if not items:
        log.info("country=%s has no reviews; moving on", country)
    return items


def letter_count(text: str) -> int:
    """Count letters in any script; emoji, digits, punctuation and whitespace are not letters."""
    return sum(1 for ch in text if ch.isalpha())


def clean(records: list[dict], cfg: dict, since_iso: str) -> tuple[list[dict], dict[str, int]]:
    """Apply the cleaning rules in order, returning clean rows and how many each rule removed."""
    scrape = cfg["scrape"]
    keep_ratings = set(scrape["keep_ratings"])
    keep_names = cfg["app"]["keep_user_names"]
    removed = {"duplicate review_id": 0, "rating not in keep_ratings": 0,
               "older than since_date": 0, "fewer than min_letters letters": 0}

    seen: set[str] = set()
    rows = []
    for r in records:  # 1. dedupe, keeping the first (and so its first country)
        if r["review_id"] in seen:
            removed["duplicate review_id"] += 1
            continue
        seen.add(r["review_id"])
        rows.append(r)

    kept = [r for r in rows if r["rating"] in keep_ratings]  # 2. rating
    removed["rating not in keep_ratings"] = len(rows) - len(kept)
    rows = kept

    if since_iso:  # 3. date (all dates are UTC ISO strings, so string comparison is exact)
        kept = [r for r in rows if r["review_date"] >= since_iso]
        removed["older than since_date"] = len(rows) - len(kept)
        rows = kept

    out = []
    for r in rows:
        text = WHITESPACE_RE.sub(" ", r["text"].replace("\r", " ").replace("\n", " ")).strip()  # 4.
        if letter_count(text) < scrape["min_letters"]:  # 5.
            removed["fewer than min_letters letters"] += 1
            continue
        if len(text) > scrape["max_chars"]:  # 6.
            text = text[:scrape["max_chars"]] + "…"
        out.append({
            "review_id": r["review_id"], "country": r["country"], "rating": r["rating"], "text": text,
            "review_date": r["review_date"], "app_version": r["app_version"], "thumbs_up": r["thumbs_up"],
            "has_dev_reply": "true" if r["reply_text"].strip() else "false", "dev_reply_date": r["reply_date"],
            "user_name": r["user_name"] if keep_names else "",
        })
    out.sort(key=lambda row: row["review_date"], reverse=True)  # 7.
    return out, removed


def main() -> None:
    """Validate the app, fetch reviews per country, save raw, clean, and report."""
    args = parse_args("Fetch and clean public app store reviews.")
    setup_logging("scrape_reviews")
    cfg = load_config(args.config, args.app)
    app = cfg["app"]
    since_iso = parse_since_date(cfg["scrape"].get("since_date", ""))
    try:
        source = load_source(cfg["scrape"].get("source", "google_play"))
    except ImportError as e:
        fail(EXIT_CONFIG, f"Invalid config: scrape.source could not be loaded ({e})")
    out_dir = data_dir(cfg)

    try:
        details = source.lookup(app["app_id"], app["lang"], app["countries"][0])
    except AppNotFound:
        fail(EXIT_MISSING_INPUT, f"App not found: {app['app_id']}. Check app_id in apps/{cfg['profile_name']}.toml.")
    except FetchError as e:
        fail(EXIT_UNEXPECTED, f"Could not reach the store ({e}). Check your internet connection and retry.")
    log.info("App: %s (%s installs)", details["title"], details["installs"])

    items: list[dict] = []
    per_country: dict[str, int] = {}
    for country in app["countries"]:
        cap = cfg["scrape"]["max_reviews_per_country"]
        if args.limit is not None:
            cap = min(cap, args.limit - len(items))
        fetched = fetch_country(source, cfg, country, cap, since_iso) if cap > 0 else []
        per_country[country] = len(fetched)
        items.extend(fetched)

    raw_path, clean_path, meta_path = (out_dir / "reviews_raw.jsonl", out_dir / "reviews_clean.csv",
                                       out_dir / "app_meta.json")
    with open(raw_path, "w", encoding="utf-8") as f:
        for item in items:
            stored = {**source.to_storable(item["raw"], app["keep_user_names"]),
                      "country": item["record"]["country"], "lang": app["lang"]}
            f.write(json.dumps(stored, ensure_ascii=False) + "\n")

    rows, removed = clean([item["record"] for item in items], cfg, since_iso)
    write_csv(clean_path, CLEAN_COLUMNS, rows)
    meta = {"app_id": app["app_id"], "app_title": details["title"], "developer": details.get("developer", ""),
            "countries": app["countries"], "lang": app["lang"], "scraped_at": utc_now_iso()}
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

    print("\nScrape report")
    for country, count in per_country.items():
        print(f"  raw reviews [{country}]: {count}")
    print(f"  raw total: {len(items)}")
    for rule, count in removed.items():
        print(f"  removed ({rule}): {count}")
    print(f"  clean reviews: {len(rows)}")
    if items and not rows:
        print(f"  All reviews were removed by cleaning, mostly by the rule: {max(removed, key=removed.get)}")
    for path in (raw_path, clean_path, meta_path):
        print(f"  wrote {path}")


if __name__ == "__main__":
    run(main)
