import { useCallback, useEffect, useMemo, useState } from "react"

import { CategoryTable } from "@/components/dashboard/CategoryTable"
import { CategoryBarChart } from "@/components/dashboard/charts/CategoryBarChart"
import { RatingsCard } from "@/components/dashboard/charts/RatingsCard"
import { SentimentCard } from "@/components/dashboard/charts/SentimentCard"
import { TimelineChart } from "@/components/dashboard/charts/TimelineChart"
import { VersionChart } from "@/components/dashboard/charts/VersionChart"
import { FilterBar } from "@/components/dashboard/filters/FilterBar"
import { KpiStrip } from "@/components/dashboard/KpiStrip"
import { NoResults } from "@/components/dashboard/NoResults"
import { OverviewHeader } from "@/components/dashboard/OverviewHeader"
import { ReviewsTable } from "@/components/dashboard/ReviewsTable"
import { TopBar } from "@/components/dashboard/TopBar"
import { useHashFilters } from "@/components/dashboard/use-hash-filters"
import { buildCategoryIndex } from "@/data/categories"
import { applyFilters, DEFAULT_FILTERS, previousBounds, resolveRange, type Filters } from "@/data/filters"
import { prepareReviews } from "@/data/load"
import { buildFilterOptions } from "@/data/options"
import type { AppIndexEntry, DashboardData } from "@/data/types"

interface DashboardProps {
  data: DashboardData
  apps: AppIndexEntry[] | null
  appId: string | null
  onSwitchApp: (id: string) => void
}

function toggleIn<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
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

  const patch = useCallback((fn: (f: Filters) => Partial<Filters>) => setFilters((f) => ({ ...f, ...fn(f) })), [setFilters])
  const toggleCategory = useCallback((id: string) => patch((f) => ({ categories: toggleIn(f.categories, id) })), [patch])
  const focusCategory = useCallback(
    (id: string) => patch((f) => ({ categories: f.categories.length === 1 && f.categories[0] === id ? [] : [id] })),
    [patch],
  )
  const toggleRating = useCallback(
    (n: number) => patch((f) => ({ ratings: toggleIn(f.ratings, n).sort((a, b) => a - b) })),
    [patch],
  )
  const toggleSentiment = useCallback((s: string) => patch((f) => ({ sentiments: toggleIn(f.sentiments, s) })), [patch])
  const clearAll = useCallback(() => setFilters(DEFAULT_FILTERS), [setFilters])

  return (
    <div className="min-h-screen pb-16">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
        <TopBar
          data={data}
          reviews={prepared}
          filtered={filtered}
          categories={categories}
          filters={filters}
          setFilters={setFilters}
          apps={apps}
          appId={appId}
          onSwitchApp={onSwitchApp}
        />
        <FilterBar
          filters={filters}
          setFilters={setFilters}
          options={options}
          categories={categories}
          shown={filtered.length}
          total={prepared.length}
        />
      </div>
      <main className="mx-auto max-w-[1440px] space-y-6 px-4 pt-6 sm:px-6">
        <OverviewHeader data={data} reviews={prepared} />
        <KpiStrip total={prepared.length} rows={filtered} previous={previous} bounds={bounds} categories={categories} />
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
              <TimelineChart className="lg:col-span-7" rows={filtered} categories={categories} bounds={bounds} />
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-12">
              <RatingsCard className="lg:col-span-4" rows={filtered} selected={filters.ratings} onToggle={toggleRating} />
              <SentimentCard className="lg:col-span-4" rows={filtered} selected={filters.sentiments} onToggle={toggleSentiment} />
              <VersionChart className="md:col-span-2 lg:col-span-4" rows={filtered} />
            </div>
            <CategoryTable rows={filtered} categories={categories} selected={filters.categories} onSelect={focusCategory} />
            <ReviewsTable rows={filtered} data={data} categories={categories} />
          </>
        )}
      </main>
    </div>
  )
}
