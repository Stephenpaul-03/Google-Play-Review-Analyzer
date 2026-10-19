# Review Categorizer

Turn an app's public Google Play reviews into a categorized, filterable dashboard.

It pulls the reviews, cleans them, and has a model sort every complaint into **your own categories** (for example your product's module names). You can then explore the results in a React dashboard or export them to Excel. It runs entirely on your machine: reviews are categorized by a free local model (Ollama), so nothing is sent to an outside AI service.

```
                apps/myapp.toml   (which app, which countries, your categories)
                       │
 Google Play ──► scrape_reviews.py ──► categorize_reviews.py ──► build_dashboard.py ──► dashboard
                 fetch + clean          one model call per review   JSON + single-file HTML   (web/)
```

Each stage sits behind a small plug-in interface, so any of them can be replaced:

| Stage | Folder | Choose with | Included |
|---|---|---|---|
| Where reviews come from | `sources/` | `[scrape] source` | `google_play` |
| What categorizes them | `engines/` | `[classify] engine` | `ollama` (local models) |
| What shows them | `web/` | reads the files in `docs/data-contract.md` | React dashboard |

---

## 1. Setup (once)

You need macOS, Linux or Windows with **Python 3.11+**, **Node 20+** (for the dashboard), and about 5 GB of disk for the default local model.

```bash
git clone <this repo> review-categorizer && cd review-categorizer

# Python environment and dependencies (two packages)
python3 -m venv .venv
source .venv/bin/activate              # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Local model
brew install ollama && brew services start ollama   # or install the app from https://ollama.com
ollama pull qwen2.5:7b-instruct

# Dashboard
cd web && npm install && npm run build && cd ..

# Check everything works
python -m unittest
```

Python older than 3.11? On macOS: `brew install python@3.12`, then create the venv with `python3.12 -m venv .venv`.

## 2. Add an app

```bash
python new_app.py "https://play.google.com/store/apps/details?id=com.example.app"
```

`new_app.py` accepts a Play Store URL, a package ID (`com.example.app`), or an app name to search for. If a search matches several apps, it lists them with their package IDs so you can pick one. Useful flags:

```bash
python new_app.py com.example.app --name myapp --countries gb,ie --lang en
```

This creates **`apps/myapp.toml`**, the app's profile:

```toml
[app]
app_id = "com.example.app"   # the id= part of the Play Store URL
countries = ["gb", "ie"]     # which country stores to read (two-letter codes)
lang = "en"                  # review language; "hi", "ta", "de", ... for other markets
keep_user_names = false      # true = store and show reviewers' public names (see Privacy)

[[categories]]
id = "checkout"                                      # stable key, never rename after a run
label = "Checkout & Payments"                        # what the dashboard shows
description = "Payment fails, card declined, charged twice, refunds"   # what the model reads

# ...one [[categories]] table per category...

[[categories]]
id = "other"                                         # required
label = "Other"
description = "Any complaint that fits none of the above, or no complaint at all"
```

### Set your categories before the first full run

The profile starts with 10 generic categories (bugs, performance, login, payments, design, ads, feature requests, support, pricing, other). Replace or extend them with your own, such as your in-house module names:

- **`description` is what matters most.** It's how the model tells categories apart. Describe what *users complain about* in that area, not what the module does.
- **`id`** is a lowercase_snake_case key stored in every row. Changing it later means recategorizing (see `--fresh` below). **`label`** can change at any time.
- One category must have `id = "other"`.
- To test a new category set cheaply, run it on a sample first: `--limit 50`.

App profiles are listed in `.gitignore` (except `apps/_template.toml`), because they often contain internal names. Remove that line if your team wants to share profiles.

## 3. Run it

```bash
python pipeline.py --app myapp --limit 50    # quick test: ~50 reviews, a couple of minutes
python pipeline.py --app myapp               # full run
```

`pipeline.py` runs the three steps in order and stops at the first one that fails. You can also run the steps on their own:

| Command | What it does | Output (in `data/<app_id>/`) |
|---|---|---|
| `python scrape_reviews.py --app myapp` | Fetches the newest reviews per country, removes duplicates, short reviews and unwanted star ratings, prints a report | `reviews_raw.jsonl`, `reviews_clean.csv`, `app_meta.json` |
| `python categorize_reviews.py --app myapp` | Asks the model for each review's category, extra categories, complaint yes/no, sentiment and a one-line summary | `reviews_categorized.csv`, `category_summary.csv` |
| `python build_dashboard.py --app myapp` | Prepares the dashboard data and the single-file dashboard | `dashboard_data.json`, `dashboard.html`, plus `data/apps.json` |

Set `default_app = "myapp"` in `config.toml` and you can leave out `--app`.

**How long?** Scraping takes about a minute per 5,000 reviews. Categorizing with the default 7B local model takes about 2 seconds per review on an Apple Silicon Mac, so 1,000 reviews is about 35 minutes. By default, 5-star reviews are skipped, so usually only a third or so of the scraped reviews get categorized.

## 4. Stop, resume, restart

| You want to | Do this |
|---|---|
| **Stop** a run | Press **Ctrl+C**. Every finished review is already saved; it prints "Stopped. Run again to continue." (exit code 130). |
| **Resume** | Run the same command again. It skips every review already in `reviews_categorized.csv` and carries on. |
| **Pick up new reviews later** | Run `python pipeline.py --app myapp` again. It re-scrapes, and only reviews it hasn't seen are categorized. |
| **Re-categorize without re-scraping** | `python pipeline.py --app myapp --skip-scrape` |
| **Start over** (after changing categories or models) | `python pipeline.py --app myapp --skip-scrape --fresh`. The old results are kept as `reviews_categorized.<timestamp>.bak.csv`. |
| **Try a small batch** | Add `--limit N` to any step or to the pipeline. |
| **Only recent reviews** | Set `since_date = "2026-01-01"` under `[scrape]` (in `config.toml`, or in the app profile for one app). |
| **Retry failed reviews** | Reviews that failed every attempt are saved as `unclassified`, with the reason in the `error` column. Delete those rows from `reviews_categorized.csv` (with Excel closed) and run again. |

If five reviews in a row fail, the run stops by itself (exit code 4) instead of working through the whole file. That almost always means the model server went away; start it again and resume.

## 5. Change the model

Reviews are categorized by a local model served by [Ollama](https://ollama.com), so review text never leaves your machine. To use a different model, pull it and set it in `config.toml` (or in one app's profile, to change it for that app only):

```bash
ollama pull qwen2.5:14b-instruct          # bigger = more accurate, slower
```
```toml
[engines.ollama]
model = "qwen2.5:14b-instruct"
```

Any 7B to 14B instruct model works, for example `llama3.1:8b`, `mistral-nemo` or `gemma2:9b`. A 14B model is noticeably better on mixed-language reviews (Hinglish, Tanglish) at roughly twice the time. If Ollama runs on another machine on your network, set `url` as well.

The model used is recorded in every row (`model` column). After switching models, run with `--fresh` so all rows come from the same model.

### Another local runtime

Categorization goes through a small plug-in interface in `engines/`. To use a different local runtime, add `engines/<name>.py` with the five functions described in `engines/__init__.py` and set `[classify] engine = "<name>"`. The prompt (`engines/llm_prompt.py`), retries, validation, resume and the dashboard work unchanged.

## 6. The dashboard

There are two ways to open it:

- **Single file, one app**: open `data/<app_id>/dashboard.html` by double-clicking. It works offline and can be emailed.
- **Local web app, all apps**: run `cd web && npm run preview` and open the address it prints (`http://localhost:4173`). An app switcher covers every app you've built. `npm run dev` does the same with hot reload, for working on the dashboard itself.

What's on it:

- **Filters**:
  - date range (presets or custom)
  - categories, optionally matching secondary categories
  - star rating, sentiment, and complaints only or not
  - app version, country, and whether the developer replied
  - minimum thumbs-up
  - search across review text, summary and reviewer name

  Everything on the page follows the filters. The filters are stored in the URL, so a view can be bookmarked or shared.
- **KPI cards**: reviews, complaint rate, average rating, top complaint, and developer reply rate, each with the change against the previous period.
- **Charts**: complaints by category (click a bar to filter by it), complaints over time (day / week / month, top 3/5/8), rating distribution, sentiment, and average rating by app version.
- **Tables**: a category overview, and every review with sorting, column choice, page size, expandable rows and an "Open on Google Play" link.
- **Theme**: starts from your system's light or dark mode. The button switches between them and remembers your choice.
- **Export to Excel**: all reviews, or just the filtered ones. The sheets and columns are defined in `web/src/export-config.ts`. After editing it, run `cd web && npm run build`, then `python build_dashboard.py --app myapp`.

After any new categorization, run `python build_dashboard.py --app myapp` (the pipeline does this for you) and reload the page.

## 7. Configuration reference (`config.toml`)

Every section can be overridden for a single app in its profile.

| Key | Default | Meaning |
|---|---|---|
| `default_app` | `""` | Profile used when `--app` is left out. |
| `scrape.source` | `"google_play"` | Which `sources/<name>.py` fetches reviews. |
| `scrape.max_reviews_per_country` | `5000` | Stop after this many raw reviews per country (newest first). |
| `scrape.page_size` | `200` | Reviews per request. |
| `scrape.sleep_between_pages_sec` | `1.5` | Pause between requests. Keep it, to stay polite. |
| `scrape.since_date` | `""` | `"YYYY-MM-DD"` keeps only reviews from that day on (UTC). |
| `scrape.keep_ratings` | `[1, 2, 3, 4]` | Star ratings to keep. Add `5` to include 5-star reviews. |
| `scrape.min_letters` | `10` | Drop reviews with fewer letters than this. Letters in any script count; emoji, digits and punctuation don't. |
| `scrape.max_chars` | `2000` | Longer reviews are cut to this length (ending in `…`). |
| `classify.engine` | `"ollama"` | Which `engines/<name>.py` categorizes reviews (see section 5). |
| `classify.max_retries` | `2` | Extra attempts after a failed or invalid answer. |
| `classify.request_timeout_sec` | `120` | Time allowed for one answer. |
| `classify.temperature` | `0` | `0` gives the most repeatable answers. |
| `engines.ollama.url` / `.model` | `http://localhost:11434` / `qwen2.5:7b-instruct` | Ollama server and model. |

Every script also accepts `--config <path>` to use a different settings file.

## 8. Output files

Everything is written to `data/<app_id>/` (not tracked by git):

| File | Contents |
|---|---|
| `reviews_raw.jsonl` | Every fetched review as Google returned it, plus `country` and `lang`, with dates in UTC. Profile photos are never stored; names only when `keep_user_names = true`. |
| `app_meta.json` | App title, developer, countries, language, scrape time. |
| `reviews_clean.csv` | The reviews that were kept, newest first: `review_id, country, rating, text, review_date, app_version, thumbs_up, has_dev_reply, dev_reply_date, user_name`. |
| `reviews_categorized.csv` | The clean fields plus `primary_category, secondary_categories, is_complaint, sentiment, summary, model, categorized_at, error`. |
| `category_summary.csv` | One row per category: `review_count, percent, avg_rating, total_thumbs_up, latest_review_date, top_app_version`. |
| `dashboard_data.json` | Everything the dashboard reads (format: `docs/data-contract.md`). |
| `dashboard.html` | The single-file dashboard. |

CSVs are UTF-8 with a BOM, so Excel shows non-Latin scripts and emoji correctly. Each run also writes a detailed log to `logs/`.

## 9. Troubleshooting

| Message (exit code) | Fix |
|---|---|
| `App profile not found: apps/x.toml` (2) | Run `python new_app.py ...` first, or check the `--app` name. |
| `Invalid config: ...` (2) | The message names the key to fix. |
| `App not found: com.x.y` (3) | Check `app_id` against the Play Store URL. |
| `Run scrape_reviews.py first.` / `Run categorize_reviews.py first.` (3) | Run the earlier step, or use `pipeline.py`. |
| `Ollama is not running...` (4) | Open the Ollama app, or run `brew services start ollama` (or `ollama serve`). |
| `Model ... not found. Run: ollama pull ...` (4) | Run the command shown. |
| `Close reviews_categorized.csv in Excel and run again` (1) | Excel locks open files; close it. |
| `Unexpected error, details in logs/...` (1) | The log file has the full error. |
| `Single-file dashboard skipped` | Build the web app once: `cd web && npm install && npm run build`. |
| Local dashboard says "No apps yet" | Run `build_dashboard.py` (or the pipeline) for at least one app. |

## 10. Privacy and fair use

- Reviewer display names are personal data under UK and EU GDPR, even though they're public on Google Play. They're off by default; turn them on per app with `keep_user_names = true` only if you need them. Profile photos are never stored.
- Use the data for internal product analysis. Don't republish review text or names, and delete an app's `data/` folder when it's no longer needed.
- Keep the request pacing at the defaults. Only public Play Store data is used; there's no Play Console access, so device model and Android version aren't available.

## 11. About the scraping library

The scraper relies on `google-play-scraper`, which is no longer actively maintained (last release v1.2.7, June 2024). It works and is pinned to that version. Everything that depends on it lives in `sources/google_play.py`, which also works around two of its quirks:

- it returns local times, which are converted to UTC;
- it silently swallows network errors, which are detected so pages are retried after 5, 15 and 45 seconds.

If Google changes its site and the library breaks, write a replacement `sources/<name>.py` (the contract is in `sources/__init__.py`) and set `[scrape] source`.

## 12. Project layout

```
config.toml             shared settings
apps/                   one profile per app (_template.toml is the starting point)
common.py               config loading, logging, CSV helpers, exit codes
scrape_reviews.py       step 1: fetch and clean
categorize_reviews.py   step 2: categorize (resumable)
build_dashboard.py      step 3: dashboard data and single-file HTML
pipeline.py             run all steps
new_app.py              create an app profile
sources/                review sources (google_play)
engines/                categorization engine (ollama) + shared prompt
web/                    dashboard: React 19, Vite 7, TypeScript, Tailwind 4, shadcn/ui, Recharts, SheetJS
docs/data-contract.md   the JSON format between the pipeline and the dashboard
tests/                  unit tests: python -m unittest
data/, logs/            outputs (git-ignored)
```

Exit codes used by every script: `0` success · `1` unexpected error · `2` invalid config · `3` missing input · `4` engine unavailable · `130` stopped with Ctrl+C.

## License

MIT. See [LICENSE](LICENSE).
