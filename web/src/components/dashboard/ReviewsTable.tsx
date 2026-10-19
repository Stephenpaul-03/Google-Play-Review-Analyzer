import { ChevronLeft, ChevronRight, Columns3 } from "lucide-react"
import { useMemo, useState } from "react"

import { Panel, PanelHeader } from "@/components/dashboard/Panel"
import { ReviewSheet } from "@/components/dashboard/ReviewSheet"
import { REVIEW_COLUMNS, sortReviews, type ColumnKey, type SortDir } from "@/components/dashboard/reviews-columns"
import { SortHeader } from "@/components/dashboard/SortHeader"
import { Swatch } from "@/components/dashboard/Swatch"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatDate, formatInt } from "@/data/aggregate"
import type { CategoryIndex } from "@/data/categories"
import type { DashboardData, PreparedReview } from "@/data/types"
import { cn } from "@/lib/utils"

interface Props {
  rows: PreparedReview[]
  data: DashboardData
  categories: CategoryIndex
}

const PAGE_SIZES = ["25", "50", "100"]

const CELL_CLASS: Record<ColumnKey, string> = {
  date: "whitespace-nowrap text-muted-foreground",
  rating: "whitespace-nowrap",
  category: "",
  summary: "",
  user: "text-muted-foreground",
  version: "whitespace-nowrap font-mono text-muted-foreground",
  thumbs: "text-right",
}

export function ReviewsTable({ rows, data, categories }: Props) {
  const keepUsers = data.meta.keep_user_names
  const columns = useMemo(() => REVIEW_COLUMNS.filter((c) => c.key !== "user" || keepUsers), [keepUsers])
  const [sort, setSort] = useState<{ key: ColumnKey; dir: SortDir }>({ key: "date", dir: "desc" })
  const [hiddenCols, setHiddenCols] = useState<Set<ColumnKey>>(() => new Set())
  const [pageSize, setPageSize] = useState(25)
  const [page, setPage] = useState(0)
  const [openId, setOpenId] = useState<string | null>(null)

  // Back to page 1 whenever the filtered set changes.
  const [seenRows, setSeenRows] = useState(rows)
  if (seenRows !== rows) {
    setSeenRows(rows)
    setPage(0)
  }

  const sorted = useMemo(() => sortReviews(rows, sort.key, sort.dir, categories), [rows, sort, categories])
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const current = Math.min(page, pages - 1)
  const visible = sorted.slice(current * pageSize, current * pageSize + pageSize)
  const shownCols = columns.filter((c) => !hiddenCols.has(c.key))
  const openIndex = openId ? sorted.findIndex((r) => r.review_id === openId) : -1

  const onSort = (key: ColumnKey) => {
    const col = columns.find((c) => c.key === key)
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: col?.firstDir ?? "asc" }))
    setPage(0)
  }
  const toggleCol = (key: ColumnKey, on: boolean) =>
    setHiddenCols((prev) => {
      const next = new Set(prev)
      if (on) next.delete(key)
      else next.add(key)
      return next
    })
  const openAt = (index: number) => {
    const r = sorted[index]
    if (!r) return
    setOpenId(r.review_id)
    setPage(Math.floor(index / pageSize))
  }

  return (
    <Panel className="overflow-hidden" data-section="reviews">
      <PanelHeader
        title="Reviews"
        description="Click a review to read it in full. Use j and k to move through the list."
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1.5 px-2 text-xs" data-columns>
                <Columns3 className="size-3.5 text-muted-foreground" aria-hidden="true" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground">Visible columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns.map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.key}
                  className="text-xs"
                  checked={!hiddenCols.has(c.key)}
                  onCheckedChange={(v) => toggleCol(c.key, v === true)}
                  onSelect={(e) => e.preventDefault()}
                  disabled={!hiddenCols.has(c.key) && shownCols.length === 1}
                >
                  {c.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
      <div className="mt-4 overflow-x-auto border-t">
        <table className="w-full min-w-[860px] table-fixed text-xs">
          <colgroup>
            {shownCols.map((c) => (
              <col key={c.key} className={COL_WIDTH[c.key]} />
            ))}
          </colgroup>
          <thead>
            <tr className="h-9 border-b">
              {shownCols.map((c) => (
                <th key={c.key} className={cn("px-3 font-normal first:pl-5 last:pr-5", c.align === "right" ? "text-right" : "text-left")}>
                  <SortHeader
                    label={c.label}
                    sortKey={c.key}
                    active={sort.key === c.key}
                    dir={sort.dir}
                    onClick={() => onSort(c.key)}
                    align={c.align === "right" ? "right" : "left"}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr
                key={r.review_id}
                onClick={() => setOpenId(r.review_id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    setOpenId(r.review_id)
                  }
                }}
                tabIndex={0}
                data-review-row={r.review_id}
                className={cn(
                  "h-10 cursor-pointer border-b outline-none transition-colors last:border-b-0 hover:bg-accent/60 focus-visible:bg-accent",
                  openId === r.review_id && "bg-accent",
                )}
              >
                {shownCols.map((c) => (
                  <td key={c.key} className={cn("px-3 first:pl-5 last:pr-5", CELL_CLASS[c.key])}>
                    <ReviewCell column={c.key} review={r} categories={categories} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2 border-t px-5 py-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>Rows per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              setPageSize(Number(v))
              setPage(0)
            }}
          >
            <SelectTrigger size="sm" className="h-7 w-[64px] px-2 text-xs shadow-none" aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {PAGE_SIZES.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span data-page-info>
          {sorted.length === 0
            ? "0 reviews"
            : `${formatInt(current * pageSize + 1)}-${formatInt(Math.min(sorted.length, (current + 1) * pageSize))} of ${formatInt(sorted.length)}`}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-7"
            onClick={() => setPage(current - 1)}
            disabled={current === 0}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-3.5" aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-7"
            onClick={() => setPage(current + 1)}
            disabled={current >= pages - 1}
            aria-label="Next page"
          >
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>
      <ReviewSheet
        review={openIndex >= 0 ? sorted[openIndex] : null}
        index={openIndex}
        total={sorted.length}
        data={data}
        categories={categories}
        onClose={() => setOpenId(null)}
        onMove={(delta) => openAt(openIndex + delta)}
      />
    </Panel>
  )
}

const COL_WIDTH: Record<ColumnKey, string> = {
  date: "w-28",
  rating: "w-16",
  category: "w-52",
  summary: "",
  user: "w-40",
  version: "w-24",
  thumbs: "w-24",
}

function ReviewCell({ column, review: r, categories }: { column: ColumnKey; review: PreparedReview; categories: CategoryIndex }) {
  switch (column) {
    case "date":
      return <>{formatDate(r.review_date) || "-"}</>
    case "rating":
      return (
        <span>
          {r.rating} <span className="text-muted-foreground">&#9733;</span>
        </span>
      )
    case "category": {
      const info = categories.get(r.primary_category)
      const extra = r.secondary_categories
      return (
        <span className="flex min-w-0 items-center gap-2">
          <Swatch color={info.color} />
          <span className="truncate">{info.label}</span>
          {extra.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="shrink-0 rounded border px-1 text-[10px] leading-4 text-muted-foreground">+{extra.length}</span>
              </TooltipTrigger>
              <TooltipContent>Also: {extra.map((s) => categories.get(s).label).join(", ")}</TooltipContent>
            </Tooltip>
          )}
        </span>
      )
    }
    case "summary":
      return <span className={cn("block truncate", r.summary ? "text-foreground" : "text-muted-foreground")}>{r.summary || r.text}</span>
    case "user":
      return <span className="block truncate">{r.user_name || "-"}</span>
    case "version":
      return <>{r.app_version || "-"}</>
    case "thumbs":
      return <>{formatInt(r.thumbs_up)}</>
  }
}
