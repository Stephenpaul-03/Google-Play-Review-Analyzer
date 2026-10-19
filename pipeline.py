"""Run the whole pipeline for one app: scrape -> categorize -> build dashboard.

Run: python pipeline.py --app <name> [--limit 50] [--skip-scrape] [--fresh] [--open]
Each step is the normal script, so its messages, logs and exit codes are unchanged; the
pipeline stops at the first step that fails and exits with that step's code.
"""

import argparse
import subprocess
import sys

from common import ROOT


def main() -> None:
    """Run the three steps in order with the shared flags."""
    parser = argparse.ArgumentParser(description="Scrape, categorize and build the dashboard for one app.")
    parser.add_argument("--config", default=str(ROOT / "config.toml"))
    parser.add_argument("--app", help="app profile name in apps/ (default: default_app in config.toml)")
    parser.add_argument("--limit", type=int, help="cap reviews fetched and categorized (for testing)")
    parser.add_argument("--skip-scrape", action="store_true", help="reuse the existing clean CSV")
    parser.add_argument("--fresh", action="store_true", help="recategorize everything (keeps a backup)")
    parser.add_argument("--open", action="store_true", help="open the single-file dashboard at the end")
    args = parser.parse_args()

    shared = ["--config", args.config] + (["--app", args.app] if args.app else [])
    limit = ["--limit", str(args.limit)] if args.limit else []
    steps = []
    if not args.skip_scrape:
        steps.append(["scrape_reviews.py", *shared, *limit])
    steps.append(["categorize_reviews.py", *shared, *limit, *(["--fresh"] if args.fresh else [])])
    steps.append(["build_dashboard.py", *shared, *(["--open"] if args.open else [])])

    for script, *rest in steps:
        print(f"\n=== {script} ===", flush=True)
        code = subprocess.call([sys.executable, str(ROOT / script), *rest])
        if code != 0:
            print(f"\n{script} exited with code {code}; stopping.", file=sys.stderr)
            sys.exit(code)
    print("\nDone. Local dashboard: cd web && npm run preview")


if __name__ == "__main__":
    main()
