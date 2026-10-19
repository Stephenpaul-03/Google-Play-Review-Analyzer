import type { ReactNode } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

interface ChartCardProps {
  title: string
  description?: ReactNode
  actions?: ReactNode
  className?: string
  children: ReactNode
}

export function ChartCard({ title, description, actions, className, children }: ChartCardProps) {
  return (
    <Card className={cn("min-w-0 gap-4", className)}>
      <CardHeader className="flex flex-wrap items-start justify-between gap-2 px-4 sm:px-6">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          {description && <CardDescription className="text-xs">{description}</CardDescription>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </CardHeader>
      <CardContent className="px-2 sm:px-4">{children}</CardContent>
    </Card>
  )
}

/** Compact single-choice switch used in chart headers. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  label: string
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={value}
      onValueChange={(v) => v && onChange(v as T)}
      aria-label={label}
    >
      {options.map((o) => (
        <ToggleGroupItem key={o.value} value={o.value} className="px-2.5 text-xs">
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

export function ChartEmpty({ children }: { children: ReactNode }) {
  return <div className="flex h-48 items-center justify-center px-4 text-center text-sm text-muted-foreground">{children}</div>
}
