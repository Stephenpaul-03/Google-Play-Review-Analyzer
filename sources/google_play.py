"""Source: public Google Play reviews via google-play-scraper (pinned in requirements.txt).

The library is no longer actively maintained (last release June 2024). Everything that
depends on it lives in this file, so it can be replaced without touching the pipeline.
"""

import importlib
import re
import urllib.request
from datetime import datetime, timezone

from google_play_scraper import Sort, app as gp_app, reviews as gp_reviews, search as gp_search
from google_play_scraper.exceptions import NotFoundError

from sources import AppNotFound, FetchError

# reviews() swallows network/HTTP errors and just returns fewer reviews. Wrapping its internal
# page fetch lets us tell "no more reviews" apart from "request failed".
_reviews_module = importlib.import_module("google_play_scraper.features.reviews")
_original_fetch = _reviews_module._fetch_review_items
_fetch_errors: list[Exception] = []


def _tracked_fetch(*args, **kwargs):
    """Call the library's page fetch, remembering any exception before re-raising it."""
    try:
        return _original_fetch(*args, **kwargs)
    except Exception as e:
        _fetch_errors.append(e)
        raise


_reviews_module._fetch_review_items = _tracked_fetch


def to_utc_iso(value: datetime | None) -> str:
    """Convert the library's naive local-time datetime to YYYY-MM-DDTHH:MM:SSZ in UTC ('' for None)."""
    if value is None:
        return ""
    return value.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def lookup(app_id: str, lang: str, country: str) -> dict:
    """Title and install count for an app; AppNotFound if Google returns 404."""
    try:
        details = gp_app(app_id, lang=lang, country=country)
    except NotFoundError:
        raise AppNotFound(app_id)
    except Exception as e:
        raise FetchError(str(e))
    return {"title": details.get("title") or app_id, "installs": details.get("installs") or "",
            "developer": details.get("developer") or "", "reviews": details.get("reviews") or 0}


def fetch_page(app_id: str, lang: str, country: str, page_size: int, token):
    """One page of NEWEST reviews and the token for the next page (None at the end)."""
    _fetch_errors.clear()
    try:
        result, next_token = gp_reviews(app_id, lang=lang, country=country, sort=Sort.NEWEST,
                                        count=page_size, continuation_token=token)
    except Exception as e:  # the library normally swallows errors, but be safe
        raise FetchError(str(e))
    if _fetch_errors:
        raise FetchError(str(_fetch_errors[-1]))
    return result, (None if next_token is None or next_token.token is None else next_token)


def to_record(raw: dict) -> dict:
    """Standard fields for one review."""
    return {
        "review_id": raw["reviewId"],
        "user_name": raw.get("userName") or "",
        "text": raw.get("content") or "",
        "rating": raw.get("score"),
        "thumbs_up": raw.get("thumbsUpCount") or 0,
        "app_version": raw.get("reviewCreatedVersion") or raw.get("appVersion") or "",
        "review_date": to_utc_iso(raw.get("at")),
        "reply_text": raw.get("replyContent") or "",
        "reply_date": to_utc_iso(raw.get("repliedAt")),
    }


def to_storable(raw: dict, keep_user_names: bool) -> dict:
    """Raw review for reviews_raw.jsonl: datetimes as UTC ISO, profile photo never kept, name only if allowed."""
    private = {"userImage"} if keep_user_names else {"userImage", "userName"}
    return {k: (to_utc_iso(v) if isinstance(v, datetime) else v) for k, v in raw.items() if k not in private}


def search(query: str, lang: str, country: str, limit: int = 8) -> list[dict]:
    """Search the store. The library sometimes returns the top hit without its package ID,
    so missing IDs are recovered from the search page itself."""
    hits = gp_search(query, lang=lang, country=country, n_hits=limit)
    results = [{"app_id": h.get("appId"), "title": h.get("title") or "", "developer": h.get("developer") or "",
                "installs": h.get("installs") or ""} for h in hits]
    if any(not r["app_id"] for r in results):
        known = {r["app_id"] for r in results if r["app_id"]}
        url = (f"https://play.google.com/store/search?q={urllib.request.quote(query)}&c=apps"
               f"&hl={lang}&gl={country}")
        html = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}),
                                      timeout=15).read().decode("utf-8", "replace")
        for app_id in dict.fromkeys(re.findall(r"details\?id=([\w.]+)", html)):
            if all(r["app_id"] for r in results):
                break
            if app_id in known:
                continue
            try:
                found = lookup(app_id, lang, country)
            except (AppNotFound, FetchError):
                continue
            for r in results:
                if not r["app_id"] and r["title"] == found["title"]:
                    r["app_id"] = app_id
                    break
    return [r for r in results if r["app_id"]]
