import type {
  AppMeta,
  AppsIndex,
  Category,
  DashboardData,
  PreparedReview,
  Review,
  SummaryRow,
} from "@/data/types"

export type EmbeddedResult =
  | { kind: "none" }
  | { kind: "data"; data: DashboardData }
  | { kind: "error"; message: string }

/** Read the JSON that build_dashboard.py embeds into the single-file build. */
export function readEmbeddedData(): EmbeddedResult {
  const el = document.getElementById("dashboard-data")
  const raw = el?.textContent?.trim() ?? ""
  if (!raw || raw === "null") return { kind: "none" }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null) return { kind: "none" }
    return { kind: "data", data: normalizeDashboard(parsed) }
  } catch (err) {
    return { kind: "error", message: `Embedded data could not be read: ${errorText(err)}` }
  }
}

export async function fetchApps(): Promise<AppsIndex> {
  const json = await fetchJson("data/apps.json")
  const apps = isObject(json) && Array.isArray(json.apps) ? json.apps : []
  return {
    apps: apps.filter(isObject).map((a) => ({
      app_id: str(a.app_id),
      app_title: str(a.app_title) || str(a.app_id),
      review_count: num(a.review_count),
      scraped_at: str(a.scraped_at),
      built_at: str(a.built_at),
    })).filter((a) => a.app_id),
  }
}

export async function fetchDashboard(appId: string): Promise<DashboardData> {
  const json = await fetchJson(`data/${encodeURIComponent(appId)}/dashboard_data.json`)
  return normalizeDashboard(json)
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
  return res.json()
}

export function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export function prepareReviews(reviews: Review[]): PreparedReview[] {
  return reviews.map((r) => ({
    ...r,
    ts: r.review_date ? Date.parse(r.review_date) : Number.NaN,
    haystack: `${r.text}\n${r.summary}\n${r.user_name}`.toLowerCase(),
  }))
}

// ---- Defensive normalisation: tolerate missing fields, never trust types ----

type Obj = Record<string, unknown>

function isObject(v: unknown): v is Obj {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}
function str(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v)
}
function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

export function normalizeDashboard(json: unknown): DashboardData {
  if (!isObject(json)) throw new Error("dashboard data is not an object")
  const m = isObject(json.meta) ? json.meta : {}
  const meta: AppMeta = {
    app_id: str(m.app_id),
    app_title: str(m.app_title) || str(m.app_id),
    countries: Array.isArray(m.countries) ? m.countries.map(str) : [],
    lang: str(m.lang),
    scraped_at: str(m.scraped_at),
    built_at: str(m.built_at),
    play_url: str(m.play_url),
    keep_user_names: m.keep_user_names === true,
    engine: str(m.engine),
  }
  const categories: Category[] = (Array.isArray(json.categories) ? json.categories : [])
    .filter(isObject)
    .map((c) => ({ id: str(c.id), label: str(c.label) || str(c.id), description: str(c.description) }))
    .filter((c) => c.id)
  const reviews: Review[] = (Array.isArray(json.reviews) ? json.reviews : [])
    .filter(isObject)
    .map((r) => ({
      review_id: str(r.review_id),
      country: str(r.country),
      rating: num(r.rating),
      review_date: str(r.review_date),
      app_version: str(r.app_version),
      thumbs_up: num(r.thumbs_up),
      text: str(r.text),
      primary_category: str(r.primary_category) || "unclassified",
      secondary_categories: Array.isArray(r.secondary_categories)
        ? r.secondary_categories.map(str).filter(Boolean)
        : [],
      is_complaint: typeof r.is_complaint === "boolean" ? r.is_complaint : null,
      sentiment: str(r.sentiment),
      summary: str(r.summary),
      model: str(r.model),
      categorized_at: str(r.categorized_at),
      error: str(r.error),
      user_name: meta.keep_user_names ? str(r.user_name) : "",
      has_dev_reply: r.has_dev_reply === true,
      dev_reply_date: str(r.dev_reply_date),
    }))
  const summary: SummaryRow[] = (Array.isArray(json.summary) ? json.summary : [])
    .filter(isObject)
    .map((s) => ({
      category: str(s.category),
      review_count: num(s.review_count),
      percent: num(s.percent),
      avg_rating: num(s.avg_rating),
      total_thumbs_up: num(s.total_thumbs_up),
      latest_review_date: str(s.latest_review_date),
      top_app_version: str(s.top_app_version),
    }))
  return { schema_version: num(json.schema_version), meta, categories, reviews, summary }
}
