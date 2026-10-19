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
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          title={error ? `Export failed: ${error}` : "Export to Excel"}
          aria-label="Export"
          className="h-8 gap-1.5 px-2.5 text-xs max-sm:size-8 max-sm:px-0"
        >
          {busy ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="size-3.5 text-muted-foreground" aria-hidden="true" />
          )}
          <span className="max-sm:hidden">{error ? "Export failed" : "Export"}</span>
          <ChevronDown className="size-3.5 text-muted-foreground max-sm:hidden" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground">Export to Excel</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void run("all")} data-export="all" className="text-xs">
          All reviews
          <span className="ml-auto text-muted-foreground">{formatInt(reviews.length)}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void run("filtered")} data-export="filtered" className="text-xs">
          Filtered reviews ({formatInt(filtered.length)})
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
