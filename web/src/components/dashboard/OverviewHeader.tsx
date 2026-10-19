import { useMemo } from "react"

import { dateExtent, formatDate, formatInt } from "@/data/aggregate"
import type { DashboardData, PreparedReview } from "@/data/types"

/** "ollama:qwen2.5:7b-instruct" -> "qwen2.5:7b-instruct" */
function modelName(engine: string): string {
  const i = engine.indexOf(":")
  return i > 0 && i < engine.length - 1 ? engine.slice(i + 1) : engine
}

export function OverviewHeader({ data, reviews }: { data: DashboardData; reviews: PreparedReview[] }) {
  const span = useMemo(() => dateExtent(reviews), [reviews])
  const fresh = [
    data.meta.scraped_at ? `Scraped ${formatDate(data.meta.scraped_at)}` : "",
    data.meta.engine ? `Categorized with ${modelName(data.meta.engine)}` : "",
  ].filter(Boolean)
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold tracking-tight">Overview</h2>
        <p className="text-xs text-muted-foreground">
          {formatInt(reviews.length)} reviews
          {span && ` from ${formatDate(span.min)} to ${formatDate(span.max)}`}
        </p>
      </div>
      {fresh.length > 0 && (
        <p className="flex flex-wrap gap-x-1.5 text-xs text-muted-foreground sm:justify-end" data-freshness>
          {fresh.map((part, i) => (
            <span key={part} className="whitespace-nowrap">
              {i > 0 && <span aria-hidden="true" className="max-sm:hidden">· </span>}
              {part}
            </span>
          ))}
        </p>
      )}
    </div>
  )
}
