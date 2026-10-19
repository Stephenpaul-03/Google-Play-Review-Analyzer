import { useMemo, useState } from "react"

import { Panel, PanelHeader } from "@/components/dashboard/Panel"
import { SortHeader } from "@/components/dashboard/SortHeader"
import { Swatch } from "@/components/dashboard/Swatch"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { categorySummary, formatDate, formatInt, formatPct, type CategoryStats } from "@/data/aggregate"
import type { CategoryIndex } from "@/data/categories"
import type { PreparedReview } from "@/data/types"
import { OTHER, UNCLASSIFIED } from "@/data/types"
import { compareVersions } from "@/data/versions"
import { cn } from "@/lib/utils"

interface Props {
  rows: PreparedReview[]
  categories: CategoryIndex
  selected: string[]
  onSelect: (id: string) => void
}

type Key = "category" | "reviews" | "percent" | "complaints" | "rating" | "thumbs" | "latest" | "version"

interface Col {
  key: Key
  label: string
  right?: boolean
  first: "asc" | "desc"
  cmp: (a: CategoryStats, b: CategoryStats, cats: CategoryIndex) => number
}

const COLS: Col[] = [
  { key: "category", label: "Category", first: "asc", cmp: (a, b, c) => c.get(a.category).order - c.get(b.category).order },
  { key: "reviews", label: "Reviews", right: true, first: "desc", cmp: (a, b) => a.review_count - b.review_count },
  { key: "percent", label: "% of reviews", right: true, first: "desc", cmp: (a, b) => a.percent - b.percent },
  { key: "complaints", label: "% of complaints", right: true, first: "desc", cmp: (a, b) => a.complaint_share - b.complaint_share },
  { key: "rating", label: "Avg rating", right: true, first: "asc", cmp: (a, b) => a.avg_rating - b.avg_rating },
  { key: "thumbs", label: "Thumbs up", right: true, first: "desc", cmp: (a, b) => a.total_thumbs_up - b.total_thumbs_up },
  { key: "latest", label: "Latest review", right: true, first: "desc", cmp: (a, b) => a.latest_review_date.localeCompare(b.latest_review_date) },
  { key: "version", label: "Top version", right: true, first: "desc", cmp: (a, b) => compareVersions(a.top_app_version, b.top_app_version) },
]

export function CategoryTable({ rows, categories, selected, onSelect }: Props) {
  const [sort, setSort] = useState<{ key: Key; dir: "asc" | "desc" }>({ key: "reviews", dir: "desc" })
  const stats = useMemo(() => {
    const col = COLS.find((c) => c.key === sort.key) ?? COLS[1]
    const sign = sort.dir === "asc" ? 1 : -1
    // "Other" and "Unclassified" always sit at the bottom.
    const tail = (id: string) => (id === UNCLASSIFIED ? 2 : id === OTHER ? 1 : 0)
    return categorySummary(rows).sort(
      (a, b) => tail(a.category) - tail(b.category) || sign * col.cmp(a, b, categories) || b.review_count - a.review_count,
    )
  }, [rows, sort, categories])
  const maxShare = Math.max(1, ...stats.map((s) => s.complaint_share))
  const sel = new Set(selected)

  const onSort = (c: Col) =>
    setSort((s) => (s.key === c.key ? { key: c.key, dir: s.dir === "asc" ? "desc" : "asc" } : { key: c.key, dir: c.first }))

  return (
    <Panel className="overflow-hidden">
      <PanelHeader title="Category overview" description="Computed from the reviews in the current view. Click a row to show only that category." />
      <div className="mt-4 overflow-x-auto border-t">
        <table className="w-full min-w-[820px] text-xs">
          <thead>
            <tr className="h-9 border-b">
              {COLS.map((c) => (
                <th key={c.key} className={cn("px-3 font-normal first:pl-5 last:pr-5", c.right ? "text-right" : "text-left")}>
                  <SortHeader
                    label={c.label}
                    sortKey={c.key}
                    active={sort.key === c.key}
                    dir={sort.dir}
                    onClick={() => onSort(c)}
                    align={c.right ? "right" : "left"}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => {
              const info = categories.get(s.category)
              const active = sel.has(s.category)
              return (
                <tr
                  key={s.category}
                  onClick={() => onSelect(s.category)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      onSelect(s.category)
                    }
                  }}
                  tabIndex={0}
                  aria-selected={active}
                  data-category={s.category}
                  className={cn(
                    "h-10 cursor-pointer border-b outline-none transition-colors last:border-b-0 hover:bg-accent/60 focus-visible:bg-accent",
                    active && "bg-accent hover:bg-accent",
                  )}
                >
                  <td className="relative px-3 pl-5">
                    {active && <span className="absolute inset-y-0 left-0 w-0.5 bg-foreground" aria-hidden="true" />}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center gap-2 font-medium whitespace-nowrap">
                          <Swatch color={info.color} />
                          {info.label}
                        </span>
                      </TooltipTrigger>
                      {info.description && (
                        <TooltipContent side="top" align="start" className="max-w-xs">
                          {info.description}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </td>
                  <td className="px-3 text-right">{formatInt(s.review_count)}</td>
                  <td className="px-3 text-right text-muted-foreground">{formatPct(s.percent)}</td>
                  <td className="px-3">
                    <div className="flex items-center justify-end gap-2.5">
                      <span className="h-1.5 w-20 overflow-hidden rounded-full bg-track" aria-hidden="true">
                        <span className="block h-full rounded-full bg-bar" style={{ width: `${(s.complaint_share / maxShare) * 100}%` }} />
                      </span>
                      <span className="w-11 text-right">{s.complaints ? formatPct(s.complaint_share) : "-"}</span>
                    </div>
                  </td>
                  <td className="px-3 text-right">{s.avg_rating.toFixed(2)}</td>
                  <td className="px-3 text-right">{formatInt(s.total_thumbs_up)}</td>
                  <td className="px-3 text-right whitespace-nowrap text-muted-foreground">{formatDate(s.latest_review_date)}</td>
                  <td className="px-3 pr-5 text-right font-mono text-muted-foreground">{s.top_app_version || "-"}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
