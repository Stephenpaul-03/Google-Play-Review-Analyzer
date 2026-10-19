import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"
import { useMemo, type ReactNode } from "react"

import { Sparkline } from "@/components/dashboard/Sparkline"
import { Swatch } from "@/components/dashboard/Swatch"
import { complaintShare, computeKpis, formatInt, formatPct, weeklySeries, type Kpis } from "@/data/aggregate"
import type { CategoryIndex } from "@/data/categories"
import { rangeLengthDays, type Bounds } from "@/data/filters"
import type { PreparedReview } from "@/data/types"
import { cn } from "@/lib/utils"

type Polarity = "neutral" | "up-good" | "up-bad"

/** Trailing 4-week mean, so the sparkline shows the trend rather than weekly noise. */
function smooth(values: number[], n = 4): number[] {
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - n + 1), i + 1)
    return slice.reduce((a, b) => a + b, 0) / slice.length
  })
}

interface Delta {
  diff: number
  text: string
  polarity: Polarity
}

function makeDelta(cur: number | null, prev: number | null, kind: "rel" | "pts" | "abs", polarity: Polarity): Delta | null {
  if (cur === null || prev === null) return null
  if (kind === "rel") {
    if (prev === 0) return null
    const v = ((cur - prev) / prev) * 100
    return { diff: v, text: `${Math.abs(v).toFixed(0)}%`, polarity }
  }
  const v = cur - prev
  return { diff: v, text: kind === "pts" ? `${Math.abs(v).toFixed(1)} pts` : Math.abs(v).toFixed(2), polarity }
}

function DeltaBadge({ delta, period }: { delta: Delta; period: string }) {
  const flat = Math.abs(delta.diff) < 0.05
  const up = delta.diff > 0
  const tone = flat || delta.polarity === "neutral" ? "neutral" : (up === (delta.polarity === "up-good")) ? "good" : "bad"
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight
  return (
    <span
      title={`${up ? "Up" : flat ? "No change" : "Down"} ${delta.text} vs ${period}`}
      data-delta={tone}
      className={cn(
        "inline-flex h-5 items-center gap-0.5 rounded-md px-1.5 text-[11px] font-medium",
        tone === "good" && "bg-good-bg text-good",
        tone === "bad" && "bg-bad-bg text-bad",
        tone === "neutral" && "bg-muted text-muted-foreground",
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {delta.text}
    </span>
  )
}

interface CellProps {
  id: string
  label: string
  value: ReactNode
  sub: ReactNode
  delta: Delta | null
  period: string
  spark?: { values: number[]; label: string; domain?: [number, number] }
  className?: string
  valueTitle?: string
}

function Cell({ id, label, value, sub, delta, period, spark, className, valueTitle }: CellProps) {
  return (
    <div data-kpi={id} className={cn("flex min-w-0 flex-col gap-1.5 bg-card p-5", className)}>
      <div className="flex h-5 items-center justify-between gap-2">
        <span className="truncate text-xs font-medium text-muted-foreground">{label}</span>
        {delta && <DeltaBadge delta={delta} period={period} />}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0 truncate text-3xl leading-9 font-semibold tracking-tight" title={valueTitle}>
          {value}
        </div>
        {spark && (
          <Sparkline values={spark.values} label={spark.label} domain={spark.domain} className="mb-1.5 hidden h-7 w-20 shrink sm:block" />
        )}
      </div>
      <span className="min-w-0 truncate text-xs text-muted-foreground">{sub}</span>
      {spark && <Sparkline values={spark.values} label={spark.label} domain={spark.domain} className="mt-1 h-6 w-full sm:hidden" />}
    </div>
  )
}

interface KpiStripProps {
  total: number
  rows: PreparedReview[]
  previous: PreparedReview[] | null
  bounds: Bounds | null
  categories: CategoryIndex
}

export function KpiStrip({ total, rows, previous, bounds, categories }: KpiStripProps) {
  const k = useMemo(() => computeKpis(rows), [rows])
  const p = useMemo<Kpis | null>(() => (previous && previous.length ? computeKpis(previous) : null), [previous])
  const weeks = useMemo(() => weeklySeries(rows), [rows])
  const prevTop = useMemo(
    () => (previous && k.topComplaint ? complaintShare(previous, k.topComplaint.id) : null),
    [previous, k.topComplaint],
  )
  const period = bounds ? `previous ${rangeLengthDays(bounds)} days` : ""
  const top = k.topComplaint ? categories.get(k.topComplaint.id) : null

  return (
    <div className="space-y-2">
      <div
        className="grid grid-flow-row-dense grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border shadow-xs lg:grid-cols-5"
        aria-label="Key figures"
        role="group"
      >
        <Cell
          id="reviews"
          label="Reviews analyzed"
          value={formatInt(k.reviews)}
          sub={p ? `${formatInt(p.reviews)} in previous period` : k.reviews === total ? "All reviews" : `of ${formatInt(total)} total`}
          delta={p ? makeDelta(k.reviews, p.reviews, "rel", "neutral") : null}
          period={period}
          spark={{ values: smooth(weeks.map((w) => w.reviews)), label: "Reviews per week, 4-week average" }}
        />
        <Cell
          id="complaints"
          label="Complaint rate"
          value={k.reviews ? formatPct(k.complaintPct) : "-"}
          sub={`${formatInt(k.complaints)} complaint${k.complaints === 1 ? "" : "s"}`}
          delta={p ? makeDelta(k.complaintPct, p.complaintPct, "pts", "up-bad") : null}
          period={period}
          spark={{
            values: smooth(weeks.filter((w) => w.reviews > 0).map((w) => (w.complaints / w.reviews) * 100)),
            label: "Complaint rate per week, 4-week average",
            domain: [0, 100],
          }}
        />
        <Cell
          id="rating"
          label="Average rating"
          value={k.avgRating === null ? "-" : k.avgRating.toFixed(2)}
          sub="out of 5 stars"
          delta={p ? makeDelta(k.avgRating, p.avgRating, "abs", "up-good") : null}
          period={period}
        />
        <Cell
          id="top"
          className="col-span-2 lg:col-span-1"
          label="Top complaint"
          valueTitle={top?.label}
          value={
            top ? (
              <span className="flex min-w-0 items-center gap-2">
                <Swatch color={top.color} className="size-2.5" />
                <span className="truncate text-xl leading-9 tracking-tight">{top.label}</span>
              </span>
            ) : (
              "-"
            )
          }
          sub={k.topComplaint ? `${formatPct(k.topComplaint.pct)} of complaints` : "No categorized complaints"}
          delta={p && k.topComplaint && p.complaints > 0 ? makeDelta(k.topComplaint.pct, prevTop, "pts", "up-bad") : null}
          period={period}
        />
        <Cell
          id="reply"
          label="Developer reply rate"
          value={k.reviews ? formatPct(k.replyRate) : "-"}
          sub="of reviews got a reply"
          delta={p ? makeDelta(k.replyRate, p.replyRate, "pts", "up-good") : null}
          period={period}
        />
      </div>
      {(bounds || k.unclassified > 0) && (
        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 px-1 text-xs text-muted-foreground">
          <span>{bounds ? `Changes compare with the ${period}.` : ""}</span>
          {k.unclassified > 0 && (
            <span data-unclassified>
              {formatInt(k.unclassified)} review{k.unclassified === 1 ? "" : "s"} could not be classified.
            </span>
          )}
        </div>
      )}
    </div>
  )
}
