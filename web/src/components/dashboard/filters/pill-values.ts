import { sentimentLabel } from "@/data/aggregate"
import type { CategoryIndex } from "@/data/categories"
import { DEFAULT_FILTERS, type Filters } from "@/data/filters"
import { compareVersions } from "@/data/versions"

/** [1,2,3,5] -> "1-3, 5" */
export function ratingValue(ratings: number[]): string {
  const sorted = [...new Set(ratings)].sort((a, b) => a - b)
  const parts: string[] = []
  for (let i = 0; i < sorted.length; i++) {
    let j = i
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++
    parts.push(i === j ? `${sorted[i]}` : `${sorted[i]}-${sorted[j]}`)
    i = j
  }
  return parts.join(", ")
}

/** First value plus a "+N" overflow count. */
export function firstPlus(values: string[]): string {
  if (!values.length) return ""
  return values.length === 1 ? values[0] : `${values[0]} +${values.length - 1}`
}

export function categoriesValue(ids: string[], cats: CategoryIndex): string {
  if (!ids.length) return ""
  return ids.length === 1 ? cats.get(ids[0]).label : String(ids.length)
}

export function versionsValue(versions: string[]): string {
  return firstPlus([...versions].sort((a, b) => compareVersions(b, a)))
}

export function sentimentsValue(s: string[]): string {
  return firstPlus(s.map(sentimentLabel))
}

export function moreValue(f: Filters): string {
  const parts: string[] = []
  if (f.minThumbs > 0) parts.push(`${f.minThumbs}+ thumbs`)
  if (!f.includeUnclassified) parts.push("no unclassified")
  return parts.join(", ")
}

/** Number of active filters other than date range and search (for the mobile badge). */
export function activeFilterCount(f: Filters): number {
  return (
    (f.categories.length ? 1 : 0) +
    (f.ratings.length ? 1 : 0) +
    (f.sentiments.length ? 1 : 0) +
    (f.complaint !== "all" ? 1 : 0) +
    (f.versions.length ? 1 : 0) +
    (f.countries.length ? 1 : 0) +
    (f.reply !== "any" ? 1 : 0) +
    (moreValue(f) ? 1 : 0)
  )
}

/** Reset every filter, date range and search included. */
export function clearFilters(): Filters {
  return DEFAULT_FILTERS
}
