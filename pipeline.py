"""Run the whole pipeline for one app: scrape -> categorize -> build dashboard.

Run: python pipeline.py --app <name> [--limit 50] [--skip-scrape] [--fresh] [--open]
Each step is the normal script, so its output, logs and exit codes are unchanged; the
pipeline numbers the steps, stops at the first one that fails, and ends with a summary.
"""

import argparse
import os
import subprocess
import sys
import time

import ui
from common import EXIT_STOPPED, ROOT

STEP_TITLES = {"scrape_reviews.py": "Scrape", "categorize_reviews.py": "Categorize", "build_dashboard.py": "Dashboard"}
EXIT_MEANINGS = {1: "unexpected error", 2: "invalid config", 3: "missing input", 4: "engine unavailable",
                 130: "stopped"}


def run_step(command: list[str], env: dict) -> int:
    """Run one step; on Ctrl+C let the step save and exit on its own instead of killing it."""
    process = subprocess.Popen(command, env=env)
    try:
        return process.wait()
    except KeyboardInterrupt:
        try:
            return process.wait(timeout=30)  # the step received the same Ctrl+C and is closing its files
        except subprocess.TimeoutExpired:
            process.terminate()
            return EXIT_STOPPED


def main() -> None:
    """Run the three steps in order with the shared flags, then print a summary."""
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

    print(ui.bold(f"Review pipeline · {args.app or 'default app'}") + ui.dim(f"  ({len(steps)} steps)"))
    results, started = [], time.monotonic()
    for number, (script, *rest) in enumerate(steps, 1):
        env = {**os.environ, "PIPELINE_STAGE": f"{number}/{len(steps)}"}
        step_started = time.monotonic()
        code = run_step([sys.executable, str(ROOT / script), *rest], env)
        results.append((STEP_TITLES[script], code, time.monotonic() - step_started))
        if code != 0:
            break

    print()
    print(ui.bold("Summary"))
    for title, code, seconds in results:
        text = "✓ done" if code == 0 else f"✗ {EXIT_MEANINGS.get(code, 'failed')} (exit {code})"
        status = (ui.green if code == 0 else ui.red)(text.ljust(28))
        print(f"  {title:<11}{status}{ui.dim(ui.duration(seconds))}")
    for title in [STEP_TITLES[s[0]] for s in steps[len(results):]]:
        print(f"  {title:<11}{ui.dim('– not run')}")
    final = results[-1][1]
    print(f"  {ui.dim('Total'.ljust(11))}{ui.dim(ui.duration(time.monotonic() - started))}")
    if final == EXIT_STOPPED:
        print(ui.yellow("\n  Stopped. Run the same command to continue where it left off."))
    sys.exit(final)


if __name__ == "__main__":
    main()
