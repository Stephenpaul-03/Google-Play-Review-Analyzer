"""Create an app profile (apps/<name>.toml) for any Play Store app.

Run: python new_app.py <play store URL | package id | app name> [--name myapp] [--countries gb,ie] [--lang en]
The new profile starts with the generic categories from apps/_template.toml; edit them before
the first full categorization run.
"""

import argparse
import re
import sys
from urllib.parse import parse_qs, urlparse

from common import APP_ID_RE, APPS_DIR, EXIT_CONFIG, EXIT_MISSING_INPUT, EXIT_UNEXPECTED
from sources import AppNotFound, FetchError, load_source


def package_from(text: str) -> str | None:
    """The package ID in a Play Store URL, or the text itself if it already looks like one."""
    if "play.google.com" in text:
        return (parse_qs(urlparse(text).query).get("id") or [None])[0]
    if "." in text and APP_ID_RE.match(text):
        return text
    return None


def slug(title: str) -> str:
    """'My App - Food Delivery' -> 'my_app'."""
    first = re.split(r"\s[-–:|]\s|:", title)[0]
    return re.sub(r"[^a-z0-9]+", "_", first.lower()).strip("_") or "app"


def resolve(source, query: str, lang: str, country: str) -> tuple[str, dict]:
    """Find the package ID and details for a URL, package ID or search term."""
    app_id = package_from(query)
    if app_id:
        return app_id, source.lookup(app_id, lang, country)
    if not hasattr(source, "search"):
        sys.exit(f"This source can't search; pass the package ID or Play Store URL instead.")
    hits = source.search(query, lang, country)
    if not hits:
        print(f"No apps found for {query!r}.", file=sys.stderr)
        sys.exit(EXIT_MISSING_INPUT)
    exact = [h for h in hits if query.lower() in h["title"].lower()]
    if len(exact) != 1:
        print(f"Several apps match {query!r}; rerun with the package ID of the one you want:")
        for h in hits:
            print(f"  {h['app_id']:<40} {h['title']}  ({h['developer']}, {h['installs']} installs)")
        sys.exit(EXIT_MISSING_INPUT)
    return exact[0]["app_id"], source.lookup(exact[0]["app_id"], lang, country)


def main() -> None:
    """Resolve the app and write its profile from the template."""
    parser = argparse.ArgumentParser(description="Create an app profile for any Play Store app.")
    parser.add_argument("app", help="Play Store URL, package ID, or app name to search for")
    parser.add_argument("--name", help="profile name (default: from the app title)")
    parser.add_argument("--countries", default="gb", help="comma-separated country codes (default: gb)")
    parser.add_argument("--lang", default="en", help="review language (default: en)")
    parser.add_argument("--source", default="google_play", help="review source module (default: google_play)")
    parser.add_argument("--force", action="store_true", help="overwrite an existing profile")
    args = parser.parse_args()
    countries = [c.strip().lower() for c in args.countries.split(",") if c.strip()]
    source = load_source(args.source)
    try:
        app_id, details = resolve(source, args.app, args.lang, countries[0])
    except AppNotFound:
        print(f"App not found: {args.app}", file=sys.stderr)
        sys.exit(EXIT_MISSING_INPUT)
    except FetchError as e:
        print(f"Could not reach the store ({e}). Check your internet connection.", file=sys.stderr)
        sys.exit(EXIT_UNEXPECTED)

    name = args.name or slug(details["title"])
    if not re.match(r"^[a-z0-9_]+$", name):
        print("--name may only contain lowercase letters, digits and _", file=sys.stderr)
        sys.exit(EXIT_CONFIG)
    path = APPS_DIR / f"{name}.toml"
    if path.exists() and not args.force:
        print(f"apps/{name}.toml already exists (use --force to overwrite, or --name to pick another name).",
              file=sys.stderr)
        sys.exit(EXIT_CONFIG)
    template = (APPS_DIR / "_template.toml").read_text(encoding="utf-8")
    profile = (template
               .replace("# App profile. Copy to apps/<name>.toml (or run: python new_app.py <play store url>).",
                        f"# App profile: {details['title']} ({details.get('developer', '')})", 1)
               .replace('app_id = "com.example.app"', f'app_id = "{app_id}"', 1)
               .replace('countries = ["gb"]', "countries = [" + ", ".join(f'"{c}"' for c in countries) + "]", 1)
               .replace('lang = "en"', f'lang = "{args.lang}"', 1))
    path.write_text(profile, encoding="utf-8")
    print(f"Found {details['title']} ({app_id}, {details['installs']} installs)")
    print(f"Wrote apps/{name}.toml. Next:")
    print(f"  1. Edit the [[categories]] in apps/{name}.toml (your module names, descriptions).")
    print(f"  2. python pipeline.py --app {name} --limit 50     # quick test")
    print(f"  3. python pipeline.py --app {name}                # full run")


if __name__ == "__main__":
    main()
