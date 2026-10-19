import type { ReactNode } from "react"

export interface TipLine {
  label: ReactNode
  value: ReactNode
  swatch?: ReactNode
}

/** Tooltip body shared by all charts (text uses text tokens, never series colours). */
export function ChartTip({ title, lines }: { title: ReactNode; lines: TipLine[] }) {
  return (
    <div className="grid min-w-[9rem] gap-1.5 rounded-lg border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-xl">
      <div className="font-medium">{title}</div>
      {lines.map((l, i) => (
        <div key={i} className="flex items-center gap-2">
          {l.swatch}
          <span className="text-muted-foreground">{l.label}</span>
          <span className="ml-auto pl-3 font-mono font-medium tabular-nums">{l.value}</span>
        </div>
      ))}
    </div>
  )
}
