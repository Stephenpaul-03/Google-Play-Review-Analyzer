import { useMemo } from "react"

import { cn } from "@/lib/utils"

/** Tiny trend line: no axes, 1.5px stroke, muted colour. */
interface SparklineProps {
  values: number[]
  label: string
  /** y domain; defaults to [0, max] so the line never exaggerates small changes. */
  domain?: [number, number]
  className?: string
}

export function Sparkline({ values, className, label, domain }: SparklineProps) {
  const path = useMemo(() => {
    if (values.length < 2) return ""
    const w = 100
    const h = 24
    const min = domain ? domain[0] : 0
    let max = domain ? domain[1] : -Infinity
    if (!domain) for (const v of values) if (v > max) max = v
    const range = max - min || 1
    return values
      .map((v, i) => {
        const x = (i / (values.length - 1)) * w
        const y = h - 2 - ((v - min) / range) * (h - 4)
        return `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`
      })
      .join(" ")
  }, [values, domain])

  if (!path) return <div className={cn("h-6 w-24", className)} aria-hidden="true" />
  return (
    <svg
      viewBox="0 0 100 24"
      preserveAspectRatio="none"
      className={cn("h-6 w-24 overflow-visible text-subtle-foreground", className)}
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      <path d={path} fill="none" stroke="currentColor" strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
