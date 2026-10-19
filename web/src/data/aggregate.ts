import type { CategoryIndex } from "@/data/categories"
import type { PreparedReview, Review, SummaryRow } from "@/data/types"
import { OTHER, UNCLASSIFIED } from "@/data/types"
import { compareVersions } from "@/data/versions"

const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0)

// ------------------------------------------------------------------ KPIs

export interface Kpis {
  reviews: number
  complaints: number
  complaintPct: number
  avgRating: number | null
  topComplaint: { id: string; count: number; pct: number } | null
  replyRate: number
  unclassified: number
}

export function computeKpis(rows: PreparedReview[]): Kpis {
  let complaints = 0
  let ratingSum = 0
  let ratingN = 0
  let replied = 0
  let unclassified = 0
  const byCat = new Map<string, number>()
  for (const r of rows) {
    if (r.primary_category === UNCLASSIFIED) unclassified++
    if (r.rating >= 1) {
      ratingSum += r.rating
      ratingN++
    }
    if (r.has_dev_reply) replied++
    if (r.is_complaint === true) {
      complaints++
      byCat.set(r.primary_category, (byCat.get(r.primary_category) ?? 0) + 1)
    }
  }
  let top: Kpis["topComplaint"] = null
  for (const [id, count] of byCat) {
    if (id === OTHER || id === UNCLASSIFIED) continue
    if (!top || count > top.count) top = { id, count, pct: pct(count, complaints) }
  }
  return {
    reviews: rows.length,
    complaints,
    complaintPct: pct(complaints, rows.length),
    avgRating: ratingN ? ratingSum / ratingN : null,
    topComplaint: top,
    replyRate: pct(replied, rows.length),
    unclassified,
  }
}

/** Share (%) of complaints that fall into one category. */
export function complaintShare(rows: PreparedReview[], categoryId: string): number {
  let total = 0
  let hit = 0
  for (const r of rows) {
    if (r.is_complaint !== true) continue
    total++
    if (r.primary_category === categoryId) hit++
  }
  return pct(hit, total)
}

// ------------------------------------------------- complaints by category

export interface CategoryCount {
  id: string
  count: number
  share: number
}

export function complaintsByCategory(rows: PreparedReview[], cats: CategoryIndex): CategoryCount[] {
  const counts = new Map<string, number>()
  let total = 0
  for (const r of rows) {
    if (r.is_complaint !== true || r.primary_category === UNCLASSIFIED) continue
    total++
    counts.set(r.primary_category, (counts.get(r.primary_category) ?? 0) + 1)
  }
  return [...counts]
    .map(([id, count]) => ({ id, count, share: pct(count, total) }))
    .sort((a, b) => {
      if (a.id === OTHER) return 1
      if (b.id === OTHER) return -1
      return b.count - a.count || cats.get(a.id).order - cats.get(b.id).order
    })
}

// ------------------------------------------------------ complaints over time

export type Granularity = "day" | "week" | "month"
const DAY = 86_400_000

export function bucketStart(ts: number, g: Granularity): number {
  const d = new Date(ts)
  if (g === "month") return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)
  const day = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  if (g === "day") return day
  const dow = (d.getUTCDay() + 6) % 7 // Monday = 0
  return day - dow * DAY
}

export function nextBucket(ts: number, g: Granularity): number {
  if (g === "day") return ts + DAY
  if (g === "week") return ts + 7 * DAY
  const d = new Date(ts)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)
}

export type TimePoint = { ts: number } & Record<string, number>

/** Zero-filled complaint counts per bucket, one numeric field per series key. */
export function complaintsOverTime(
  rows: PreparedReview[],
  g: Granularity,
  series: { id: string; key: string }[],
): TimePoint[] {
  const keyById = new Map(series.map((s) => [s.id, s.key]))
  const buckets = new Map<number, Map<string, number>>()
  let min = Infinity
  let max = -Infinity
  for (const r of rows) {
    if (r.is_complaint !== true || Number.isNaN(r.ts)) continue
    const key = keyById.get(r.primary_category)
    if (!key) continue
    const b = bucketStart(r.ts, g)
    min = Math.min(min, b)
    max = Math.max(max, b)
    let m = buckets.get(b)
    if (!m) buckets.set(b, (m = new Map()))
    m.set(key, (m.get(key) ?? 0) + 1)
  }
  if (!Number.isFinite(min)) return []
  const out: TimePoint[] = []
  for (let b = min, guard = 0; b <= max && guard < 20_000; b = nextBucket(b, g), guard++) {
    const point = { ts: b } as TimePoint
    const m = buckets.get(b)
    for (const s of series) point[s.key] = m?.get(s.key) ?? 0
    out.push(point)
  }
  return out
}

/** Default granularity for a visible span: <= 62 days by day, <= 6 months by week, else by month. */
export function autoGranularity(spanMs: number): Granularity {
  const days = spanMs / DAY
  if (days <= 62) return "day"
  if (days <= 183) return "week"
  return "month"
}

/** Time extent (ms) of the rows, or null when no row has a date. */
export function dateExtent(rows: PreparedReview[]): { min: number; max: number } | null {
  let min = Infinity
  let max = -Infinity
  for (const r of rows) {
    if (Number.isNaN(r.ts)) continue
    if (r.ts < min) min = r.ts
    if (r.ts > max) max = r.ts
  }
  return Number.isFinite(min) ? { min, max } : null
}

export interface WeekPoint {
  ts: number
  reviews: number
  complaints: number
}

/** Zero-filled weekly review and complaint counts (Monday weeks, UTC), for sparklines. */
export function weeklySeries(rows: PreparedReview[]): WeekPoint[] {
  const m = new Map<number, WeekPoint>()
  let min = Infinity
  let max = -Infinity
  for (const r of rows) {
    if (Number.isNaN(r.ts)) continue
    const b = bucketStart(r.ts, "week")
    if (b < min) min = b
    if (b > max) max = b
    let p = m.get(b)
    if (!p) m.set(b, (p = { ts: b, reviews: 0, complaints: 0 }))
    p.reviews++
    if (r.is_complaint === true) p.complaints++
  }
  if (!Number.isFinite(min)) return []
  const out: WeekPoint[] = []
  for (let b = min, guard = 0; b <= max && guard < 5000; b = nextBucket(b, "week"), guard++) {
    out.push(m.get(b) ?? { ts: b, reviews: 0, complaints: 0 })
  }
  return out
}

// ------------------------------------------------------------ distributions

export function ratingDistribution(rows: PreparedReview[]): { rating: string; count: number; share: number }[] {
  const counts = [0, 0, 0, 0, 0]
  for (const r of rows) if (r.rating >= 1 && r.rating <= 5) counts[r.rating - 1]++
  return counts.map((count, i) => ({ rating: `${i + 1}`, count, share: pct(count, rows.length) }))
}

const SENTIMENT_ORDER = ["negative", "mixed", "neutral", "positive"]

export function sentimentLabel(s: string): string {
  if (!s) return "Not set"
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function sentimentBreakdown(rows: PreparedReview[]): { sentiment: string; label: string; count: number; share: number }[] {
  const counts = new Map<string, number>()
  for (const r of rows) counts.set(r.sentiment, (counts.get(r.sentiment) ?? 0) + 1)
  const rank = (s: string) => {
    const i = SENTIMENT_ORDER.indexOf(s)
    return i === -1 ? (s ? 50 : 99) : i
  }
  return [...counts]
    .sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0]))
    .map(([sentiment, count]) => ({ sentiment, label: sentimentLabel(sentiment), count, share: pct(count, rows.length) }))
}

export function versionRatings(
  rows: PreparedReview[],
  lastN: number,
  minReviews: number,
): { version: string; avg: number; count: number }[] {
  const acc = new Map<string, { sum: number; n: number }>()
  for (const r of rows) {
    if (!r.app_version || r.rating < 1) continue
    const a = acc.get(r.app_version) ?? { sum: 0, n: 0 }
    a.sum += r.rating
    a.n++
    acc.set(r.app_version, a)
  }
  return [...acc]
    .filter(([, a]) => a.n >= minReviews)
    .sort((a, b) => compareVersions(a[0], b[0]))
    .slice(-lastN)
    .map(([version, a]) => ({ version, avg: Math.round((a.sum / a.n) * 100) / 100, count: a.n }))
}

// --------------------------------------------------------- category summary

export interface CategoryStats extends SummaryRow {
  complaints: number
  complaint_share: number
}

/** Mirrors build_summary() in the Python pipeline, plus complaint share. */
export function categorySummary(rows: Review[]): CategoryStats[] {
  interface Acc {
    n: number
    ratingSum: number
    thumbs: number
    latest: string
    complaints: number
    versions: Map<string, number>
  }
  const groups = new Map<string, Acc>()
  let totalComplaints = 0
  for (const r of rows) {
    let g = groups.get(r.primary_category)
    if (!g) {
      g = { n: 0, ratingSum: 0, thumbs: 0, latest: "", complaints: 0, versions: new Map() }
      groups.set(r.primary_category, g)
    }
    g.n++
    g.ratingSum += r.rating
    g.thumbs += r.thumbs_up
    if (r.review_date > g.latest) g.latest = r.review_date
    if (r.is_complaint === true) {
      g.complaints++
      totalComplaints++
    }
    if (r.app_version) g.versions.set(r.app_version, (g.versions.get(r.app_version) ?? 0) + 1)
  }
  const out: CategoryStats[] = []
  for (const [category, g] of groups) {
    let top = ""
    let topN = 0
    for (const [v, n] of g.versions) {
      if (n > topN) {
        top = v
        topN = n
      }
    }
    out.push({
      category,
      review_count: g.n,
      percent: Math.round(pct(g.n, rows.length) * 10) / 10,
      avg_rating: Math.round((g.ratingSum / g.n) * 100) / 100,
      total_thumbs_up: g.thumbs,
      latest_review_date: g.latest,
      top_app_version: top,
      complaints: g.complaints,
      complaint_share: pct(g.complaints, totalComplaints),
    })
  }
  return out.sort((a, b) => b.review_count - a.review_count)
}

// ---------------------------------------------------------------- formatting

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const pad2 = (n: number) => String(n).padStart(2, "0")

function toTs(iso: string | number): number {
  return typeof iso === "number" ? iso : iso ? Date.parse(iso) : Number.NaN
}

/** "19 Oct 2026" (UTC). Empty string for empty / invalid dates. */
export function formatDate(iso: string | number): string {
  const t = toTs(iso)
  if (Number.isNaN(t)) return ""
  const d = new Date(t)
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

/** "19 Oct" (UTC). */
export function formatDayMonth(t: number): string {
  const d = new Date(t)
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
}

/** "Oct 2026" (UTC). */
export function formatMonth(t: number): string {
  const d = new Date(t)
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

/** "19 Oct 2026, 15:32 UTC". */
export function formatDateTime(iso: string): string {
  const t = toTs(iso)
  if (Number.isNaN(t)) return ""
  const d = new Date(t)
  return `${formatDate(t)}, ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())} UTC`
}

export function formatPct(v: number, digits = 1): string {
  return `${v.toFixed(digits)}%`
}

export const formatInt = (n: number) => n.toLocaleString("en-GB")
