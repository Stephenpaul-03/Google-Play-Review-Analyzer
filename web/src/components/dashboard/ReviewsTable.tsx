import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Columns3, Star } from "lucide-react"
import { Fragment, useMemo, useState } from "react"

import { ReviewDetail } from "@/components/dashboard/ReviewDetail"
import { REVIEW_COLUMNS, sortReviews, type ColumnKey, type SortDir } from "@/components/dashboard/reviews-columns"
import { Swatch } from "@/components/dashboard/Swatch"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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

export function ReviewsTable({ rows, data, categories }: Props) {
  const keepUsers = data.meta.keep_user_names
  const columns = useMemo(() => REVIEW_COLUMNS.filter((c) => c.key !== "user" || keepUsers), [keepUsers])
  const [sort, setSort] = useState<{ key: ColumnKey; dir: SortDir }>({ key: "date", dir: "desc" })
  const [hiddenCols, setHiddenCols] = useState<Set<ColumnKey>>(() => new Set())
  const [pageSize, setPageSize] = useState(25)
  const [page, setPage] = useState(0)
  const [expanded, setExpanded] = useState<string | null>(null)

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

  return (
    <Card className="min-w-0 gap-4" data-section="reviews">
      <CardHeader className="flex flex-wrap items-start justify-between gap-2 px-4 sm:px-6">
        <div className="space-y-1">
          <CardTitle className="text-sm font-semibold">Reviews</CardTitle>
          <CardDescription className="text-xs">Click a row for the full review.</CardDescription>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Columns3 aria-hidden="true" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Visible columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {columns.map((c) => (
              <DropdownMenuCheckboxItem
                key={c.key}
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
      </CardHeader>
      <CardContent className="px-0 sm:px-2">
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow>
              {shownCols.map((c) => (
                <TableHead key={c.key} className={cn("first:pl-4 last:pr-4", c.align === "right" && "text-right")}>
                  <button
                    type="button"
                    onClick={() => onSort(c.key)}
                    data-sort={c.key}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-sm hover:text-foreground",
                      sort.key === c.key ? "text-foreground" : "text-muted-foreground",
                    )}
                    aria-label={`Sort by ${c.label}`}
                  >
                    {c.label}
                    {sort.key === c.key &&
                      (sort.dir === "asc" ? (
                        <ArrowUp className="size-3.5" aria-hidden="true" />
                      ) : (
                        <ArrowDown className="size-3.5" aria-hidden="true" />
                      ))}
                  </button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((r) => {
              const open = expanded === r.review_id
              return (
                <Fragment key={r.review_id}>
                  <TableRow
                    onClick={() => setExpanded(open ? null : r.review_id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        setExpanded(open ? null : r.review_id)
                      }
                    }}
                    tabIndex={0}
                    aria-expanded={open}
                    data-review-row={r.review_id}
                    className={cn("cursor-pointer align-top", open && "border-b-0 bg-muted/50")}
                  >
                    {shownCols.map((c) => (
                      <TableCell key={c.key} className={cn("first:pl-4 last:pr-4", c.align === "right" && "text-right")}>
                        <ReviewCell column={c.key} review={r} categories={categories} />
                      </TableCell>
                    ))}
                  </TableRow>
                  {open && (
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableCell colSpan={shownCols.length} className="px-4 pt-0 pb-4 whitespace-normal">
                        <ReviewDetail review={r} data={data} categories={categories} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              )
            })}
          </TableBody>
        </Table>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Rows per page</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(Number(v))
                setPage(0)
              }}
            >
              <SelectTrigger size="sm" className="h-8 w-[72px] text-xs" aria-label="Rows per page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="tabular-nums" data-page-info>
              {sorted.length === 0
                ? "0 reviews"
                : `${formatInt(current * pageSize + 1)}-${formatInt(Math.min(sorted.length, (current + 1) * pageSize))} of ${formatInt(sorted.length)}`}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setPage(current - 1)}
              disabled={current === 0}
              aria-label="Previous page"
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <span className="tabular-nums">
              Page {current + 1} of {pages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setPage(current + 1)}
              disabled={current >= pages - 1}
              aria-label="Next page"
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ReviewCell({ column, review: r, categories }: { column: ColumnKey; review: PreparedReview; categories: CategoryIndex }) {
  switch (column) {
    case "date":
      return <span className="whitespace-nowrap tabular-nums">{formatDate(r.review_date) || "-"}</span>
    case "rating":
      return (
        <span className="inline-flex items-center gap-1 tabular-nums">
          {r.rating}
          <Star className="size-3 fill-current text-muted-foreground" aria-label="stars" />
        </span>
      )
    case "category": {
      const info = categories.get(r.primary_category)
      return (
        <div className="flex max-w-[220px] flex-col gap-1">
          <span className="inline-flex items-center gap-1.5 font-medium whitespace-nowrap">
            <Swatch color={info.color} />
            {info.label}
          </span>
          {r.secondary_categories.length > 0 && (
            <span className="flex flex-wrap gap-1">
              {r.secondary_categories.map((s) => (
                <Badge key={s} variant="outline" className="px-1.5 py-0 text-[10px] font-normal text-muted-foreground">
                  {categories.get(s).label}
                </Badge>
              ))}
            </span>
          )}
        </div>
      )
    }
    case "summary":
      return (
        <span className={cn("line-clamp-2 max-w-[420px] min-w-[220px] whitespace-normal", !r.summary && "text-muted-foreground")}>
          {r.summary || r.text}
        </span>
      )
    case "user":
      return <span className="block max-w-[160px] truncate">{r.user_name || "-"}</span>
    case "version":
      return <span className="whitespace-nowrap tabular-nums">{r.app_version || "-"}</span>
    case "thumbs":
      return <span className="tabular-nums">{formatInt(r.thumbs_up)}</span>
  }
}
