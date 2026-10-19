import { useCallback, useEffect, useMemo, useState } from "react"

import { CategoryTable } from "@/components/dashboard/CategoryTable"
import { CategoryBarChart } from "@/components/dashboard/charts/CategoryBarChart"
import { RatingChart } from "@/components/dashboard/charts/RatingChart"
import { SentimentChart } from "@/components/dashboard/charts/SentimentChart"
import { TimelineChart } from "@/components/dashboard/charts/TimelineChart"
import { VersionChart } from "@/components/dashboard/charts/VersionChart"
import { FiltersBar } from "@/components/dashboard/filters/FiltersBar"
import { Header } from "@/components/dashboard/Header"
import { KpiCards } from "@/components/dashboard/KpiCards"
import { NoResults } from "@/components/dashboard/NoResults"
import { ReviewsTable } from "@/components/dashboard/ReviewsTable"
import { useHashFilters } from "@/components/dashboard/use-hash-filters"
import { buildCategoryIndex } from "@/data/categories"
import { applyFilters, DEFAULT_FILTERS, previousBounds, resolveRange } from "@/data/filters"
import { prepareReviews } from "@/data/load"
import { buildFilterOptions } from "@/data/options"
import type { AppIndexEntry, DashboardData } from "@/data/types"

interface DashboardProps {
  data: DashboardData
  apps: AppIndexEntry[] | null
  appId: string | null
  onSwitchApp: (id: string) => void
}

export function Dashboard({ data, apps, appId, onSwitchApp }: DashboardProps) {
  const prepared = useMemo(() => prepareReviews(data.reviews), [data])
  const categories = useMemo(() => buildCategoryIndex(data.categories, prepared), [data, prepared])
  const options = useMemo(() => buildFilterOptions(prepared, categories), [prepared, categories])
  const [filters, setFilters] = useHashFilters(appId)
  const [now] = useState(() => Date.now())

  useEffect(() => {
    document.title = `${data.meta.app_title || data.meta.app_id} reviews`
  }, [data])

  const bounds = useMemo(() => resolveRange(filters.range, now), [filters.range, now])
  const filtered = useMemo(() => applyFilters(prepared, filters, bounds), [prepared, filters, bounds])
  const previous = useMemo(
    () => (bounds ? applyFilters(prepared, filters, previousBounds(bounds)) : null),
    [prepared, filters, bounds],
  )

  const toggleCategory = useCallback(
    (id: string) =>
      setFilters((f) => ({
        ...f,
        categories: f.categories.includes(id) ? f.categories.filter((c) => c !== id) : [...f.categories, id],
      })),
    [setFilters],
  )
  const focusCategory = useCallback(
    (id: string) =>
      setFilters((f) => ({
        ...f,
        categories: f.categories.length === 1 && f.categories[0] === id ? [] : [id],
      })),
    [setFilters],
  )
  const clearAll = useCallback(() => setFilters(DEFAULT_FILTERS), [setFilters])

  return (
    <div className="min-h-screen pb-16">
      <Header
        data={data}
        reviews={prepared}
        filtered={filtered}
        categories={categories}
        apps={apps}
        appId={appId}
        onSwitchApp={onSwitchApp}
      />
      <FiltersBar
        filters={filters}
        setFilters={setFilters}
        options={options}
        categories={categories}
        shown={filtered.length}
        total={prepared.length}
      />
      <main className="mx-auto max-w-[1280px] space-y-6 px-4 pt-6 sm:px-6">
        <KpiCards rows={filtered} previous={previous} bounds={bounds} categories={categories} />
        {filtered.length === 0 ? (
          <NoResults onClear={clearAll} />
        ) : (
          <>
            <div className="grid gap-6 lg:grid-cols-12">
              <CategoryBarChart
                className="lg:col-span-5"
                rows={filtered}
                categories={categories}
                selected={filters.categories}
                onToggle={toggleCategory}
              />
              <TimelineChart className="lg:col-span-7" rows={filtered} categories={categories} />
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <RatingChart rows={filtered} />
              <SentimentChart rows={filtered} />
              <VersionChart rows={filtered} className="md:col-span-2 lg:col-span-1" />
            </div>
            <CategoryTable
              rows={filtered}
              categories={categories}
              selected={filters.categories}
              onSelect={focusCategory}
            />
            <ReviewsTable rows={filtered} data={data} categories={categories} />
          </>
        )}
      </main>
    </div>
  )
}
