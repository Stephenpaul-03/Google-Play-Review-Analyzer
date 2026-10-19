import { Check } from "lucide-react"
import type { ReactNode } from "react"

import { Swatch } from "@/components/dashboard/Swatch"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { formatInt } from "@/data/aggregate"
import type { Option } from "@/data/options"
import { cn } from "@/lib/utils"

function CheckBox({ checked, round }: { checked: boolean; round?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-3.5 shrink-0 items-center justify-center border border-input",
        round ? "rounded-full" : "rounded-[4px]",
        checked && "border-primary bg-primary text-primary-foreground",
      )}
    >
      {checked && (round ? <span className="size-1.5 rounded-full bg-primary-foreground" /> : <Check className="size-2.5" />)}
    </span>
  )
}

interface OptionListProps {
  options: Option[]
  selected: string[]
  onChange: (next: string[]) => void
  searchPlaceholder?: string
  footer?: ReactNode
}

/** Multi-select list (checkboxes, optional search, counts). */
export function OptionList({ options, selected, onChange, searchPlaceholder, footer }: OptionListProps) {
  const set = new Set(selected)
  const toggle = (v: string) => onChange(set.has(v) ? selected.filter((x) => x !== v) : [...selected, v])
  return (
    <Command>
      {searchPlaceholder && <CommandInput placeholder={searchPlaceholder} className="h-9 text-xs" />}
      <CommandList className="max-h-72">
        <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">No matches.</CommandEmpty>
        <CommandGroup>
          {options.map((o) => (
            <CommandItem
              key={o.value}
              value={`${o.label} ${o.value}`}
              onSelect={() => toggle(o.value)}
              data-option={o.value}
              className="gap-2 text-xs"
            >
              <CheckBox checked={set.has(o.value)} />
              {o.color && <Swatch color={o.color} />}
              <span className="truncate">{o.label}</span>
              <span className="ml-auto pl-2 text-muted-foreground">{formatInt(o.count)}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
      <div className="flex items-center justify-between border-t px-1.5 py-1">
        <button
          type="button"
          className="rounded px-1.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={() => onChange(options.map((o) => o.value))}
        >
          Select all
        </button>
        <button
          type="button"
          className="rounded px-1.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
          onClick={() => onChange([])}
          disabled={!selected.length}
        >
          Clear
        </button>
      </div>
      {footer && <div className="border-t p-3">{footer}</div>}
    </Command>
  )
}

interface ChoiceListProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}

/** Single-choice list (radio style). */
export function ChoiceList<T extends string>({ options, value, onChange }: ChoiceListProps<T>) {
  return (
    <div role="radiogroup" className="p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs outline-none hover:bg-accent focus-visible:bg-accent"
        >
          <CheckBox checked={o.value === value} round />
          {o.label}
        </button>
      ))}
    </div>
  )
}
