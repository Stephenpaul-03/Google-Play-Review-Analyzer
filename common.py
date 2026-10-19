"""Shared helpers for the pipeline scripts: paths, config, logging, CSV and exits.

Settings come from two files merged together: the shared config.toml and one app profile
in apps/<name>.toml (package ID, countries, categories, and any per-app overrides).
Nothing in here knows about scraping, LLMs or the dashboard.
"""

import argparse
import csv
import logging
import re
import sys
import tomllib
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

import ui

ROOT = Path(__file__).resolve().parent
APPS_DIR = ROOT / "apps"
DATA_DIR = ROOT / "data"
LOGS_DIR = ROOT / "logs"

EXIT_OK, EXIT_UNEXPECTED, EXIT_CONFIG, EXIT_MISSING_INPUT, EXIT_ENGINE, EXIT_STOPPED = 0, 1, 2, 3, 4, 130

APP_ID_RE = re.compile(r"^[a-zA-Z0-9_.]+$")
CATEGORY_ID_RE = re.compile(r"^[a-z][a-z0-9_]*$")
UNCLASSIFIED = "unclassified"
NO_DEFINITION = "(no definition given)"

log = logging.getLogger("pipeline")
_log_path: Path | None = None


def setup_logging(script_name: str) -> Path:
    """Write DEBUG detail to logs/<script>_<timestamp>.log; the terminal shows the ui module's output."""
    global _log_path
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    _log_path = LOGS_DIR / f"{script_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
    to_file = logging.FileHandler(_log_path, encoding="utf-8")
    to_file.setLevel(logging.DEBUG)
    to_file.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    log.setLevel(logging.DEBUG)
    log.handlers[:] = [to_file]
    log.propagate = False
    return _log_path


def log_path() -> Path | None:
    """This run's log file (None before setup_logging)."""
    return _log_path


def short(path: Path) -> str:
    """A path relative to the project folder, for display."""
    try:
        return str(Path(path).resolve().relative_to(ROOT))
    except ValueError:
        return str(path)


def fail(code: int, message: str, fix: str | None = None) -> None:
    """Show a plain-English error (and how to fix it), record it in the log, and exit with code."""
    ui.error(message, fix, short(_log_path) if _log_path and code in (EXIT_UNEXPECTED, EXIT_ENGINE) else None)
    sys.exit(code)


def parse_args(description: str, with_limit: bool = True, extra: Callable | None = None) -> argparse.Namespace:
    """Parse the shared flags (--config, --app, optionally --limit) plus any script-specific ones."""
    parser = argparse.ArgumentParser(description=description)
    parser.add_argument("--config", default=str(ROOT / "config.toml"), help="shared settings file")
    parser.add_argument("--app", help="app profile: a name in apps/ (e.g. myapp) or a path to a .toml file")
    if with_limit:
        parser.add_argument("--limit", type=int, default=None, help="process at most n reviews (for testing)")
    if extra:
        extra(parser)
    args = parser.parse_args()
    if with_limit and args.limit is not None and args.limit < 1:
        parser.error("--limit must be 1 or more")
    return args


def _read_toml(path: Path, what: str) -> dict:
    """Read one TOML file, exiting with code 2 if it is missing or malformed."""
    if not path.is_file():
        fail(EXIT_CONFIG, f"{what} not found: {path}")
    try:
        with open(path, "rb") as f:
            return tomllib.load(f)
    except tomllib.TOMLDecodeError as e:
        fail(EXIT_CONFIG, f"{path.name} is not valid TOML: {e}")


def merge(base: dict, override: dict) -> dict:
    """Recursively merge override into a copy of base (tables merge, other values replace)."""
    out = dict(base)
    for key, value in override.items():
        out[key] = merge(out[key], value) if isinstance(value, dict) and isinstance(out.get(key), dict) else value
    return out


def available_apps() -> list[str]:
    """Names of the app profiles in apps/ (files starting with _ are templates)."""
    return sorted(p.stem for p in APPS_DIR.glob("*.toml") if not p.stem.startswith("_"))


def app_profile_path(app: str | None, shared: dict) -> Path:
    """Resolve --app (or default_app) to a profile file."""
    name = app or shared.get("default_app")
    apps = ", ".join(available_apps()) or "none yet"
    create = "create one with: python new_app.py <play store url>"
    if not name:
        fail(EXIT_CONFIG, "No app chosen", f"pass --app <name> (available: {apps}), or {create}")
    path = Path(name)
    if path.suffix == ".toml" or path.is_file():
        return path
    path = APPS_DIR / f"{name}.toml"
    if not path.is_file():
        fail(EXIT_CONFIG, f"App profile not found: apps/{name}.toml", f"available: {apps}; or {create}")
    return path


def _validate_categories(raw) -> list[dict]:
    """Check the [[categories]] list and fill in default labels and descriptions."""
    if not isinstance(raw, list) or not raw or not all(isinstance(c, dict) for c in raw):
        fail(EXIT_CONFIG, "Invalid config: the app profile needs a list of [[categories]] tables")
    categories, seen = [], set()
    for c in raw:
        cid = c.get("id")
        if not isinstance(cid, str) or not CATEGORY_ID_RE.match(cid) or cid == UNCLASSIFIED:
            fail(EXIT_CONFIG, f"Invalid config: category id {cid!r} must be lowercase snake_case (and not 'unclassified')")
        if cid in seen:
            fail(EXIT_CONFIG, f"Invalid config: category id {cid!r} appears twice")
        seen.add(cid)
        description = str(c.get("description") or "").strip()
        if not description:
            ui.warn(f"Category {cid} has no description; the model will only see {NO_DEFINITION!r}")
        categories.append({"id": cid, "label": str(c.get("label") or cid.replace("_", " ").capitalize()),
                           "description": description or NO_DEFINITION})
    if "other" not in seen:
        fail(EXIT_CONFIG, 'Invalid config: the categories must include one with id = "other"')
    return categories


def load_config(config_path: str, app: str | None) -> dict:
    """Load config.toml merged with the app profile, validate it, and return one settings dict; exit 2 on problems."""
    shared = _read_toml(Path(config_path), "Config file")
    profile_path = app_profile_path(app, shared)
    profile = _read_toml(profile_path, "App profile")
    cfg = merge({k: v for k, v in shared.items() if k != "default_app"}, profile)
    cfg["profile_name"] = profile_path.stem

    app_cfg = cfg.get("app", {})
    app_id = app_cfg.get("app_id")
    if not isinstance(app_id, str) or not APP_ID_RE.match(app_id):
        fail(EXIT_CONFIG, "Invalid config: app.app_id must be a package ID like com.example.app")
    countries = app_cfg.get("countries")
    if not isinstance(countries, list) or not countries or not all(isinstance(c, str) and c for c in countries):
        fail(EXIT_CONFIG, 'Invalid config: app.countries must be a non-empty list like ["gb"]')
    app_cfg.setdefault("lang", "en")
    app_cfg["keep_user_names"] = bool(app_cfg.get("keep_user_names", False))
    ratings = cfg.get("scrape", {}).get("keep_ratings")
    if not isinstance(ratings, list) or not all(type(r) is int and 1 <= r <= 5 for r in ratings):
        fail(EXIT_CONFIG, "Invalid config: scrape.keep_ratings must contain only whole numbers 1 to 5")
    cfg["categories"] = _validate_categories(cfg.get("categories"))
    return cfg


def setting(cfg: dict, dotted: str):
    """Look up a dotted key like 'engines.ollama.model'; None if any part is missing."""
    node = cfg
    for part in dotted.split("."):
        if not isinstance(node, dict) or part not in node:
            return None
        node = node[part]
    return node


def data_dir(cfg: dict) -> Path:
    """Return data/<app_id>/, creating it if missing."""
    path = DATA_DIR / cfg["app"]["app_id"]
    path.mkdir(parents=True, exist_ok=True)
    return path


def utc_now_iso() -> str:
    """Current UTC time as YYYY-MM-DDTHH:MM:SSZ."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def read_csv(path: Path) -> list[dict]:
    """Read a UTF-8 (BOM-tolerant) CSV into a list of dicts."""
    with open(path, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def write_csv(path: Path, columns: list[str], rows: list[dict]) -> None:
    """Write rows to a CSV with a header, utf-8-sig so Excel shows non-Latin text."""
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=columns, quoting=csv.QUOTE_MINIMAL, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def run(main: Callable[[], None]) -> None:
    """Run main(), turning Ctrl+C into exit 130 and unexpected errors into a log-file traceback + exit 1."""
    try:
        main()
    except SystemExit:
        raise
    except KeyboardInterrupt:
        ui.warn("Stopped. Everything finished so far is saved; run the same command to continue.")
        sys.exit(EXIT_STOPPED)
    except Exception as e:
        if _log_path is None:
            raise
        log.error("Unexpected error\n%s", traceback.format_exc())
        ui.error(f"Unexpected error: {type(e).__name__}: {e}", "see the log for the full details",
                 short(_log_path))
        sys.exit(EXIT_UNEXPECTED)
