import { ExternalLink } from "lucide-react"

import { AppSwitcher } from "@/components/dashboard/AppSwitcher"
import { ExportMenu } from "@/components/dashboard/ExportMenu"
import { DateRangePicker } from "@/components/dashboard/filters/DateRangePicker"
import type { SetFilters } from "@/components/dashboard/use-hash-filters"
import { ModeToggle } from "@/components/theme/mode-toggle"
import type { CategoryIndex } from "@/data/categories"
import type { Filters } from "@/data/filters"
import type { AppIndexEntry, DashboardData, PreparedReview } from "@/data/types"

interface TopBarProps {
  data: DashboardData
  reviews: PreparedReview[]
  filtered: PreparedReview[]
  categories: CategoryIndex
  filters: Filters
  setFilters: SetFilters
  apps: AppIndexEntry[] | null
  appId: string | null
  onSwitchApp: (id: string) => void
}

function initials(title: string): string {
  const words = title.split(/[^\p{L}\p{N}]+/u).filter(Boolean)
  const letters = words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2)
  return letters.toUpperCase()
}

export function TopBar({ data, reviews, filtered, categories, filters, setFilters, apps, appId, onSwitchApp }: TopBarProps) {
  const { meta } = data
  const title = meta.app_title || meta.app_id
  return (
    <div className="border-b">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-3 px-4 sm:px-6">
        <div
          aria-hidden="true"
          className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted text-[11px] font-semibold tracking-tight text-muted-foreground"
        >
          {initials(title)}
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {apps && appId ? (
            <AppSwitcher apps={apps} value={appId} title={title} onChange={onSwitchApp} />
          ) : (
            <h1 className="truncate text-sm font-semibold">{title}</h1>
          )}
          <span className="hidden truncate font-mono text-xs text-muted-foreground md:inline">{meta.app_id}</span>
          {meta.play_url && (
            <a
              href={meta.play_url}
              target="_blank"
              rel="noreferrer noopener"
              className="hidden shrink-0 rounded-sm p-0.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 md:inline-flex"
              aria-label="Open on Google Play"
              title="Open on Google Play"
            >
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <DateRangePicker value={filters.range} onChange={(range) => setFilters((f) => ({ ...f, range }))} />
          <ExportMenu data={data} reviews={reviews} filtered={filtered} categories={categories} />
          <ModeToggle />
        </div>
      </div>
    </div>
  )
}
