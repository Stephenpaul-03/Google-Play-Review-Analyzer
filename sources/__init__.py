"""Pluggable review sources.

scrape_reviews.py never imports a scraping library directly. It loads the module named by
[scrape] source in config.toml (sources/<name>.py) and uses only this contract:

    lookup(app_id: str, lang: str, country: str) -> dict
        {"title": str, "installs": str, "developer": str, "reviews": int (written reviews, 0 if unknown)}.
        Raise AppNotFound if the app does not exist.
    fetch_page(app_id: str, lang: str, country: str, page_size: int, token) -> (list[dict], token | None)
        One page of the newest reviews (raw, as the source returns them). Pass the returned
        token back to get the next page; None means there are no more pages.
        Raise FetchError on network or HTTP problems (the caller retries with backoff).
    to_record(raw: dict) -> dict
        Map one raw review to the standard fields: review_id, user_name, text, rating,
        thumbs_up, app_version, review_date (UTC "YYYY-MM-DDTHH:MM:SSZ"), reply_text, reply_date.
    to_storable(raw: dict, keep_user_names: bool) -> dict
        The raw review as it should be saved to reviews_raw.jsonl: JSON-safe, personal fields removed.
    search(query: str, lang: str, country: str, limit: int) -> list[dict]   (optional)
        [{"app_id", "title", "developer", "installs"}], used by new_app.py.

To replace google-play-scraper (for example if it stops working), add sources/<name>.py
implementing the above and set [scrape] source = "<name>".
"""

import importlib
from types import ModuleType

REQUIRED = ("lookup", "fetch_page", "to_record", "to_storable")


class AppNotFound(Exception):
    """The package ID does not exist on the store."""


class FetchError(Exception):
    """A page could not be fetched (network, HTTP error, rate limit)."""


def load_source(name: str) -> ModuleType:
    """Import sources/<name>.py and check it implements the contract."""
    module = importlib.import_module(f"sources.{name}")
    missing = [attr for attr in REQUIRED if not hasattr(module, attr)]
    if missing:
        raise ImportError(f"sources/{name}.py is missing: {', '.join(missing)}")
    return module
