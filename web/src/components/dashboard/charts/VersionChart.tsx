import { useMemo, useState } from "react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import { ChartTip } from "@/components/dashboard/charts/ChartTip"
import { primarySeries, tipRows } from "@/components/dashboard/charts/config"
import { EmptyNote, Panel, PanelBody, PanelHeader, Segmented } from "@/components/dashboard/Panel"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { formatInt, versionRatings } from "@/data/aggregate"
import type { PreparedReview } from "@/data/types"
import { cn } from "@/lib/utils"

const config = primarySeries("Average rating")

interface Props {
  rows: PreparedReview[]
  className?: string
}

export function VersionChart({ rows, className }: Props) {
  const [lastN, setLastN] = useState<"5" | "10" | "20">("10")
  const [minReviews, setMinReviews] = useState<"5" | "10" | "25">("5")
  const data = useMemo(
    () => versionRatings(rows, Number(lastN), Number(minReviews)).map((d) => ({ ...d, value: d.avg })),
    [rows, lastN, minReviews],
  )
  const rotate = data.length > 7

  return (
    <Panel className={cn("flex flex-col", className)}>
      <PanelHeader
        title="Rating by app version"
        description={`Average rating, last ${lastN} versions with ${minReviews}+ reviews.`}
        actions={
          <>
            <span className="text-[11px] text-muted-foreground">Last</span>
            <Segmented
              label="Versions shown"
              value={lastN}
              onChange={setLastN}
              options={[
                { value: "5", label: "5" },
                { value: "10", label: "10" },
                { value: "20", label: "20" },
              ]}
            />
            <span className="ml-1 text-[11px] text-muted-foreground">Min reviews</span>
            <Segmented
              label="Minimum reviews"
              value={minReviews}
              onChange={setMinReviews}
              options={[
                { value: "5", label: "5" },
                { value: "10", label: "10" },
                { value: "25", label: "25" },
              ]}
            />
          </>
        }
      />
      <PanelBody className="flex flex-1 flex-col pt-4">
        {data.length === 0 ? (
          <EmptyNote>No app version has {minReviews} or more reviews in the current view.</EmptyNote>
        ) : (
          <ChartContainer config={config} className="aspect-auto h-[216px] w-full" data-chart-name="version">
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 4" />
              <XAxis
                dataKey="version"
                tickLine={false}
                axisLine={false}
                interval={0}
                fontSize={11}
                tickMargin={8}
                angle={rotate ? -40 : 0}
                textAnchor={rotate ? "end" : "middle"}
                height={rotate ? 44 : 24}
                className="font-mono"
              />
              <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tickLine={false} axisLine={false} width={24} fontSize={11} tickMargin={6} />
              <ChartTooltip
                cursor={{ stroke: "var(--ring)", strokeWidth: 1, strokeDasharray: "3 3" }}
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
                stroke="var(--bar)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--bar)", stroke: "var(--card)", strokeWidth: 2 }}
                activeDot={{ r: 4, fill: "var(--foreground)", stroke: "var(--card)", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ChartContainer>
        )}
      </PanelBody>
    </Panel>
  )
}
