import { useMemo, useState } from "react"
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"

import { AxisLabel } from "@/components/dashboard/charts/AxisLabel"
import { ChartCard, ChartEmpty, Segmented } from "@/components/dashboard/charts/ChartCard"
import { ChartTip } from "@/components/dashboard/charts/ChartTip"
import { categoryChartConfig, tipRows } from "@/components/dashboard/charts/config"
import { Swatch } from "@/components/dashboard/Swatch"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { complaintsByCategory, formatInt, formatPct } from "@/data/aggregate"
import type { CategoryIndex } from "@/data/categories"
import type { PreparedReview } from "@/data/types"

type Metric = "count" | "share"

interface Props {
  rows: PreparedReview[]
  categories: CategoryIndex
  selected: string[]
  onToggle: (id: string) => void
  className?: string
}

interface Datum {
  id: string
  key: string
  label: string
  count: number
  share: number
  fill: string
  fillOpacity: number
}

export function CategoryBarChart({ rows, categories, selected, onToggle, className }: Props) {
  const [metric, setMetric] = useState<Metric>("count")
  const data = useMemo<Datum[]>(() => {
    const sel = new Set(selected)
    return complaintsByCategory(rows, categories).map((c) => {
      const info = categories.get(c.id)
      return {
        ...c,
        key: info.key,
        label: info.label,
        fill: `var(--color-${info.key})`,
        fillOpacity: sel.size === 0 || sel.has(c.id) ? 1 : 0.35,
      }
    })
  }, [rows, categories, selected])
  const config = useMemo(() => categoryChartConfig(data.map((d) => categories.get(d.id))), [data, categories])
  const height = data.length * 30 + 12

  return (
    <ChartCard
      className={className}
      title="Complaints by category"
      description="Click a bar to filter by that category."
      actions={
        <Segmented
          label="Metric"
          value={metric}
          onChange={setMetric}
          options={[
            { value: "count", label: "Count" },
            { value: "share", label: "Share %" },
          ]}
        />
      }
    >
      {data.length === 0 ? (
        <ChartEmpty>No complaints match the current filters.</ChartEmpty>
      ) : (
        <ChartContainer config={config} className="aspect-auto w-full" style={{ height }} data-chart-name="category">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 48, bottom: 0, left: 0 }}
            barCategoryGap={6}
            accessibilityLayer
            onClick={(state) => {
              const i = Number(state?.activeTooltipIndex ?? state?.activeIndex)
              const d = Number.isInteger(i) ? data[i] : undefined
              if (d) onToggle(d.id)
            }}
            className="[&_.recharts-surface]:cursor-pointer"
          >
            <CartesianGrid horizontal={false} />
            <XAxis type="number" dataKey={metric} hide domain={[0, "dataMax"]} />
            <YAxis
              type="category"
              dataKey="label"
              width={128}
              interval={0}
              tick={<AxisLabel />}
              tickLine={false}
              axisLine={false}
              tickMargin={6}
            />
            <ChartTooltip
              cursor={{ fillOpacity: 0.5 }}
              content={({ active, payload }) => {
                const d = tipRows<Datum>(payload)[0]?.payload
                if (!active || !d) return null
                return (
                  <ChartTip
                    title={d.label}
                    lines={[
                      { label: "Complaints", value: formatInt(d.count), swatch: <Swatch color={categories.get(d.id).color} /> },
                      { label: "Share of complaints", value: formatPct(d.share) },
                    ]}
                  />
                )
              }}
            />
            <Bar dataKey={metric} radius={4} maxBarSize={20} isAnimationActive={false}>
              <LabelList
                dataKey={metric}
                position="right"
                offset={6}
                className="fill-foreground"
                fontSize={12}
                formatter={(v: unknown) => (metric === "share" ? formatPct(Number(v)) : formatInt(Number(v)))}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
    </ChartCard>
  )
}
