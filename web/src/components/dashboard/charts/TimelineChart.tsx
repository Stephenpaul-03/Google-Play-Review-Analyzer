import { useMemo, useState } from "react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import { ChartCard, ChartEmpty, Segmented } from "@/components/dashboard/charts/ChartCard"
import { ChartTip } from "@/components/dashboard/charts/ChartTip"
import { categoryChartConfig, tipRows } from "@/components/dashboard/charts/config"
import { Swatch } from "@/components/dashboard/Swatch"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import {
  complaintsByCategory,
  complaintsOverTime,
  formatDate,
  formatDayMonth,
  formatInt,
  formatMonth, type Granularity, type TimePoint } from "@/data/aggregate"
import type { CategoryIndex } from "@/data/categories"
import type { PreparedReview } from "@/data/types"
import { cn } from "@/lib/utils"

interface Props {
  rows: PreparedReview[]
  categories: CategoryIndex
  className?: string
}


function tick(ts: number, g: Granularity) {
  return g === "month" ? formatMonth(ts) : formatDayMonth(ts)
}
function bucketTitle(ts: number, g: Granularity) {
  if (g === "month") return formatMonth(ts)
  if (g === "week") return `Week of ${formatDate(ts)}`
  return formatDate(ts)
}

export function TimelineChart({ rows, categories, className }: Props) {
  const [granularity, setGranularity] = useState<Granularity>("week")
  const [topN, setTopN] = useState<"3" | "5" | "8">("5")
  const [hidden, setHidden] = useState<Set<string>>(() => new Set())

  const series = useMemo(
    () =>
      complaintsByCategory(rows, categories)
        .sort((a, b) => b.count - a.count)
        .slice(0, Number(topN))
        .map((c) => categories.get(c.id)),
    [rows, categories, topN],
  )
  const data = useMemo(() => complaintsOverTime(rows, granularity, series), [rows, granularity, series])
  const config = useMemo(() => categoryChartConfig(series), [series])

  const toggle = (id: string) =>
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <ChartCard
      className={className}
      title="Complaints over time"
      description={`Top ${topN} categories by complaints. Weeks start Monday (UTC).`}
      actions={
        <>
          <Segmented
            label="Granularity"
            value={granularity}
            onChange={setGranularity}
            options={[
              { value: "day", label: "Day" },
              { value: "week", label: "Week" },
              { value: "month", label: "Month" },
            ]}
          />
          <Segmented
            label="Number of categories"
            value={topN}
            onChange={setTopN}
            options={[
              { value: "3", label: "Top 3" },
              { value: "5", label: "5" },
              { value: "8", label: "8" },
            ]}
          />
        </>
      }
    >
      {data.length === 0 ? (
        <ChartEmpty>No dated complaints match the current filters.</ChartEmpty>
      ) : (
        <>
          <ChartContainer config={config} className="aspect-auto h-64 w-full" data-chart-name="timeline">
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }} accessibilityLayer>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="ts"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={28}
                tickFormatter={(v: number) => tick(v, granularity)}
              />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
              <ChartTooltip
                content={({ active, payload }) => {
                  const entries = tipRows<TimePoint>(payload)
                  const point = entries[0]?.payload
                  if (!active || !point) return null
                  return (
                    <ChartTip
                      title={bucketTitle(point.ts, granularity)}
                      lines={series
                        .filter((s) => !hidden.has(s.id))
                        .map((s) => ({ label: s.label, value: formatInt(point[s.key] ?? 0), swatch: <Swatch color={s.color} /> }))}
                    />
                  )
                }}
              />
              {series.map((s) => (
                <Line
                  key={s.id}
                  dataKey={s.key}
                  name={s.label}
                  type="linear"
                  stroke={`var(--color-${s.key})`}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  hide={hidden.has(s.id)}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ChartContainer>
          <div className="mt-3 flex flex-wrap justify-center gap-x-1 gap-y-1 px-2" aria-label="Series">
            {series.map((s) => {
              const off = hidden.has(s.id)
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggle(s.id)}
                  aria-pressed={!off}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs hover:bg-accent",
                    off && "text-muted-foreground line-through opacity-60",
                  )}
                >
                  <Swatch color={s.color} />
                  {s.label}
                </button>
              )
            })}
          </div>
        </>
      )}
    </ChartCard>
  )
}
