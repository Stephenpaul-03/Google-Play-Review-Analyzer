import type { PreparedReview } from "@/data/types"
import { UNCLASSIFIED } from "@/data/types"

export type RangePreset = "7d" | "30d" | "90d" | "6m" | "12m" | "all"
export type DateRangeFilter =
  | { preset: RangePreset }
  /** Inclusive UTC days, "YYYY-MM-DD". */
  | { preset: "custom"; from: string; to: string }

export type ComplaintFilter = "all" | "yes" | "no"
export type ReplyFilter = "any" | "yes" | "no"

export interface Filters {
  range: DateRangeFilter
  categories: string[]
  matchSecondary: boolean
  ratings: number[]
  sentiments: string[]
  complaint: ComplaintFilter
  versions: string[]
  countries: string[]
  reply: ReplyFilter
  minThumbs: number
  q: string
  includeUnclassified: boolean
}

export const DEFAULT_FILTERS: Filters = {
  range: { preset: "all" },
  categories: [],
  matchSecondary: false,
  ratings: [],
  sentiments: [],
  complaint: "all",
  versions: [],
  countries: [],
  reply: "any",
  minThumbs: 0,
  q: "",
  includeUnclassified: true,
}

export const RANGE_PRESETS: { value: RangePreset; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "6m", label: "Last 6 months" },
  { value: "12m", label: "Last 12 months" },
  { value: "all", label: "All time" },
]

const DAY = 86_400_000

/** Half-open [from, to) interval in epoch ms. */
export interface Bounds {
  from: number
  to: number
}

export function resolveRange(range: DateRangeFilter, now: number): Bounds | null {
  switch (range.preset) {
    case "all":
      return null
    case "7d":
      return { from: now - 7 * DAY, to: now }
    case "30d":
      return { from: now - 30 * DAY, to: now }
    case "90d":
      return { from: now - 90 * DAY, to: now }
    case "6m":
    case "12m": {
      const d = new Date(now)
      d.setUTCMonth(d.getUTCMonth() - (range.preset === "6m" ? 6 : 12))
      return { from: d.getTime(), to: now }
    }
    case "custom": {
      const from = Date.parse(`${range.from}T00:00:00Z`)
      const to = Date.parse(`${range.to}T00:00:00Z`) + DAY
      if (Number.isNaN(from) || Number.isNaN(to) || to <= from) return null
      return { from, to }
    }
  }
}

export function previousBounds(b: Bounds): Bounds {
  const len = b.to - b.from
  return { from: b.from - len, to: b.from }
}

export function rangeLengthDays(b: Bounds): number {
  return Math.round((b.to - b.from) / DAY)
}

export function applyFilters(rows: PreparedReview[], f: Filters, bounds: Bounds | null): PreparedReview[] {
  const cats = f.categories.length ? new Set(f.categories) : null
  const ratings = f.ratings.length ? new Set(f.ratings) : null
  const sentiments = f.sentiments.length ? new Set(f.sentiments) : null
  const versions = f.versions.length ? new Set(f.versions) : null
  const countries = f.countries.length ? new Set(f.countries) : null
  const q = f.q.trim().toLowerCase()
  const out: PreparedReview[] = []
  for (const r of rows) {
    if (bounds && !(r.ts >= bounds.from && r.ts < bounds.to)) continue
    if (!f.includeUnclassified && r.primary_category === UNCLASSIFIED) continue
    if (cats && !cats.has(r.primary_category)) {
      if (!f.matchSecondary || !r.secondary_categories.some((s) => cats.has(s))) continue
    }
    if (ratings && !ratings.has(r.rating)) continue
    if (sentiments && !sentiments.has(r.sentiment || "")) continue
    if (f.complaint === "yes" && r.is_complaint !== true) continue
    if (f.complaint === "no" && r.is_complaint !== false) continue
    if (versions && !versions.has(r.app_version)) continue
    if (countries && !countries.has(r.country)) continue
    if (f.reply === "yes" && !r.has_dev_reply) continue
    if (f.reply === "no" && r.has_dev_reply) continue
    if (f.minThumbs > 0 && r.thumbs_up < f.minThumbs) continue
    if (q && !r.haystack.includes(q)) continue
    out.push(r)
  }
  return out
}

export function isDefaultFilters(f: Filters): boolean {
  return encodeFilters(f).toString() === ""
}

// ---------------------------------------------------------------- URL hash

const LIST_SEP = "~"

function list(params: URLSearchParams, key: string): string[] {
  const v = params.get(key)
  return v ? v.split(LIST_SEP).filter(Boolean) : []
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/

export function decodeFilters(params: URLSearchParams): Filters {
  const f: Filters = { ...DEFAULT_FILTERS }
  const range = params.get("range")
  if (range && RANGE_PRESETS.some((p) => p.value === range)) {
    f.range = { preset: range as RangePreset }
  } else if (range) {
    const [from, to] = range.split("_")
    if (from && to && DAY_RE.test(from) && DAY_RE.test(to)) f.range = { preset: "custom", from, to }
  }
  f.categories = list(params, "cat")
  f.matchSecondary = params.get("sec") === "1"
  f.ratings = list(params, "rating").map(Number).filter((n) => n >= 1 && n <= 5)
  f.sentiments = list(params, "sent")
  const c = params.get("complaint")
  if (c === "yes" || c === "no") f.complaint = c
  f.versions = list(params, "ver")
  f.countries = list(params, "country")
  const reply = params.get("reply")
  if (reply === "yes" || reply === "no") f.reply = reply
  const t = Number(params.get("thumbs"))
  if (Number.isFinite(t) && t > 0) f.minThumbs = Math.floor(t)
  f.q = params.get("q") ?? ""
  f.includeUnclassified = params.get("uncl") !== "0"
  return f
}

export function encodeFilters(f: Filters): URLSearchParams {
  const p = new URLSearchParams()
  if (f.range.preset === "custom") p.set("range", `${f.range.from}_${f.range.to}`)
  else if (f.range.preset !== "all") p.set("range", f.range.preset)
  if (f.categories.length) p.set("cat", f.categories.join(LIST_SEP))
  if (f.matchSecondary) p.set("sec", "1")
  if (f.ratings.length) p.set("rating", [...f.ratings].sort().join(LIST_SEP))
  if (f.sentiments.length) p.set("sent", f.sentiments.join(LIST_SEP))
  if (f.complaint !== "all") p.set("complaint", f.complaint)
  if (f.versions.length) p.set("ver", f.versions.join(LIST_SEP))
  if (f.countries.length) p.set("country", f.countries.join(LIST_SEP))
  if (f.reply !== "any") p.set("reply", f.reply)
  if (f.minThumbs > 0) p.set("thumbs", String(f.minThumbs))
  if (f.q) p.set("q", f.q)
  if (!f.includeUnclassified) p.set("uncl", "0")
  return p
}

export function readHash(): URLSearchParams {
  return new URLSearchParams(window.location.hash.replace(/^#/, ""))
}

export function writeHash(params: URLSearchParams) {
  const s = params.toString()
  const next = s ? `#${s}` : window.location.pathname + window.location.search
  if (`#${s}` === window.location.hash || (!s && !window.location.hash)) return
  window.history.replaceState(null, "", next)
}
