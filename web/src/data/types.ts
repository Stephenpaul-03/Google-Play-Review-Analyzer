// Types for docs/data-contract.md (schema_version 1).

export interface AppIndexEntry {
  app_id: string
  app_title: string
  review_count: number
  scraped_at: string
  built_at: string
}

export interface AppsIndex {
  apps: AppIndexEntry[]
}

export interface AppMeta {
  app_id: string
  app_title: string
  countries: string[]
  lang: string
  scraped_at: string
  built_at: string
  play_url: string
  keep_user_names: boolean
  engine: string
}

export interface Category {
  id: string
  label: string
  description: string
}

export interface Review {
  review_id: string
  country: string
  rating: number
  review_date: string
  app_version: string
  thumbs_up: number
  text: string
  primary_category: string
  secondary_categories: string[]
  is_complaint: boolean | null
  sentiment: string
  summary: string
  model: string
  categorized_at: string
  error: string
  user_name: string
  has_dev_reply: boolean
  dev_reply_date: string
}

export interface SummaryRow {
  category: string
  review_count: number
  percent: number
  avg_rating: number
  total_thumbs_up: number
  latest_review_date: string
  top_app_version: string
}

export interface DashboardData {
  schema_version: number
  meta: AppMeta
  categories: Category[]
  reviews: Review[]
  summary: SummaryRow[]
}

/** A review with values precomputed once at load time. */
export interface PreparedReview extends Review {
  /** review_date as epoch ms (NaN when the date is empty). */
  ts: number
  /** Lower-cased text + summary + user name, for search. */
  haystack: string
}

export const UNCLASSIFIED = "unclassified"
export const OTHER = "other"
