import { SlidersHorizontal } from "lucide-react"

import { ActiveFilterChips } from "@/components/dashboard/filters/ActiveFilterChips"
import { buildChips } from "@/components/dashboard/filters/chips"
import { DateRangePicker } from "@/components/dashboard/filters/DateRangePicker"
import { FilterControls } from "@/components/dashboard/filters/FilterControls"
import { SearchInput } from "@/components/dashboard/filters/SearchInput"
import type { SetFilters } from "@/components/dashboard/use-hash-filters"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { formatInt } from "@/data/aggregate"
import type { CategoryIndex } from "@/data/categories"
import type { Filters } from "@/data/filters"
import type { FilterOptions } from "@/data/options"

interface FiltersBarProps {
  filters: Filters
  setFilters: SetFilters
  options: FilterOptions
  categories: CategoryIndex
  shown: number
  total: number
}

export function FiltersBar({ filters, setFilters, options, categories, shown, total }: FiltersBarProps) {
  const active = buildChips(filters, categories).filter((c) => c.id !== "range" && c.id !== "q").length

  return (
    <div className="z-30 border-b md:sticky md:top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto max-w-[1280px] space-y-2 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={filters.q}
            onChange={(q) => setFilters((f) => ({ ...f, q }))}
            className="w-full sm:w-64"
          />
          <DateRangePicker
            value={filters.range}
            onChange={(range) => setFilters((f) => ({ ...f, range }))}
            className="min-w-0 flex-1 sm:flex-none"
          />
          <div className="hidden lg:contents">
            <FilterControls filters={filters} setFilters={setFilters} options={options} layout="inline" />
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden" aria-label="All filters">
                <SlidersHorizontal aria-hidden="true" />
                Filters
                {active > 0 && (
                  <Badge variant="secondary" className="rounded-sm px-1.5 font-normal tabular-nums">
                    {active}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(22rem,100vw)] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription>
                  {formatInt(shown)} of {formatInt(total)} reviews match.
                </SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-6">
                <FilterControls filters={filters} setFilters={setFilters} options={options} layout="stacked" />
              </div>
            </SheetContent>
          </Sheet>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
            {shown === total ? `All ${formatInt(total)} reviews` : `${formatInt(shown)} of ${formatInt(total)} reviews`}
          </span>
          <ActiveFilterChips filters={filters} setFilters={setFilters} categories={categories} />
        </div>
      </div>
    </div>
  )
}
