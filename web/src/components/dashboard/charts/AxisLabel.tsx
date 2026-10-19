interface AxisLabelProps {
  x?: number | string
  y?: number | string
  payload?: { value?: unknown }
  maxChars?: number
}

/** Single-line Y-axis category label, truncated with the full name as a tooltip. */
export function AxisLabel({ x = 0, y = 0, payload, maxChars = 20 }: AxisLabelProps) {
  const full = String(payload?.value ?? "")
  const text = full.length > maxChars ? `${full.slice(0, maxChars - 1)}…` : full
  return (
    <text x={Number(x)} y={Number(y)} dy={4} textAnchor="end" fontSize={12} className="fill-muted-foreground">
      <title>{full}</title>
      {text}
    </text>
  )
}
