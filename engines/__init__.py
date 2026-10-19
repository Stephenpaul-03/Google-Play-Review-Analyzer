"""Pluggable classification engines.

categorize_reviews.py never talks to a model directly. It loads the module named by
[classify] engine in config.toml (engines/<name>.py) and uses only this contract:

    check(cfg: dict) -> None
        Raise EngineUnavailable("<what to do>") if the engine cannot run at all.
    label(cfg: dict) -> str
        Name written to the `model` column (e.g. the model tag).
    classify(cfg: dict, review: dict, categories: list[dict]) -> dict
        One attempt at one review. `review` has the clean CSV columns; each category is
        {"id", "label", "description"}. Return a dict with primary_category,
        secondary_categories, is_complaint, sentiment, summary (category values are ids).
        Raise AttemptFailed on any failure; the caller validates, retries and records errors.
    UNAVAILABLE_HINT: str
        Message shown when several reviews in a row fail.
    CONFIG_KEYS: list[str]  (optional)
        Dotted config keys the engine needs, e.g. ["engines.ollama.model"]; missing ones exit with code 2.

Included: ollama (local models served by Ollama). To use another local runtime, create
engines/<name>.py implementing the above and set [classify] engine = "<name>".
"""

import importlib
from types import ModuleType

REQUIRED = ("check", "label", "classify", "UNAVAILABLE_HINT")


class EngineUnavailable(Exception):
    """The engine cannot run at all (not installed, not running, model missing)."""


class AttemptFailed(Exception):
    """One classification attempt failed; the caller may retry."""


def load_engine(name: str) -> ModuleType:
    """Import engines/<name>.py and check it implements the contract."""
    module = importlib.import_module(f"engines.{name}")
    missing = [attr for attr in REQUIRED if not hasattr(module, attr)]
    if missing:
        raise ImportError(f"engines/{name}.py is missing: {', '.join(missing)}")
    return module
