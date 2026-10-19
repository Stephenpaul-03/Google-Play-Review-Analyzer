import type { CategoryIndex } from "@/data/categories"
import type { PreparedReview } from "@/data/types"
import { compareVersions } from "@/data/versions"

export type ColumnKey = "date" | "rating" | "category" | "summary" | "user" | "version" | "thumbs"
export type SortDir = "asc" | "desc"

export interface ColumnDef {
  key: ColumnKey
  label: string
  align?: "right"
  /** Direction used on the first click. */
  firstDir: SortDir
  compare: (a: PreparedReview, b: PreparedReview, cats: CategoryIndex) => number
}

const byTs = (a: PreparedReview, b: PreparedReview) => (a.ts || 0) - (b.ts || 0)

export const REVIEW_COLUMNS: ColumnDef[] = [
  { key: "date", label: "Date", firstDir: "desc", compare: byTs },
  { key: "rating", label: "Rating", firstDir: "asc", compare: (a, b) => a.rating - b.rating },
  {
    key: "category",
    label: "Category",
    firstDir: "asc",
    compare: (a, b, cats) => cats.get(a.primary_category).label.localeCompare(cats.get(b.primary_category).label),
  },
  {
    key: "summary",
    label: "Summary",
    firstDir: "asc",
    compare: (a, b) => (a.summary || a.text).localeCompare(b.summary || b.text),
  },
  { key: "user", label: "User", firstDir: "asc", compare: (a, b) => a.user_name.localeCompare(b.user_name) },
  { key: "version", label: "Version", firstDir: "desc", compare: (a, b) => compareVersions(a.app_version, b.app_version) },
  { key: "thumbs", label: "Thumbs up", align: "right", firstDir: "desc", compare: (a, b) => a.thumbs_up - b.thumbs_up },
]

export function sortReviews(
  rows: PreparedReview[],
  key: ColumnKey,
  dir: SortDir,
  cats: CategoryIndex,
): PreparedReview[] {
  const col = REVIEW_COLUMNS.find((c) => c.key === key) ?? REVIEW_COLUMNS[0]
  const sign = dir === "asc" ? 1 : -1
  // Stable tie-break on date (newest first) so pages don't shuffle.
  return [...rows].sort((a, b) => sign * col.compare(a, b, cats) || byTs(b, a))
}
