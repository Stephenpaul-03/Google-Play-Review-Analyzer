import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"
import { useMemo } from "react"

import { Card, CardContent } from "@/components/ui/card"
import { complaintShare, computeKpis, formatInt, formatPct, type Kpis } from "@/data/aggregate"
import type { CategoryIndex } from "@/data/categories"
import { rangeLengthDays, type Bounds } from "@/data/filters"
import type { PreparedReview } from "@/data/types"

interface KpiCardsProps {
  rows: PreparedReview[]
  previous: PreparedReview[] | null
  bounds: Bounds | null
  categories: CategoryIndex
}

interface Delta {
  value: number
  text: string
}

function delta(cur: number | null, prev: number | null, unit: "pct" | "pts" | "num"): Delta | null {
  if (cur === null || prev === null) return null
  if (unit === "pct") {
    if (prev === 0) return null
    const v = ((cur - prev) / prev) * 100
    return { value: v, text: `${v >= 0 ? "+" : ""}${v.toFixed(0)}%` }
  }
  const v = cur - prev
  const digits = unit === "pts" ? 1 : 2
  return { value: v, text: `${v >= 0 ? "+" : ""}${v.toFixed(digits)}${unit === "pts" ? " pts" : ""}` }
}

export function KpiCards({ rows, previous, bounds, categories }: KpiCardsProps) {
  const k = useMemo(() => computeKpis(rows), [rows])
  const p = useMemo<Kpis | null>(() => (previous ? computeKpis(previous) : null), [previous])
  const prevTopShare = useMemo(
    () => (previous && k.topComplaint ? complaintShare(previous, k.topComplaint.id) : null),
    [previous, k.topComplaint],
  )
  const period = bounds ? `vs previous ${rangeLengthDays(bounds)} days` : ""
  const hasPrev = p !== null && p.reviews > 0

  const cards: { id: string; title: string; value: string; sub: string; delta: Delta | null }[] = [
    {
      id: "reviews",
      title: "Reviews analyzed",
      value: formatInt(k.reviews),
      sub: hasPrev ? `${formatInt(p.reviews)} in previous period` : "",
      delta: p ? delta(k.reviews, p.reviews, "pct") : null,
    },
    {
      id: "complaints",
      title: "Complaints",
      value: formatPct(k.complaintPct),
      sub: `${formatInt(k.complaints)} complaint${k.complaints === 1 ? "" : "s"}`,
      delta: hasPrev ? delta(k.complaintPct, p.complaintPct, "pts") : null,
    },
    {
      id: "rating",
      title: "Average rating",
      value: k.avgRating === null ? "-" : k.avgRating.toFixed(2),
      sub: "out of 5",
      delta: hasPrev ? delta(k.avgRating, p.avgRating, "num") : null,
    },
    {
      id: "top",
      title: "Top complaint",
      value: k.topComplaint ? categories.get(k.topComplaint.id).label : "-",
      sub: k.topComplaint ? `${formatPct(k.topComplaint.pct)} of complaints` : "No categorized complaints",
      delta: hasPrev && k.topComplaint && p.complaints > 0 ? delta(k.topComplaint.pct, prevTopShare, "pts") : null,
    },
    {
      id: "reply",
      title: "Developer reply rate",
      value: formatPct(k.replyRate),
      sub: "of reviews got a reply",
      delta: hasPrev ? delta(k.replyRate, p.replyRate, "pts") : null,
    },
  ]

  return (
    <section aria-label="Key figures" className="space-y-2">
      <div className="grid grid-flow-row-dense grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {cards.map((c, i) => (
          <Card key={c.id} data-kpi={c.id} className={i === 3 ? "col-span-2 gap-0 py-4 lg:col-span-1" : "gap-0 py-4"}>
            <CardContent className="space-y-1 px-4">
              <div className="text-xs font-medium text-muted-foreground">{c.title}</div>
              <div className="truncate text-2xl font-semibold tracking-tight tabular-nums" title={c.value}>
                {c.value}
              </div>
              <div className="truncate text-xs text-muted-foreground">{c.sub}</div>
              {bounds && (
                <div className="flex items-center gap-1 pt-1 text-xs text-muted-foreground tabular-nums">
                  {c.delta ? <DeltaIcon value={c.delta.value} /> : null}
                  <span className="truncate">{c.delta ? `${c.delta.text} ${period}` : "No previous-period data"}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {k.unclassified > 0 && (
        <p className="text-xs text-muted-foreground">
          {formatInt(k.unclassified)} review{k.unclassified === 1 ? "" : "s"} could not be classified.
        </p>
      )}
    </section>
  )
}

function DeltaIcon({ value }: { value: number }) {
  if (Math.abs(value) < 1e-9) return <Minus className="size-3.5" aria-hidden="true" />
  return value > 0 ? (
    <ArrowUpRight className="size-3.5" aria-hidden="true" />
  ) : (
    <ArrowDownRight className="size-3.5" aria-hidden="true" />
  )
}
