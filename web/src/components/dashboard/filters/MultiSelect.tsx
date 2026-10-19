import { Check, ChevronDown } from "lucide-react"
import { useState, type ReactNode } from "react"

import { Swatch } from "@/components/dashboard/Swatch"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatInt } from "@/data/aggregate"
import type { Option } from "@/data/options"
import { cn } from "@/lib/utils"

interface MultiSelectProps {
  label: string
  options: Option[]
  selected: string[]
  onChange: (next: string[]) => void
  searchable?: boolean
  footer?: ReactNode
  /** Text on the trigger when nothing is selected (defaults to the label). */
  emptyText?: string
  className?: string
}

export function MultiSelect({ label, options, selected, onChange, searchable = true, footer, emptyText, className }: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const set = new Set(selected)
  const toggle = (value: string) =>
    onChange(set.has(value) ? selected.filter((v) => v !== value) : [...selected, value])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("justify-between", className)} aria-label={`${label} filter`}>
          <span className="truncate">{selected.length === 0 && emptyText ? emptyText : label}</span>
          {selected.length > 0 && (
            <Badge variant="secondary" className="rounded-sm px-1.5 font-normal tabular-nums">
              {selected.length}
            </Badge>
          )}
          <ChevronDown className="ml-auto text-muted-foreground" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(18rem,calc(100vw-2rem))] p-0" align="start">
        <Command>
          {searchable && <CommandInput placeholder={`Search ${label.toLowerCase()}`} />}
          <CommandList className="max-h-72">
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => {
                const checked = set.has(o.value)
                return (
                  <CommandItem
                    key={o.value}
                    value={`${o.label} ${o.value}`}
                    onSelect={() => toggle(o.value)}
                    aria-checked={checked}
                    role="option"
                  >
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input",
                        checked && "border-primary bg-primary text-primary-foreground",
                      )}
                      aria-hidden="true"
                    >
                      {checked && <Check className="size-3 text-primary-foreground" />}
                    </span>
                    {o.color && <Swatch color={o.color} />}
                    <span className="truncate">{o.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground tabular-nums">{formatInt(o.count)}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
          <div className="flex items-center justify-between gap-2 border-t p-2">
            <Button variant="ghost" size="sm" onClick={() => onChange(options.map((o) => o.value))}>
              Select all
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onChange([])} disabled={!selected.length}>
              Clear
            </Button>
          </div>
          {footer && <div className="border-t p-3">{footer}</div>}
        </Command>
      </PopoverContent>
    </Popover>
  )
}
