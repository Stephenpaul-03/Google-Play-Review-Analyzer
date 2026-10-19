import { rangeLabel } from "@/components/dashboard/filters/range-label"
import { sentimentLabel } from "@/data/aggregate"
import type { CategoryIndex } from "@/data/categories"
import { DEFAULT_FILTERS, type Filters } from "@/data/filters"

export interface Chip {
  id: string
  label: string
  remove: (f: Filters) => Filters
}

function without<T>(list: T[], value: T): T[] {
  return list.filter((v) => v !== value)
}

export function buildChips(f: Filters, categories: CategoryIndex): Chip[] {
  const chips: Chip[] = []
  if (f.range.preset !== "all") {
    chips.push({ id: "range", label: rangeLabel(f.range), remove: (x) => ({ ...x, range: DEFAULT_FILTERS.range }) })
  }
  for (const c of f.categories) {
    chips.push({ id: `cat-${c}`, label: categories.get(c).label, remove: (x) => ({ ...x, categories: without(x.categories, c) }) })
  }
  if (f.matchSecondary) {
    chips.push({ id: "sec", label: "Incl. secondary categories", remove: (x) => ({ ...x, matchSecondary: false }) })
  }
  for (const r of f.ratings) {
    chips.push({ id: `rating-${r}`, label: `${r} star`, remove: (x) => ({ ...x, ratings: without(x.ratings, r) }) })
  }
  for (const s of f.sentiments) {
    chips.push({ id: `sent-${s}`, label: sentimentLabel(s), remove: (x) => ({ ...x, sentiments: without(x.sentiments, s) }) })
  }
  if (f.complaint !== "all") {
    chips.push({
      id: "complaint",
      label: f.complaint === "yes" ? "Complaints only" : "Non-complaints",
      remove: (x) => ({ ...x, complaint: "all" }),
    })
  }
  for (const v of f.versions) {
    chips.push({ id: `ver-${v}`, label: `v${v}`, remove: (x) => ({ ...x, versions: without(x.versions, v) }) })
  }
  for (const c of f.countries) {
    chips.push({ id: `country-${c}`, label: c.toUpperCase(), remove: (x) => ({ ...x, countries: without(x.countries, c) }) })
  }
  if (f.reply !== "any") {
    chips.push({ id: "reply", label: f.reply === "yes" ? "Replied" : "Not replied", remove: (x) => ({ ...x, reply: "any" }) })
  }
  if (f.minThumbs > 0) {
    chips.push({ id: "thumbs", label: `${f.minThumbs}+ thumbs up`, remove: (x) => ({ ...x, minThumbs: 0 }) })
  }
  if (f.q) chips.push({ id: "q", label: `"${f.q}"`, remove: (x) => ({ ...x, q: "" }) })
  if (!f.includeUnclassified) {
    chips.push({ id: "uncl", label: "Unclassified hidden", remove: (x) => ({ ...x, includeUnclassified: true }) })
  }
  return chips
}
