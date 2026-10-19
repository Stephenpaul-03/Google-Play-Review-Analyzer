// Excel export layout. Edit this one constant to change sheets or columns.
//
// source "reviews": one row per review. Keys are review fields from
//   docs/data-contract.md, plus the computed "category_label".
// source "summary": one row per primary category (the Python summary for
//   "All reviews", recomputed from the filtered rows for "Filtered reviews").
//
// type "date" writes a real Excel date (ISO strings are converted).
// Arrays are joined with ";". `requires: "keep_user_names"` drops the column
// unless meta.keep_user_names is true.

export interface ExportColumn {
  key: string
  header: string
  /** Column width in characters. */
  width: number
  type?: "date"
  requires?: "keep_user_names"
}

export interface ExportSheet {
  name: string
  source: "reviews" | "summary"
  freezeHeader: boolean
  columns: ExportColumn[]
}

export const EXPORT_CONFIG: ExportSheet[] = [
  {
    name: "Reviews",
    source: "reviews",
    freezeHeader: true,
    columns: [
      { key: "review_id", header: "review_id", width: 38 },
      { key: "country", header: "country", width: 8 },
      { key: "rating", header: "rating", width: 7 },
      { key: "review_date", header: "review_date", width: 20, type: "date" },
      { key: "app_version", header: "app_version", width: 12 },
      { key: "thumbs_up", header: "thumbs_up", width: 10 },
      { key: "user_name", header: "user_name", width: 20, requires: "keep_user_names" },
      { key: "text", header: "text", width: 80 },
      { key: "primary_category", header: "primary_category", width: 22 },
      { key: "category_label", header: "category_label", width: 24 },
      { key: "secondary_categories", header: "secondary_categories", width: 28 },
      { key: "is_complaint", header: "is_complaint", width: 12 },
      { key: "sentiment", header: "sentiment", width: 11 },
      { key: "summary", header: "summary", width: 50 },
      { key: "model", header: "model", width: 22 },
      { key: "categorized_at", header: "categorized_at", width: 20, type: "date" },
      { key: "error", header: "error", width: 30 },
    ],
  },
  {
    name: "Summary",
    source: "summary",
    freezeHeader: true,
    columns: [
      { key: "category", header: "category", width: 24 },
      { key: "category_label", header: "category_label", width: 24 },
      { key: "review_count", header: "review_count", width: 13 },
      { key: "percent", header: "percent", width: 9 },
      { key: "avg_rating", header: "avg_rating", width: 11 },
      { key: "total_thumbs_up", header: "total_thumbs_up", width: 15 },
      { key: "latest_review_date", header: "latest_review_date", width: 20, type: "date" },
      { key: "top_app_version", header: "top_app_version", width: 15 },
    ],
  },
]
