import { X } from "lucide-react"

import { buildChips } from "@/components/dashboard/filters/chips"
import type { SetFilters } from "@/components/dashboard/use-hash-filters"
import { Button } from "@/components/ui/button"
import type { CategoryIndex } from "@/data/categories"
import { DEFAULT_FILTERS, type Filters } from "@/data/filters"

interface ActiveFilterChipsProps {
  filters: Filters
  setFilters: SetFilters
  categories: CategoryIndex
}

export function ActiveFilterChips({ filters, setFilters, categories }: ActiveFilterChipsProps) {
  const chips = buildChips(filters, categories)
  if (!chips.length) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Active filters">
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="inline-flex max-w-full items-center gap-1 rounded-md border bg-secondary py-0.5 pr-1 pl-2 text-xs text-secondary-foreground"
        >
          <span className="truncate">{chip.label}</span>
          <button
            type="button"
            onClick={() => setFilters(chip.remove)}
            className="rounded-sm p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
            aria-label={`Remove filter ${chip.label}`}
          >
            <X className="size-3" aria-hidden="true" />
          </button>
        </span>
      ))}
      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setFilters(DEFAULT_FILTERS)}>
        Clear all
      </Button>
    </div>
  )
}
