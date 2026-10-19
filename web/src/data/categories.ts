import type { Category, PreparedReview } from "@/data/types"
import { OTHER, UNCLASSIFIED } from "@/data/types"

export interface ThemedColor {
  light: string
  dark: string
}

/** Fixed categorical palette, assigned by config order (non-"other" categories only). */
export const CATEGORY_PALETTE: ThemedColor[] = [
  { light: "#2a78d6", dark: "#3987e5" },
  { light: "#eb6834", dark: "#d95926" },
  { light: "#1baf7a", dark: "#199e70" },
  { light: "#eda100", dark: "#c98500" },
  { light: "#e87ba4", dark: "#d55181" },
  { light: "#008300", dark: "#2f9a2f" },
  { light: "#6250d6", dark: "#9085e9" },
  { light: "#e34948", dark: "#e66767" },
  { light: "#8f6f4e", dark: "#a8865f" },
  { light: "#5f7f8f", dark: "#8597a5" },
]
export const NEUTRAL_COLOR: ThemedColor = { light: "#9a9a9a", dark: "#7a7a7a" }

export interface CategoryInfo {
  id: string
  label: string
  description: string
  color: ThemedColor
  /** CSS-safe key used for chart config / CSS variables. */
  key: string
  /** Display order: config order, then unknown ids, "other", "unclassified". */
  order: number
  known: boolean
}

export interface CategoryIndex {
  list: CategoryInfo[]
  byId: Map<string, CategoryInfo>
  get: (id: string) => CategoryInfo
}

export function buildCategoryIndex(categories: Category[], reviews: PreparedReview[]): CategoryIndex {
  const list: CategoryInfo[] = []
  const byId = new Map<string, CategoryInfo>()
  let paletteIndex = 0
  const add = (id: string, label: string, description: string, known: boolean) => {
    if (byId.has(id)) return
    let color = NEUTRAL_COLOR
    if (known && id !== OTHER) {
      color = CATEGORY_PALETTE[paletteIndex] ?? NEUTRAL_COLOR
      paletteIndex += 1
    }
    const info: CategoryInfo = { id, label, description, color, key: `c${list.length}`, order: 0, known }
    list.push(info)
    byId.set(id, info)
  }
  for (const c of categories) if (c.id !== OTHER && c.id !== UNCLASSIFIED) add(c.id, c.label, c.description, true)
  // Ids that are no longer configured: show the raw id.
  const unknown = new Set<string>()
  for (const r of reviews) {
    if (!byId.has(r.primary_category) && r.primary_category !== OTHER && r.primary_category !== UNCLASSIFIED) {
      unknown.add(r.primary_category)
    }
    for (const s of r.secondary_categories) {
      if (!byId.has(s) && s !== OTHER && s !== UNCLASSIFIED) unknown.add(s)
    }
  }
  for (const id of [...unknown].sort()) add(id, id, "Not in the current category config.", false)
  const other = categories.find((c) => c.id === OTHER)
  add(OTHER, other?.label ?? "Other", other?.description ?? "", true)
  add(UNCLASSIFIED, "Unclassified", "Every categorization attempt failed for these reviews.", false)
  list.forEach((c, i) => (c.order = i))

  const get = (id: string): CategoryInfo => {
    const found = byId.get(id)
    if (found) return found
    // Should not happen (all ids seen at load are indexed), but stay safe.
    const info: CategoryInfo = { id, label: id, description: "", color: NEUTRAL_COLOR, key: `x${byId.size}`, order: 9999, known: false }
    byId.set(id, info)
    return info
  }
  return { list, byId, get }
}
