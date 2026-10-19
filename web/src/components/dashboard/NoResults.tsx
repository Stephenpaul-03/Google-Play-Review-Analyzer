import { SearchX } from "lucide-react"

import { Panel } from "@/components/dashboard/Panel"
import { Button } from "@/components/ui/button"

export function NoResults({ onClear }: { onClear: () => void }) {
  return (
    <Panel className="flex flex-col items-center px-6 py-20 text-center" data-empty>
      <div className="mb-4 flex size-10 items-center justify-center rounded-lg border bg-muted/50">
        <SearchX className="size-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <h3 className="text-sm font-semibold">No reviews match these filters</h3>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">Remove a filter, clear the search or widen the date range.</p>
      <Button variant="outline" size="sm" className="mt-5 h-8 text-xs" onClick={onClear}>
        Clear filters
      </Button>
    </Panel>
  )
}
