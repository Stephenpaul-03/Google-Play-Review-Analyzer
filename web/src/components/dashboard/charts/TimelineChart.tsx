import { useMemo, useState } from "react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import { ChartTip } from "@/components/dashboard/charts/ChartTip"
import { categoryChartConfig, tipRows } from "@/components/dashboard/charts/config"
import { EmptyNote, Panel, PanelBody, PanelHeader, Segmented } from "@/components/dashboard/Panel"
import { Swatch } from "@/components/dashboard/Swatch"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import {
  autoGranularity,
  complaintsByCategory,
  complaintsOverTime,
  dateExtent,
  formatDate,
  formatDayMonth,
  formatInt,
  formatMonth,
  type Granularity,
  type TimePoint,
} from "@/data/aggregate"
import type { CategoryIndex } from "@/data/categories"
import type { Bounds } from "@/data/filters"
import type { PreparedReview } from "@/data/types"
import { cn } from "@/lib/utils"

interface Props {
  rows: PreparedReview[]
  categories: CategoryIndex
  bounds: Bounds | null
  className?: string
}

const tick = (ts: number, g: Granularity) => (g === "month" ? formatMonth(ts) : formatDayMonth(ts))
function bucketTitle(ts: number, g: Granularity) {
  if (g === "month") return formatMonth(ts)
  if (g === "week") return `Week of ${formatDate(ts)}`
  return formatDate(ts)
}

export function TimelineChart({ rows, categories, bounds, className }: Props) {
  // A manual granularity choice applies to the date range it was made for.
  const rangeKey = bounds ? `${bounds.from}-${bounds.to}` : "all"
  const [override, setOverrideState] = useState<{ g: Granularity; key: string } | null>(null)
  const setOverride = (g: Granularity) => setOverrideState({ g, key: rangeKey })
  const [topN, setTopN] = useState<"3" | "5" | "8">("5")
  const [hidden, setHidden] = useState<Set<string>>(() => new Set())

  const auto = useMemo(() => {
    const ext = dateExtent(rows)
    const span = bounds ? bounds.to - bounds.from : ext ? ext.max - ext.min : 0
    return autoGranularity(span)
  }, [rows, bounds])
  const granularity = override && override.key === rangeKey ? override.g : auto

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
  const visible = series.filter((s) => !hidden.has(s.id))

  const toggle = (id: string) =>
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <Panel className={cn("flex flex-col", className)}>
      <PanelHeader
        title="Complaints over time"
        description={`Top ${topN} categories by complaints${granularity === "week" ? ", weeks start Monday (UTC)" : ""}.`}
        actions={
          <>
            <Segmented
              label="Granularity"
              value={granularity}
              onChange={setOverride}
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
      />
      <PanelBody className="flex flex-1 flex-col pt-4">
        {data.length === 0 ? (
          <EmptyNote>No dated complaints match the current filters.</EmptyNote>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-1" aria-label="Series">
              {series.map((s) => {
                const off = hidden.has(s.id)
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggle(s.id)}
                    aria-pressed={!off}
                    title={off ? `Show ${s.label}` : `Hide ${s.label}`}
                    className={cn(
                      "inline-flex h-6 items-center gap-1.5 rounded-md border px-2 text-[11px] outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50",
                      off ? "border-dashed text-subtle-foreground" : "text-foreground",
                    )}
                  >
                    <Swatch color={s.color} className={cn(off && "opacity-30")} />
                    {s.label}
                  </button>
                )
              })}
            </div>
            <ChartContainer config={config} className="aspect-auto h-[280px] w-full" data-chart-name="timeline">
              <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 4" className="[&_line]:stroke-border" />
                <XAxis
                  dataKey="ts"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  minTickGap={32}
                  fontSize={11}
                  tickFormatter={(v: number) => tick(v, granularity)}
                />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} fontSize={11} tickMargin={6} />
                <ChartTooltip
                  cursor={{ stroke: "var(--ring)", strokeWidth: 1, strokeDasharray: "3 3" }}
                  content={({ active, payload }) => {
                    const point = tipRows<TimePoint>(payload)[0]?.payload
                    if (!active || !point) return null
                    const lines = visible
                      .map((s) => ({ s, v: point[s.key] ?? 0 }))
                      .sort((a, b) => b.v - a.v)
                      .map(({ s, v }) => ({ label: s.label, value: formatInt(v), color: s.color }))
                    return <ChartTip title={bucketTitle(point.ts, granularity)} lines={lines} />
                  }}
                />
                {series.map((s) => (
                  <Line
                    key={s.id}
                    dataKey={s.key}
                    name={s.label}
                    type="monotone"
                    stroke={`var(--color-${s.key})`}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3.5, strokeWidth: 2, stroke: "var(--card)" }}
                    hide={hidden.has(s.id)}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ChartContainer>
          </>
        )}
      </PanelBody>
    </Panel>
  )
}
