import type { ReactNode } from "react"

import { Swatch } from "@/components/dashboard/Swatch"
import type { ThemedColor } from "@/data/categories"

export interface TipLine {
  label: ReactNode
  value: ReactNode
  color?: ThemedColor
}

/** The one tooltip used by every chart: small card, text in text colours, colour only in the dot. */
export function ChartTip({ title, lines, footer }: { title: ReactNode; lines: TipLine[]; footer?: ReactNode }) {
  return (
    <div className="min-w-40 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg shadow-black/5">
      <div className="mb-1.5 font-medium">{title}</div>
      <div className="space-y-1">
        {lines.map((l, i) => (
          <div key={i} className="flex items-center gap-2">
            {l.color && <Swatch color={l.color} />}
            <span className="truncate text-muted-foreground">{l.label}</span>
            <span className="ml-auto pl-4 font-medium">{l.value}</span>
          </div>
        ))}
      </div>
      {footer && <div className="mt-1.5 border-t pt-1.5 text-muted-foreground">{footer}</div>}
    </div>
  )
}
