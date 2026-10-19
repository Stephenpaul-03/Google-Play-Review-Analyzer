import { ChevronDown, Download, Loader2 } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatInt } from "@/data/aggregate"
import type { CategoryIndex } from "@/data/categories"
import type { DashboardData, PreparedReview } from "@/data/types"
import { downloadWorkbook, exportFileName } from "@/lib/excel"

interface ExportMenuProps {
  data: DashboardData
  reviews: PreparedReview[]
  filtered: PreparedReview[]
  categories: CategoryIndex
}

export function ExportMenu({ data, reviews, filtered, categories }: ExportMenuProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const run = async (scope: "all" | "filtered") => {
    setBusy(true)
    setError("")
    try {
      await downloadWorkbook(
        {
          data,
          categories,
          reviews: scope === "all" ? data.reviews : filtered,
          recomputeSummary: scope === "filtered",
        },
        exportFileName(data.meta.app_id || "app"),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={busy} title={error ? `Export failed: ${error}` : undefined}>
          {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />}
          {error ? "Export failed" : "Export"}
          <ChevronDown className="text-muted-foreground" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Export to Excel</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void run("all")} data-export="all">
          All reviews
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">{formatInt(reviews.length)}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void run("filtered")} data-export="filtered">
          Filtered reviews ({formatInt(filtered.length)})
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
