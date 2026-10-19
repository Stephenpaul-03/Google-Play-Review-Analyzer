import type { ChartConfig } from "@/components/ui/chart"
import type { CategoryInfo } from "@/data/categories"

/** Chart config keyed by the CSS-safe category key, with light/dark colours. */
export function categoryChartConfig(cats: CategoryInfo[]): ChartConfig {
  const config: ChartConfig = {}
  for (const c of cats) config[c.key] = { label: c.label, theme: { light: c.color.light, dark: c.color.dark } }
  return config
}

/** Single-series charts use the theme's primary colour. */
export const primarySeries = (label: string): ChartConfig => ({
  value: { label, color: "var(--primary)" },
})

export interface PayloadEntry<T> {
  payload?: T
  dataKey?: unknown
  value?: unknown
}

/** Narrow Recharts' loosely typed tooltip payload to our row type. */
export function tipRows<T>(payload: ReadonlyArray<unknown> | undefined): PayloadEntry<T>[] {
  return (payload ?? []) as PayloadEntry<T>[]
}
