import { useMemo } from "react"
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"

import { AxisLabel } from "@/components/dashboard/charts/AxisLabel"
import { ChartCard } from "@/components/dashboard/charts/ChartCard"
import { ChartTip } from "@/components/dashboard/charts/ChartTip"
import { primarySeries, tipRows } from "@/components/dashboard/charts/config"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { formatInt, formatPct, sentimentBreakdown } from "@/data/aggregate"
import type { PreparedReview } from "@/data/types"

const config = primarySeries("Reviews")

export function SentimentChart({ rows, className }: { rows: PreparedReview[]; className?: string }) {
  const data = useMemo(() => sentimentBreakdown(rows).map((d) => ({ ...d, value: d.count })), [rows])
  const height = Math.max(data.length * 36 + 8, 120)
  return (
    <ChartCard className={className} title="Sentiment" description="Reviews by sentiment, as labelled by the model.">
      <ChartContainer config={config} className="aspect-auto w-full" style={{ height }} data-chart-name="sentiment">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 64, bottom: 0, left: 0 }} barCategoryGap={8} accessibilityLayer>
          <CartesianGrid horizontal={false} />
          <XAxis type="number" dataKey="value" hide />
          <YAxis type="category" dataKey="label" width={76} interval={0} tick={<AxisLabel />} tickLine={false} axisLine={false} tickMargin={6} />
          <ChartTooltip
            cursor={{ fillOpacity: 0.5 }}
            content={({ active, payload }) => {
              const d = tipRows<(typeof data)[number]>(payload)[0]?.payload
              if (!active || !d) return null
              return (
                <ChartTip
                  title={d.label}
                  lines={[
                    { label: "Reviews", value: formatInt(d.count) },
                    { label: "Share", value: formatPct(d.share) },
                  ]}
                />
              )
            }}
          />
          <Bar dataKey="value" fill="var(--color-value)" radius={4} maxBarSize={22} isAnimationActive={false}>
            <LabelList
              dataKey="share"
              position="right"
              offset={6}
              className="fill-foreground"
              fontSize={12}
              formatter={(v: unknown) => formatPct(Number(v), 0)}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </ChartCard>
  )
}
