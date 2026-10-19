import { useMemo } from "react"
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"

import { ChartCard } from "@/components/dashboard/charts/ChartCard"
import { ChartTip } from "@/components/dashboard/charts/ChartTip"
import { primarySeries, tipRows } from "@/components/dashboard/charts/config"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { formatInt, formatPct, ratingDistribution } from "@/data/aggregate"
import type { PreparedReview } from "@/data/types"

const config = primarySeries("Reviews")

export function RatingChart({ rows, className }: { rows: PreparedReview[]; className?: string }) {
  const data = useMemo(() => ratingDistribution(rows).map((d) => ({ ...d, value: d.count })), [rows])
  return (
    <ChartCard className={className} title="Rating distribution" description="Reviews per star rating.">
      <ChartContainer config={config} className="aspect-auto h-56 w-full" data-chart-name="rating">
        <BarChart data={data} margin={{ top: 20, right: 8, bottom: 0, left: 8 }} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="rating" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v: string) => `${v} star`} />
          <YAxis hide allowDecimals={false} />
          <ChartTooltip
            cursor={{ fillOpacity: 0.5 }}
            content={({ active, payload }) => {
              const d = tipRows<(typeof data)[number]>(payload)[0]?.payload
              if (!active || !d) return null
              return (
                <ChartTip
                  title={`${d.rating} star`}
                  lines={[
                    { label: "Reviews", value: formatInt(d.count) },
                    { label: "Share", value: formatPct(d.share) },
                  ]}
                />
              )
            }}
          />
          <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} maxBarSize={44} isAnimationActive={false}>
            <LabelList dataKey="value" position="top" offset={6} className="fill-foreground" fontSize={12} />
          </Bar>
        </BarChart>
      </ChartContainer>
    </ChartCard>
  )
}
