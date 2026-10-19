import { CalendarDays, ChevronDown } from "lucide-react"
import { useState } from "react"
import type { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { rangeLabel } from "@/components/dashboard/filters/range-label"
import { RANGE_PRESETS, type DateRangeFilter } from "@/data/filters"
import { cn } from "@/lib/utils"

interface DateRangePickerProps {
  value: DateRangeFilter
  onChange: (next: DateRangeFilter) => void
  className?: string
}

const pad = (n: number) => String(n).padStart(2, "0")
/** Calendar days are local Date objects; the filter stores them as UTC day strings. */
const toDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const fromDay = (s: string) => {
  const [y, m, d] = s.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function toDraft(value: DateRangeFilter): DateRange | undefined {
  return value.preset === "custom" ? { from: fromDay(value.from), to: fromDay(value.to) } : undefined
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<DateRange | undefined>(() => toDraft(value))
  const onOpenChange = (next: boolean) => {
    if (next) setDraft(toDraft(value))
    setOpen(next)
  }

  const applyDraft = () => {
    if (!draft?.from) return
    onChange({ preset: "custom", from: toDay(draft.from), to: toDay(draft.to ?? draft.from) })
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("justify-start", className)} aria-label="Date range">
          <CalendarDays className="text-muted-foreground" aria-hidden="true" />
          <span className="truncate">{rangeLabel(value)}</span>
          <ChevronDown className="ml-auto text-muted-foreground" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-[calc(100vw-1rem)] p-0" align="start">
        <div className="flex flex-col sm:flex-row">
          <div className="grid grid-cols-2 gap-1 border-b p-2 sm:flex sm:flex-col sm:border-r sm:border-b-0">
            {RANGE_PRESETS.map((p) => (
              <Button
                key={p.value}
                variant={value.preset === p.value ? "secondary" : "ghost"}
                size="sm"
                className="justify-start"
                onClick={() => {
                  onChange({ preset: p.value })
                  setOpen(false)
                }}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="p-1">
            <Calendar
              mode="range"
              selected={draft}
              onSelect={setDraft}
              defaultMonth={draft?.from}
              numberOfMonths={1}
              disabled={{ after: new Date() }}
            />
            <div className="flex items-center justify-between gap-2 border-t px-2 pt-2 pb-1">
              <span className="text-xs text-muted-foreground">
                {draft?.from ? `${toDay(draft.from)} to ${toDay(draft.to ?? draft.from)}` : "Pick a start and end day"}
              </span>
              <Button size="sm" onClick={applyDraft} disabled={!draft?.from}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
