import { useMemo, useState } from "react"
import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts"

import { ChartTip } from "@/components/dashboard/charts/ChartTip"
import { categoryChartConfig, tipRows } from "@/components/dashboard/charts/config"
import { EmptyNote, Panel, PanelBody, PanelHeader, Segmented } from "@/components/dashboard/Panel"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { complaintsByCategory, formatInt, formatPct } from "@/data/aggregate"
import type { CategoryIndex } from "@/data/categories"
import type { PreparedReview } from "@/data/types"
import { UNCLASSIFIED } from "@/data/types"

type Metric = "count" | "share"
const ROW = 28

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
}

interface TickProps {
  x?: number | string
  y?: number | string
  index?: number
  payload?: { value?: unknown; index?: number }
}

export function CategoryBarChart({ rows, categories, selected, onToggle, className }: Props) {
  const [metric, setMetric] = useState<Metric>("count")
  const [hover, setHover] = useState<string | null>(null)
  const base = useMemo(() => complaintsByCategory(rows, categories), [rows, categories])
  const data = useMemo<Datum[]>(() => {
    const sel = new Set(selected)
    return base.map((c) => {
      const info = categories.get(c.id)
      const lit = c.id === hover || sel.has(c.id)
      return { ...c, key: info.key, label: info.label, fill: lit ? `var(--color-${info.key})` : "var(--bar)" }
    })
  }, [base, categories, selected, hover])
  const config = useMemo(() => categoryChartConfig(base.map((d) => categories.get(d.id))), [base, categories])

  // Reserve room for every category so filtering never shifts the layout.
  const maxRows = categories.list.filter((c) => c.id !== UNCLASSIFIED).length
  const labelWidth = Math.min(210, Math.max(110, Math.max(0, ...categories.list.map((c) => c.label.length)) * 6.6 + 26))

  const Tick = ({ y = 0, index, payload }: TickProps) => {
    const d = data[index ?? payload?.index ?? -1]
    if (!d) return null
    const info = categories.get(d.id)
    return (
      <g transform={`translate(2,${Number(y)})`} className="cursor-pointer" onClick={() => onToggle(d.id)}>
        <circle cx={4} cy={0} r={3.5} className="fill-(--sw-l) dark:fill-(--sw-d)" style={{ ["--sw-l" as string]: info.color.light, ["--sw-d" as string]: info.color.dark }} />
        <text x={14} y={0} dy={4} fontSize={12} className="fill-muted-foreground">
          {d.label}
        </text>
      </g>
    )
  }

  return (
    <Panel className={className}>
      <PanelHeader
        title="Complaints by category"
        description="Primary category of each complaint. Click a bar to filter."
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
      />
      <PanelBody className="pt-4">
        <div style={{ minHeight: maxRows * ROW }}>
          {data.length === 0 ? (
            <EmptyNote>No complaints match the current filters.</EmptyNote>
          ) : (
            <ChartContainer config={config} className="aspect-auto w-full" style={{ height: data.length * ROW }} data-chart-name="category">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 0, right: 44, bottom: 0, left: 0 }}
                barCategoryGap={8}
                onMouseMove={(s) => {
                  const i = Number(s?.activeTooltipIndex)
                  setHover(Number.isInteger(i) ? (base[i]?.id ?? null) : null)
                }}
                onMouseLeave={() => setHover(null)}
                onClick={(s) => {
                  const i = Number(s?.activeTooltipIndex ?? s?.activeIndex)
                  const d = Number.isInteger(i) ? base[i] : undefined
                  if (d) onToggle(d.id)
                }}
                className="[&_.recharts-surface]:cursor-pointer"
              >
                <XAxis type="number" dataKey={metric} hide domain={[0, "dataMax"]} />
                <YAxis type="category" dataKey="label" width={labelWidth} interval={0} tickLine={false} axisLine={false} tick={<Tick />} />
                <ChartTooltip
                  cursor={false}
                  content={({ active, payload }) => {
                    const d = tipRows<Datum>(payload)[0]?.payload
                    if (!active || !d) return null
                    return (
                      <ChartTip
                        title={d.label}
                        lines={[
                          { label: "Complaints", value: formatInt(d.count), color: categories.get(d.id).color },
                          { label: "Share of complaints", value: formatPct(d.share) },
                        ]}
                        footer={selected.includes(d.id) ? "Click to remove filter" : "Click to filter"}
                      />
                    )
                  }}
                />
                <Bar dataKey={metric} radius={4} maxBarSize={14} isAnimationActive={false}>
                  <LabelList
                    dataKey={metric}
                    position="right"
                    offset={8}
                    className="fill-muted-foreground"
                    fontSize={11}
                    formatter={(v: unknown) => (metric === "share" ? formatPct(Number(v)) : formatInt(Number(v)))}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
        </div>
      </PanelBody>
    </Panel>
  )
}
