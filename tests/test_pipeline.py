"""Unit tests for the parts that need no network: config, cleaning, validation, engines, escaping.

Run: python -m unittest
"""

import json
import logging
import tempfile
import unittest
from pathlib import Path

import build_dashboard
import categorize_reviews
import common
import new_app
import scrape_reviews
import ui
from engines import llm_prompt

common.log.addHandler(logging.NullHandler())
common.log.propagate = False

CATEGORIES = [{"id": "checkout", "label": "Checkout & Payments", "description": "Failed or double payments"},
              {"id": "bugs_crashes", "label": "Bugs crashes", "description": "Crashes"},
              {"id": "other", "label": "Other", "description": "Anything else"}]


def record(review_id: str, rating: int = 1, text: str = "The order arrived very late", date: str = "2026-10-01T10:00:00Z",
           country: str = "gb") -> dict:
    return {"review_id": review_id, "user_name": "Sam", "text": text, "rating": rating, "thumbs_up": 0,
            "app_version": "1.0", "review_date": date, "reply_text": "", "reply_date": "", "country": country}


def config(**scrape) -> dict:
    return {"app": {"keep_user_names": False},
            "scrape": {"keep_ratings": [1, 2, 3, 4], "min_letters": 10, "max_chars": 20, **scrape},
            "categories": CATEGORIES}


class ConfigTests(unittest.TestCase):
    def write(self, folder: Path, name: str, text: str) -> Path:
        path = folder / name
        path.write_text(text, encoding="utf-8")
        return path

    def load(self, shared: str, profile: str) -> dict:
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            return common.load_config(str(self.write(folder, "config.toml", shared)),
                                      str(self.write(folder, "app.toml", profile)))

    PROFILE = ('[app]\napp_id = "com.example.app"\ncountries = ["gb"]\n'
               '[[categories]]\nid = "checkout"\nlabel = "Checkout"\ndescription = "Paying"\n'
               '[[categories]]\nid = "other"\n')

    def test_profile_overrides_shared_settings(self):
        cfg = self.load('[scrape]\nkeep_ratings = [1, 2]\nmin_letters = 10\n[classify]\nengine = "ollama"\n',
                        self.PROFILE + '[scrape]\nmin_letters = 3\n'.replace("[scrape]", "\n[scrape]"))
        self.assertEqual(cfg["scrape"], {"keep_ratings": [1, 2], "min_letters": 3})
        self.assertEqual(cfg["classify"]["engine"], "ollama")
        self.assertEqual([c["id"] for c in cfg["categories"]], ["checkout", "other"])
        self.assertEqual(cfg["categories"][1]["label"], "Other")
        self.assertEqual(cfg["categories"][1]["description"], common.NO_DEFINITION)

    def test_missing_other_category_exits_2(self):
        profile = self.PROFILE.replace('[[categories]]\nid = "other"\n', "")
        with self.assertRaises(SystemExit) as ctx:
            self.load("[scrape]\nkeep_ratings = [1]\n", profile)
        self.assertEqual(ctx.exception.code, common.EXIT_CONFIG)

    def test_bad_category_id_and_ratings_exit_2(self):
        for shared, profile in [("[scrape]\nkeep_ratings = [1]\n", self.PROFILE.replace('"checkout"', '"Check Out"')),
                                ("[scrape]\nkeep_ratings = [0, 6]\n", self.PROFILE),
                                ("[scrape]\nkeep_ratings = [1]\n", self.PROFILE.replace("com.example.app", "bad id!"))]:
            with self.assertRaises(SystemExit) as ctx:
                self.load(shared, profile)
            self.assertEqual(ctx.exception.code, common.EXIT_CONFIG)


class CleaningTests(unittest.TestCase):
    def test_rules_and_counts_add_up(self):
        raw = [record("a"), record("a", country="us"), record("b", rating=5), record("c", date="2025-01-01T00:00:00Z"),
               record("d", text="ok 👍 123"), record("e", text="Line one\r\nline   two is long enough", date="2026-10-05T00:00:00Z")]
        rows, removed = scrape_reviews.clean(raw, config(), since_iso="2026-01-01T00:00:00Z")
        self.assertEqual(len(raw) - sum(removed.values()), len(rows))
        self.assertEqual(removed, {"duplicate review_id": 1, "rating not in keep_ratings": 1,
                                   "older than since_date": 1, "below min_version": 0,
                                   "fewer than min_letters letters": 1})
        self.assertEqual([r["review_id"] for r in rows], ["e", "a"])  # newest first
        self.assertEqual(rows[0]["text"], "Line one line two is…")      # whitespace normalized, truncated to 20 + …
        self.assertEqual(rows[1]["country"], "gb")                      # first country kept
        self.assertEqual(rows[1]["user_name"], "")                      # names off by default

    def test_user_names_kept_only_when_enabled(self):
        cfg = config()
        cfg["app"]["keep_user_names"] = True
        rows, _ = scrape_reviews.clean([record("a")], cfg, "")
        self.assertEqual(rows[0]["user_name"], "Sam")

    def test_letters_count_in_any_script(self):
        self.assertGreaterEqual(scrape_reviews.letter_count("ஆப் திறக்கவே இல்லை"), 8)
        self.assertEqual(scrape_reviews.letter_count("😡😡 123 !!!"), 0)


class ScopeTests(unittest.TestCase):
    def test_version_comparison_is_numeric(self):
        minimum = scrape_reviews.version_key("12.0")
        self.assertTrue(scrape_reviews.version_at_least("12.10.1", minimum))
        self.assertTrue(scrape_reviews.version_at_least("12", minimum))
        self.assertTrue(scrape_reviews.version_at_least("12.8-beta", minimum))
        self.assertFalse(scrape_reviews.version_at_least("11.99", minimum))
        self.assertFalse(scrape_reviews.version_at_least("", minimum))
        self.assertTrue(scrape_reviews.version_at_least("12.10", scrape_reviews.version_key("12.9")))

    def test_min_version_rule_counts(self):
        raw = [dict(record("a"), app_version="12.1"), dict(record("b"), app_version="11.9"),
               dict(record("c"), app_version=""), dict(record("d"), app_version="12.10")]
        rows, removed = scrape_reviews.clean(raw, config(min_version="12.0"), "")
        self.assertEqual(sorted(r["review_id"] for r in rows), ["a", "d"])
        self.assertEqual(removed["below min_version"], 2)
        self.assertEqual(len(raw) - sum(removed.values()), len(rows))
        rows, removed = scrape_reviews.clean(raw, config(), "")  # unset: every version kept
        self.assertEqual((len(rows), removed["below min_version"]), (4, 0))

    def test_dashboard_shows_only_reviews_in_current_scope(self):
        with tempfile.TemporaryDirectory() as tmp:
            saved_dir, common.DATA_DIR = common.DATA_DIR, Path(tmp)
            try:
                cfg = {"app": {"app_id": "com.example.app", "lang": "en", "keep_user_names": False},
                       "classify": {"engine": "ollama"}, "categories": CATEGORIES, "profile_name": "example"}
                out = common.data_dir(cfg)
                cat = {"country": "gb", "rating": "1", "review_date": "2026-02-01T00:00:00Z", "app_version": "12.1",
                       "thumbs_up": "0", "text": "t", "primary_category": "checkout", "secondary_categories": "",
                       "is_complaint": "true", "sentiment": "negative", "summary": "s", "model": "m",
                       "categorized_at": "", "error": ""}
                common.write_csv(out / "reviews_categorized.csv", categorize_reviews.OUT_COLUMNS,
                                 [dict(cat, review_id="in"), dict(cat, review_id="out_of_scope")])
                common.write_csv(out / "reviews_clean.csv", scrape_reviews.CLEAN_COLUMNS, [{"review_id": "in"}])
                (out / "app_meta.json").write_text(json.dumps({"app_id": "com.example.app", "app_title": "Example"}))
                data = build_dashboard.build_data(cfg)
                self.assertEqual([r["review_id"] for r in data["reviews"]], ["in"])
                self.assertEqual(data["summary"][0]["review_count"], 1)
                self.assertEqual(len(common.read_csv(out / "reviews_categorized.csv")), 2)  # earlier results kept
            finally:
                common.DATA_DIR = saved_dir


class AnswerValidationTests(unittest.TestCase):
    IDS = ["checkout", "bugs_crashes", "other"]
    GOOD = {"primary_category": "checkout", "secondary_categories": ["checkout", "bugs_crashes", "bugs_crashes"],
            "is_complaint": True, "sentiment": "negative", "summary": " Late\norder. "}

    def test_tidies_secondaries_and_summary(self):
        out = categorize_reviews.validate_answer(dict(self.GOOD), self.IDS)
        self.assertEqual(out["secondary_categories"], "bugs_crashes")
        self.assertEqual(out["summary"], "Late order.")
        self.assertEqual(out["is_complaint"], "true")

    def test_rejects_unknown_category_wrong_types_and_empty_summary(self):
        for change in [{"primary_category": "weather"}, {"secondary_categories": ["weather"]},
                       {"is_complaint": "yes"}, {"sentiment": "angry"}, {"summary": "   "}]:
            with self.assertRaises(ValueError):
                categorize_reviews.validate_answer({**self.GOOD, **change}, self.IDS)

    def test_summary_percentages_add_to_100(self):
        rows = [{"primary_category": c, "rating": "1", "thumbs_up": "2", "review_date": "2026-10-01T00:00:00Z",
                 "app_version": "1.0"} for c in ["other", "other", "bugs_crashes"]]
        summary = categorize_reviews.build_summary(rows)
        self.assertEqual(summary[0]["category"], "other")
        self.assertAlmostEqual(sum(float(s["percent"]) for s in summary), 100.0, delta=0.1)


class EngineTests(unittest.TestCase):
    def test_prompt_shows_labels_only_when_they_add_something(self):
        prompt = llm_prompt.system_prompt(CATEGORIES)
        self.assertIn("- checkout (Checkout & Payments): Failed or double payments", prompt)
        self.assertIn("- bugs_crashes: Crashes", prompt)
        self.assertEqual(llm_prompt.answer_schema(CATEGORIES)["properties"]["primary_category"]["enum"],
                         ["checkout", "bugs_crashes", "other"])

    def test_parse_json_answer_strips_fences_and_chatter(self):
        self.assertEqual(llm_prompt.parse_json_answer('Sure! ```json\n{"a": 1}\n``` done'), {"a": 1})
        with self.assertRaises(ValueError):
            llm_prompt.parse_json_answer("no json here")


class DashboardAndToolsTests(unittest.TestCase):
    def test_embedded_json_cannot_close_the_script_tag(self):
        text = build_dashboard.embed_json({"t": "</script><script>alert(1)</script><!-- x"})
        self.assertNotIn("</script", text)
        self.assertNotIn("<!--", text)
        self.assertEqual(json.loads(text)["t"], "</script><script>alert(1)</script><!-- x")

    def test_new_app_parses_urls_ids_and_titles(self):
        self.assertEqual(new_app.package_from("https://play.google.com/store/apps/details?id=com.example.app&hl=en"),
                         "com.example.app")
        self.assertEqual(new_app.package_from("com.whatsapp"), "com.whatsapp")
        self.assertIsNone(new_app.package_from("Example App"))
        self.assertEqual(new_app.slug("Example App - Food Delivery"), "example_app")
        self.assertEqual(new_app.slug("Uber Eats: Food Delivery"), "uber_eats")


class TerminalOutputTests(unittest.TestCase):
    def test_durations_and_numbers(self):
        self.assertEqual([ui.duration(s) for s in (5, 65, 3700)], ["5s", "1m 05s", "1h 01m"])
        self.assertEqual(ui.number(12345), "12,345")

    def test_progress_line_shows_percent_counts_and_time_left(self):
        bar = ui.Progress("Progress", 200)
        bar.started -= 100  # pretend 100 seconds have passed
        bar.done, bar.notes = 50, "2 retried"
        line = ui._strip(bar.line())
        bar.finish()
        for part in ("25%", "50 / 200 reviews", "2.0s/review", "~5m 00s left", "2 retried"):
            self.assertIn(part, line)


if __name__ == "__main__":
    unittest.main()
