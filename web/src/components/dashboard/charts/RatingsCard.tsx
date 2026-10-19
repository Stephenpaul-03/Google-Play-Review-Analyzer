import { Star } from "lucide-react"
import { useMemo } from "react"

import { Panel, PanelBody, PanelHeader } from "@/components/dashboard/Panel"
import { computeKpis, formatInt, formatPct, ratingDistribution } from "@/data/aggregate"
import type { PreparedReview } from "@/data/types"
import { cn } from "@/lib/utils"

interface Props {
  rows: PreparedReview[]
  selected: number[]
  onToggle: (rating: number) => void
  className?: string
}

/** Play Store style histogram, 5 to 1 stars. Rows toggle the rating filter. */
export function RatingsCard({ rows, selected, onToggle, className }: Props) {
  const dist = useMemo(() => ratingDistribution(rows).slice().reverse(), [rows])
  const avg = useMemo(() => computeKpis(rows).avgRating, [rows])
  const max = Math.max(1, ...dist.map((d) => d.count))
  const rounded = avg === null ? 0 : Math.round(avg)

  return (
    <Panel className={className} data-chart-name="rating">
      <PanelHeader title="Ratings" description="Star ratings in the current view. Click a row to filter." />
      <PanelBody className="space-y-5 pt-4">
        <div className="flex items-end gap-3">
          <span className="text-4xl leading-none font-semibold tracking-tight">{avg === null ? "-" : avg.toFixed(2)}</span>
          <div className="pb-0.5">
            <div className="flex gap-0.5" aria-label={`Average ${avg?.toFixed(2) ?? "-"} of 5`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={cn("size-3.5", n <= rounded ? "fill-foreground text-foreground" : "fill-track text-track")}
                  aria-hidden="true"
                />
              ))}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{formatInt(rows.length)} ratings</div>
          </div>
        </div>
        <div className="space-y-1">
          {dist.map((d) => {
            const n = Number(d.rating)
            const on = selected.includes(n)
            const dim = selected.length > 0 && !on
            return (
              <button
                key={d.rating}
                type="button"
                onClick={() => onToggle(n)}
                aria-pressed={on}
                data-rating-row={d.rating}
                className={cn(
                  "grid w-full grid-cols-[2.25rem_1fr_3rem_2.75rem] items-center gap-3 rounded-md px-1.5 py-1 text-xs outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50",
                  on && "bg-accent",
                )}
              >
                <span className={cn("text-left font-medium", dim && "text-muted-foreground")}>{d.rating} &#9733;</span>
                <span className="h-1.5 overflow-hidden rounded-full bg-track">
                  <span
                    className={cn("block h-full rounded-full bg-bar", dim && "opacity-40")}
                    style={{ width: `${(d.count / max) * 100}%` }}
                  />
                </span>
                <span className="text-right">{formatInt(d.count)}</span>
                <span className="text-right text-muted-foreground">{formatPct(d.share, 0)}</span>
              </button>
            )
          })}
        </div>
      </PanelBody>
    </Panel>
  )
}
