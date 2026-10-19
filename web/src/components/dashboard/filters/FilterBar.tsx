import { SlidersHorizontal } from "lucide-react"

import { FilterPills } from "@/components/dashboard/filters/FilterPills"
import { activeFilterCount, clearFilters } from "@/components/dashboard/filters/pill-values"
import { rangeLabel } from "@/components/dashboard/filters/range-label"
import { SearchInput } from "@/components/dashboard/filters/SearchInput"
import type { SetFilters } from "@/components/dashboard/use-hash-filters"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { formatInt } from "@/data/aggregate"
import type { CategoryIndex } from "@/data/categories"
import { isDefaultFilters, type Filters } from "@/data/filters"
import type { FilterOptions } from "@/data/options"

interface FilterBarProps {
  filters: Filters
  setFilters: SetFilters
  options: FilterOptions
  categories: CategoryIndex
  shown: number
  total: number
}

export function FilterBar({ filters, setFilters, options, categories, shown, total }: FilterBarProps) {
  const anyActive = !isDefaultFilters(filters)
  const count = activeFilterCount(filters)
  const summary = (
    <span className="text-xs whitespace-nowrap text-muted-foreground" aria-live="polite" data-showing>
      Showing <span className="font-medium text-foreground">{formatInt(shown)}</span> of {formatInt(total)} reviews
    </span>
  )
  const clear = anyActive && (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
      onClick={() => setFilters(clearFilters())}
      data-clear
    >
      Clear
    </Button>
  )

  return (
    <div className="border-b">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-4 py-2.5 sm:px-6 lg:flex-row lg:items-start lg:gap-3">
        <div className="flex items-center gap-2 lg:contents">
          <SearchInput
            value={filters.q}
            onChange={(q) => setFilters((f) => ({ ...f, q }))}
            className="min-w-0 flex-1 lg:w-56 lg:flex-none"
          />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2.5 text-xs lg:hidden" aria-label="All filters">
                <SlidersHorizontal className="size-3.5 text-muted-foreground" aria-hidden="true" />
                Filters
                {count > 0 && (
                  <span className="ml-0.5 rounded-sm bg-foreground px-1 text-[10px] font-semibold leading-4 text-background">
                    {count}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(22rem,100vw)] gap-0 overflow-y-auto bg-card p-0">
              <SheetHeader className="border-b p-5">
                <SheetTitle className="text-sm">Filters</SheetTitle>
                <SheetDescription className="text-xs">
                  {formatInt(shown)} of {formatInt(total)} reviews match.
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 p-5">
                <FilterPills
                  filters={filters}
                  setFilters={setFilters}
                  options={options}
                  categories={categories}
                  block
                  idPrefix="sheet"
                />
                {anyActive && (
                  <Button variant="outline" size="sm" className="h-8 w-full text-xs" onClick={() => setFilters(clearFilters())}>
                    Clear all filters
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
        <div className="hidden min-w-0 flex-1 lg:block">
          <FilterPills filters={filters} setFilters={setFilters} options={options} categories={categories} idPrefix="bar" />
        </div>
        <div className="flex items-center justify-between gap-2 lg:h-8 lg:justify-end">
          <span className="truncate text-xs text-muted-foreground lg:hidden">{rangeLabel(filters.range)}</span>
          <div className="flex items-center gap-1">
            {summary}
            {clear}
          </div>
        </div>
      </div>
    </div>
  )
}
