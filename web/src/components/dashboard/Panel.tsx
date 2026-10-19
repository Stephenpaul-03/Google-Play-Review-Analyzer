import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/** Content card: bg-card, 1px border, rounded-xl, at most shadow-xs. */
export function Panel({ className, children, ...props }: React.ComponentProps<"section">) {
  return (
    <section className={cn("min-w-0 rounded-xl border bg-card text-card-foreground shadow-xs", className)} {...props}>
      {children}
    </section>
  )
}

interface PanelHeaderProps {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}

export function PanelHeader({ title, description, actions, className }: PanelHeaderProps) {
  return (
    <header className={cn("flex flex-wrap items-start justify-between gap-x-4 gap-y-3 px-5 pt-5", className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-medium leading-5">{title}</h2>
        {description && <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

export function PanelBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("p-5", className)}>{children}</div>
}

/** Compact single-choice segmented control (h-7, text-xs). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  label: string
  className?: string
}) {
  return (
    <ToggleGroupPrimitive.Root
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as T)}
      aria-label={label}
      className={cn("inline-flex h-7 items-center rounded-md border bg-muted/60 p-0.5", className)}
    >
      {options.map((o) => (
        <ToggleGroupPrimitive.Item
          key={o.value}
          value={o.value}
          className="h-full rounded-[5px] px-2 text-xs font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-xs dark:data-[state=on]:bg-accent"
        >
          {o.label}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  )
}

export function EmptyNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex h-full min-h-40 items-center justify-center px-6 text-center text-sm text-muted-foreground", className)}>
      {children}
    </div>
  )
}
