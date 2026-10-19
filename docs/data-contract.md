# Dashboard data contract (schema_version 1)

The Python pipeline and the web dashboard only meet here. `build_dashboard.py` writes these files and `web/` only reads them, so either side can change internally without touching the other.

## `data/apps.json`

Index of every app that has dashboard data. Rebuilt on every `build_dashboard.py` run by scanning `data/*/dashboard_data.json`.

```json
{
  "apps": [
    {"app_id": "com.example.app", "app_title": "Example App", "review_count": 1500,
     "scraped_at": "2026-10-19T15:09:12Z", "built_at": "2026-10-19T15:30:00Z"}
  ]
}
```

## `data/<app_id>/dashboard_data.json`

```json
{
  "schema_version": 1,
  "meta": {
    "app_id": "com.example.app",
    "app_title": "Example App",
    "countries": ["gb"],
    "lang": "en",
    "scraped_at": "2026-10-19T15:09:12Z",
    "built_at": "2026-10-19T15:30:00Z",
    "play_url": "https://play.google.com/store/apps/details?id=com.example.app",
    "keep_user_names": true,
    "engine": "ollama:qwen2.5:7b-instruct"
  },
  "categories": [
    {"id": "checkout", "label": "Checkout & Payments", "description": "Payment fails, card declined, ..."},
    {"id": "other", "label": "Other", "description": "..."}
  ],
  "reviews": [
    {
      "review_id": "string",
      "country": "gb",
      "rating": 1,
      "review_date": "2026-10-16T15:32:59Z",
      "app_version": "4.2.0",
      "thumbs_up": 0,
      "text": "full review text",
      "primary_category": "checkout",
      "secondary_categories": ["customer_support"],
      "is_complaint": true,
      "sentiment": "negative",
      "summary": "Payment failed twice at checkout.",
      "model": "qwen2.5:7b-instruct",
      "categorized_at": "2026-10-19T15:20:01Z",
      "error": "",
      "user_name": "Sam Patel",
      "has_dev_reply": false,
      "dev_reply_date": ""
    }
  ],
  "summary": [
    {"category": "checkout", "review_count": 21, "percent": 21.0, "avg_rating": 1.43,
     "total_thumbs_up": 4, "latest_review_date": "2026-10-12T09:00:00Z", "top_app_version": "4.1.3"}
  ]
}
```

Rules:

- `categories` is in config order. It always contains `other`. Colours are assigned by this order.
- `primary_category` is a category `id`, or `"unclassified"` when every attempt failed (then `is_complaint` is `null`, `sentiment`, `summary` are `""`, and `error` explains why). It can also be an id that is no longer in `categories`, if the config changed after a run. Show the raw id then.
- `is_complaint` is `true`, `false` or `null`.
- All dates are UTC ISO 8601 with a `Z` suffix, or `""`.
- `user_name` is `""` unless `meta.keep_user_names` is true. Hide the column when it's false.
- `summary` rows are one per primary category, sorted by `review_count` descending (the same data as `category_summary.csv`).

## Single-file dashboard

`web/dist/index.html` is built as one self-contained file. It contains this exact placeholder:

```html
<script id="dashboard-data" type="application/json">null</script>
```

`build_dashboard.py` copies it to `data/<app_id>/dashboard.html` and replaces `null` with that app's `dashboard_data.json`. Every `</` is escaped as `<\/` and every `<!--` as `<!--`. When the placeholder holds data, the page uses it and hides the app switcher. When it holds `null`, the page fetches `data/apps.json` and the selected app's `dashboard_data.json` (local web app mode).
