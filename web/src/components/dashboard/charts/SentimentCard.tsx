import { useMemo, type CSSProperties } from "react"

import { Panel, PanelBody, PanelHeader } from "@/components/dashboard/Panel"
import { Swatch } from "@/components/dashboard/Swatch"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatInt, formatPct, sentimentBreakdown } from "@/data/aggregate"
import { sentimentColor } from "@/data/categories"
import type { PreparedReview } from "@/data/types"
import { cn } from "@/lib/utils"

interface Props {
  rows: PreparedReview[]
  selected: string[]
  onToggle: (sentiment: string) => void
  className?: string
}

/** One 100% stacked bar plus a legend list. List rows toggle the sentiment filter. */
export function SentimentCard({ rows, selected, onToggle, className }: Props) {
  const parts = useMemo(() => sentimentBreakdown(rows), [rows])
  return (
    <Panel className={className} data-chart-name="sentiment">
      <PanelHeader title="Sentiment" description="Tone of each review, as labelled by the model." />
      <PanelBody className="space-y-5 pt-4">
        <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Sentiment share">
          {parts.map((p) => {
            const c = sentimentColor(p.sentiment)
            return (
              <Tooltip key={p.sentiment}>
                <TooltipTrigger asChild>
                  <span
                    className="h-full min-w-1 bg-(--sw-l) first:rounded-l-full last:rounded-r-full dark:bg-(--sw-d)"
                    style={{ width: `${p.share}%`, "--sw-l": c.light, "--sw-d": c.dark } as CSSProperties}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  {p.label}: {formatInt(p.count)} ({formatPct(p.share)})
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
        <ul className="space-y-1">
          {parts.map((p) => {
            const on = selected.includes(p.sentiment)
            return (
              <li key={p.sentiment}>
                <button
                  type="button"
                  onClick={() => onToggle(p.sentiment)}
                  aria-pressed={on}
                  className={cn(
                    "grid w-full grid-cols-[1fr_3rem_3rem] items-center gap-3 rounded-md px-1.5 py-1.5 text-xs outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50",
                    on && "bg-accent",
                  )}
                >
                  <span className="flex items-center gap-2 text-left">
                    <Swatch color={sentimentColor(p.sentiment)} />
                    {p.label}
                  </span>
                  <span className="text-right">{formatInt(p.count)}</span>
                  <span className="text-right text-muted-foreground">{formatPct(p.share)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </PanelBody>
    </Panel>
  )
}
