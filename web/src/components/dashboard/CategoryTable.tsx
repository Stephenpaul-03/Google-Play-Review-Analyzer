import { useMemo } from "react"

import { Swatch } from "@/components/dashboard/Swatch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { categorySummary, formatDate, formatInt, formatPct } from "@/data/aggregate"
import type { CategoryIndex } from "@/data/categories"
import type { PreparedReview } from "@/data/types"
import { OTHER, UNCLASSIFIED } from "@/data/types"
import { cn } from "@/lib/utils"

interface Props {
  rows: PreparedReview[]
  categories: CategoryIndex
  selected: string[]
  onSelect: (id: string) => void
}

export function CategoryTable({ rows, categories, selected, onSelect }: Props) {
  const stats = useMemo(() => {
    const rank = (id: string) => (id === UNCLASSIFIED ? 2 : id === OTHER ? 1 : 0)
    return categorySummary(rows).sort((a, b) => rank(a.category) - rank(b.category) || b.review_count - a.review_count)
  }, [rows])
  const sel = new Set(selected)

  return (
    <Card className="min-w-0 gap-4">
      <CardHeader className="px-4 sm:px-6">
        <CardTitle className="text-sm font-semibold">Categories</CardTitle>
        <CardDescription className="text-xs">
          Computed from the filtered reviews. Click a row to show only that category.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 sm:px-2">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Category</TableHead>
              <TableHead className="text-right">Reviews</TableHead>
              <TableHead className="text-right">% of reviews</TableHead>
              <TableHead className="text-right">% of complaints</TableHead>
              <TableHead className="text-right">Avg rating</TableHead>
              <TableHead className="text-right">Thumbs up</TableHead>
              <TableHead>Latest review</TableHead>
              <TableHead className="pr-4">Top version</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats.map((s) => {
              const info = categories.get(s.category)
              const active = sel.has(s.category)
              return (
                <TableRow
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
                  className={cn("cursor-pointer", active && "bg-muted/60")}
                >
                  <TableCell className="pl-4">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center gap-2 font-medium">
                          <Swatch color={info.color} />
                          {info.label}
                        </span>
                      </TooltipTrigger>
                      {info.description && (
                        <TooltipContent side="top" className="max-w-xs">
                          {info.description}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatInt(s.review_count)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatPct(s.percent)}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.complaints ? formatPct(s.complaint_share) : "-"}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.avg_rating.toFixed(2)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatInt(s.total_thumbs_up)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(s.latest_review_date)}</TableCell>
                  <TableCell className="pr-4 text-muted-foreground">{s.top_app_version || "-"}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
