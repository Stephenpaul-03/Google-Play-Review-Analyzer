import { sentimentLabel } from "@/data/aggregate"
import type { CategoryIndex, ThemedColor } from "@/data/categories"
import type { PreparedReview } from "@/data/types"
import { UNCLASSIFIED } from "@/data/types"
import { sortedVersionsDesc } from "@/data/versions"

export interface Option {
  value: string
  label: string
  count: number
  color?: ThemedColor
}

export interface FilterOptions {
  categories: Option[]
  sentiments: Option[]
  versions: Option[]
  countries: Option[]
  maxThumbs: number
  hasUnclassified: boolean
}

function counter(rows: PreparedReview[], pick: (r: PreparedReview) => string): Map<string, number> {
  const m = new Map<string, number>()
  for (const r of rows) {
    const v = pick(r)
    m.set(v, (m.get(v) ?? 0) + 1)
  }
  return m
}

/** Choices for the filter controls, derived once from all reviews of the app. */
export function buildFilterOptions(rows: PreparedReview[], cats: CategoryIndex): FilterOptions {
  const catCounts = counter(rows, (r) => r.primary_category)
  const sentiments = counter(rows, (r) => r.sentiment)
  const versions = counter(rows, (r) => r.app_version)
  const countries = counter(rows, (r) => r.country)
  const order = ["negative", "mixed", "neutral", "positive"]
  return {
    categories: cats.list
      .filter((c) => c.id !== UNCLASSIFIED && (c.known || catCounts.has(c.id)))
      .map((c) => ({ value: c.id, label: c.label, count: catCounts.get(c.id) ?? 0, color: c.color })),
    sentiments: [...sentiments.keys()]
      .sort((a, b) => {
        const ia = order.indexOf(a)
        const ib = order.indexOf(b)
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b)
      })
      .map((s) => ({ value: s, label: sentimentLabel(s), count: sentiments.get(s) ?? 0 })),
    versions: sortedVersionsDesc(versions.keys()).map((v) => ({ value: v, label: v, count: versions.get(v) ?? 0 })),
    countries: [...countries.keys()]
      .filter(Boolean)
      .sort()
      .map((c) => ({ value: c, label: c.toUpperCase(), count: countries.get(c) ?? 0 })),
    maxThumbs: rows.reduce((m, r) => Math.max(m, r.thumbs_up), 0),
    hasUnclassified: catCounts.has(UNCLASSIFIED),
  }
}
