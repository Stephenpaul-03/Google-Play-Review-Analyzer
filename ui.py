"""Terminal output for the pipeline: stage headers, progress bars, results and errors.

Everything shown here is also written to the run's log file (via the "pipeline" logger), so the
terminal can stay clean while logs/ keeps the full detail. Colours and the live progress bar are
used only when output goes to a terminal; set NO_COLOR=1 to turn colours off.
"""

import logging
import os
import shutil
import sys
import time

log = logging.getLogger("pipeline")
TTY = sys.stdout.isatty()
COLOR = TTY and not os.environ.get("NO_COLOR")
_active = None  # the progress bar currently drawn on the last line, if any


def _paint(code: str, text: str) -> str:
    return f"\x1b[{code}m{text}\x1b[0m" if COLOR else text


def bold(text: str) -> str:
    return _paint("1", text)


def dim(text: str) -> str:
    return _paint("2", text)


def green(text: str) -> str:
    return _paint("32", text)


def yellow(text: str) -> str:
    return _paint("33", text)


def red(text: str) -> str:
    return _paint("31", text)


def cyan(text: str) -> str:
    return _paint("36", text)


def number(n: int | float) -> str:
    """1234 -> '1,234'."""
    return f"{n:,.0f}"


def duration(seconds: float) -> str:
    """65 -> '1m 05s', 3700 -> '1h 01m'."""
    seconds = int(round(seconds))
    if seconds < 60:
        return f"{seconds}s"
    if seconds < 3600:
        return f"{seconds // 60}m {seconds % 60:02d}s"
    return f"{seconds // 3600}h {seconds % 3600 // 60:02d}m"


def _print(line: str = "", stream=None) -> None:
    """Print a line without tearing an active progress bar."""
    if _active is not None and TTY:
        _active.clear()
    print(line, file=stream or sys.stdout, flush=True)
    if _active is not None and TTY:
        _active.render(force=True)


def stage(title: str) -> None:
    """Stage header; numbered like [2/3] when run by pipeline.py (PIPELINE_STAGE=2/3)."""
    step = os.environ.get("PIPELINE_STAGE")
    prefix = f"[{step}] " if step else ""
    _print()
    _print(bold(cyan(f"{prefix}{title}")))
    log.info("== %s%s", prefix, title)


def info(message: str) -> None:
    _print(f"  {message}")
    log.info(message)


def field(name: str, value: str, width: int = 11) -> None:
    """An aligned 'Name  value' line."""
    _print(f"  {dim(name.ljust(width))}{value}")
    log.info("%s: %s", name, value)


def ok(message: str) -> None:
    _print(f"  {green('✓')} {message}")
    log.info(message)


def warn(message: str) -> None:
    _print(f"  {yellow('!')} {message}")
    log.warning(message)


def error(message: str, fix: str | None = None, log_path=None) -> None:
    """'✗ what happened', then optional 'Fix:' and 'Log:' lines, on stderr."""
    _print(f"  {red('✗')} {bold(message)}", sys.stderr)
    if fix:
        _print(f"    {dim('Fix:')} {fix}", sys.stderr)
    if log_path:
        _print(f"    {dim('Log:')} {log_path}", sys.stderr)
    log.error("%s%s", message, f" | fix: {fix}" if fix else "")


class Progress:
    """A one-line progress bar: label, bar, percent, counts, speed, time left and extra notes.

    On a terminal it redraws in place (at most 10 times a second). Otherwise it prints a
    plain line at every 10% so redirected output and logs stay readable.
    """

    BAR_WIDTH = 24

    def __init__(self, label: str, total: int | None, unit: str = "reviews", rate_unit: str = "review"):
        global _active
        self.label, self.total, self.unit, self.rate_unit = label, total, unit, rate_unit
        self.done, self.notes = 0, ""
        self.started = time.monotonic()
        self._drawn_at, self._last_decile = 0.0, -1
        _active = self
        self.render(force=True)

    def update(self, done: int, notes: str = "") -> None:
        self.done, self.notes = done, notes
        self.render()

    def line(self) -> str:
        """The text of the bar right now."""
        parts = [f"  {self.label}"]
        elapsed = time.monotonic() - self.started
        if self.total:
            share = min(self.done / self.total, 1.0)
            filled = int(share * self.BAR_WIDTH)
            parts.append(green("█" * filled) + dim("░" * (self.BAR_WIDTH - filled)))
            parts.append(bold(f"{share * 100:3.0f}%"))
            parts.append(f"{number(self.done)} / {number(self.total)} {self.unit}")
        else:
            parts.append(f"{number(self.done)} {self.unit}")
        if self.done and self.rate_unit:
            per = elapsed / self.done
            parts.append(dim(f"{per:.1f}s/{self.rate_unit}" if per >= 0.1 else f"{self.done / elapsed:.0f}/s"))
            if self.total and self.done < self.total:
                parts.append(dim(f"~{duration(per * (self.total - self.done))} left"))
        if self.notes:
            parts.append(yellow(self.notes))
        return "  ".join(parts)

    def render(self, force: bool = False) -> None:
        if TTY:
            now = time.monotonic()
            if not force and now - self._drawn_at < 0.1:
                return
            self._drawn_at = now
            width = shutil.get_terminal_size((100, 20)).columns
            text = self.line()
            visible = len(_strip(text))
            if visible > width - 1:  # never wrap: drop trailing parts until it fits
                text = _strip(text)[:width - 2] + "…"
            sys.stdout.write("\r" + text + "\x1b[K")
            sys.stdout.flush()
        else:
            decile = int(self.done / self.total * 10) if self.total else self.done // 500
            if force or decile != self._last_decile:
                self._last_decile = decile
                print(_strip(self.line()), flush=True)

    def clear(self) -> None:
        if TTY:
            sys.stdout.write("\r\x1b[K")
            sys.stdout.flush()

    def finish(self) -> float:
        """Remove the bar and return the elapsed seconds."""
        global _active
        self.clear()
        _active = None
        log.info("%s: %s %s in %s", self.label.strip(), number(self.done), self.unit,
                 duration(time.monotonic() - self.started))
        return time.monotonic() - self.started


def _strip(text: str) -> str:
    """Remove ANSI colour codes."""
    out, skip = [], False
    for ch in text:
        if ch == "\x1b":
            skip = True
        elif skip and ch == "m":
            skip = False
        elif not skip:
            out.append(ch)
    return "".join(out)
