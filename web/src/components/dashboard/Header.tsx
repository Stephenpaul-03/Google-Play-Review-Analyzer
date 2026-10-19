import { ExternalLink } from "lucide-react"
import { useMemo } from "react"

import { AppSwitcher } from "@/components/dashboard/AppSwitcher"
import { ExportMenu } from "@/components/dashboard/ExportMenu"
import { ModeToggle } from "@/components/theme/mode-toggle"
import { formatDate, formatInt } from "@/data/aggregate"
import type { CategoryIndex } from "@/data/categories"
import type { AppIndexEntry, DashboardData, PreparedReview } from "@/data/types"

interface HeaderProps {
  data: DashboardData
  reviews: PreparedReview[]
  filtered: PreparedReview[]
  categories: CategoryIndex
  apps: AppIndexEntry[] | null
  appId: string | null
  onSwitchApp: (id: string) => void
}

export function Header({ data, reviews, filtered, categories, apps, appId, onSwitchApp }: HeaderProps) {
  const { meta } = data
  const span = useMemo(() => {
    let min = Infinity
    let max = -Infinity
    for (const r of reviews) {
      if (Number.isNaN(r.ts)) continue
      min = Math.min(min, r.ts)
      max = Math.max(max, r.ts)
    }
    return Number.isFinite(min) ? `${formatDate(min)} to ${formatDate(max)}` : ""
  }, [reviews])

  const subline = [
    `${formatInt(reviews.length)} reviews`,
    span,
    meta.scraped_at ? `Updated ${formatDate(meta.scraped_at)}` : "",
    meta.engine,
  ].filter(Boolean)

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-4 py-5 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight break-words sm:text-2xl">{meta.app_title || meta.app_id}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="font-mono text-xs break-all">{meta.app_id}</span>
            {meta.play_url && (
              <a
                href={meta.play_url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 underline-offset-4 hover:text-foreground hover:underline"
              >
                Google Play
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            )}
          </div>
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
            {subline.map((part, i) => (
              <span key={i} className="inline-flex items-center gap-3">
                {i > 0 && <span className="h-3.5 w-px bg-border" aria-hidden="true" />}
                <span>{part}</span>
              </span>
            ))}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {apps && appId && <AppSwitcher apps={apps} value={appId} onChange={onSwitchApp} />}
          <ExportMenu data={data} reviews={reviews} filtered={filtered} categories={categories} />
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
