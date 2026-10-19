import { ChevronDown, X } from "lucide-react"
import { useState, type ReactNode } from "react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface FilterPillProps {
  label: string
  /** Current value shown after the label; empty = filter not active. */
  value: string
  onClear: () => void
  children: ReactNode
  contentClassName?: string
  /** Full-width variant used inside the mobile filters sheet. */
  block?: boolean
}

/** Compact h-8 pill that shows its value ("Rating: 1-2") and opens a popover. */
export function FilterPill({ label, value, onClear, children, contentClassName, block }: FilterPillProps) {
  const [open, setOpen] = useState(false)
  const active = value !== ""
  return (
    <div
      className={cn(
        "inline-flex h-8 min-w-0 items-stretch rounded-md border text-xs transition-colors",
        active ? "border-border bg-accent text-foreground" : "bg-card text-muted-foreground dark:bg-transparent",
        block && "flex w-full",
      )}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`${label} filter${active ? `: ${value}` : ""}`}
            data-filter={label}
            className={cn(
              "inline-flex min-w-0 flex-1 items-center gap-1 rounded-md px-2.5 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50",
              active && "rounded-r-none pr-1.5",
              !active && "hover:bg-accent",
            )}
          >
            <span className={cn("shrink-0", active && "text-muted-foreground")}>{active ? `${label}:` : label}</span>
            {active && <span className="truncate font-medium">{value}</span>}
            {!active && <ChevronDown className="ml-auto size-3.5 shrink-0 opacity-70" aria-hidden="true" />}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className={cn("w-64 p-0", contentClassName)}>
          {children}
        </PopoverContent>
      </Popover>
      {active && (
        <button
          type="button"
          onClick={onClear}
          aria-label={`Clear ${label} filter`}
          className="inline-flex w-7 shrink-0 items-center justify-center rounded-r-md border-l border-border/70 text-muted-foreground outline-none hover:bg-background/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <X className="size-3" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
