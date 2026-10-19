import { useMemo, useState } from "react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import { ChartCard, ChartEmpty } from "@/components/dashboard/charts/ChartCard"
import { ChartTip } from "@/components/dashboard/charts/ChartTip"
import { primarySeries, tipRows } from "@/components/dashboard/charts/config"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatInt, versionRatings } from "@/data/aggregate"
import type { PreparedReview } from "@/data/types"

const config = primarySeries("Average rating")

interface SmallSelectProps {
  value: string
  onChange: (v: string) => void
  options: string[]
  label: string
  format: (v: string) => string
}

function SmallSelect({ value, onChange, options, label, format }: SmallSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" className="h-8 gap-1 px-2 text-xs" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o} className="text-xs">
            {format(o)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function VersionChart({ rows, className }: { rows: PreparedReview[]; className?: string }) {
  const [lastN, setLastN] = useState("10")
  const [minReviews, setMinReviews] = useState("5")
  const data = useMemo(
    () => versionRatings(rows, Number(lastN), Number(minReviews)).map((d) => ({ ...d, value: d.avg })),
    [rows, lastN, minReviews],
  )

  return (
    <ChartCard
      className={className}
      title="Average rating by version"
      description={`Last ${lastN} versions with at least ${minReviews} reviews.`}
      actions={
        <>
          <SmallSelect label="Versions shown" value={lastN} onChange={setLastN} options={["5", "10", "20"]} format={(o) => `Last ${o}`} />
          <SmallSelect label="Minimum reviews" value={minReviews} onChange={setMinReviews} options={["5", "10", "25"]} format={(o) => `${o}+ reviews`} />
        </>
      }
    >
      {data.length === 0 ? (
        <ChartEmpty>No app version has {minReviews} or more reviews in the current filter.</ChartEmpty>
      ) : (
        <ChartContainer config={config} className="aspect-auto h-56 w-full" data-chart-name="version">
          <LineChart data={data} margin={{ top: 12, right: 16, bottom: 0, left: -16 }} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="version" tickLine={false} axisLine={false} tickMargin={8} minTickGap={8} />
            <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tickLine={false} axisLine={false} width={40} />
            <ChartTooltip
              content={({ active, payload }) => {
                const d = tipRows<(typeof data)[number]>(payload)[0]?.payload
                if (!active || !d) return null
                return (
                  <ChartTip
                    title={`Version ${d.version}`}
                    lines={[
                      { label: "Average rating", value: d.avg.toFixed(2) },
                      { label: "Reviews", value: formatInt(d.count) },
                    ]}
                  />
                )
              }}
            />
            <Line
              dataKey="value"
              type="linear"
              stroke="var(--color-value)"
              strokeWidth={2}
              dot={{ r: 4, fill: "var(--color-value)", stroke: "var(--card)", strokeWidth: 2 }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ChartContainer>
      )}
    </ChartCard>
  )
}
