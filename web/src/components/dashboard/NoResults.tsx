import { SearchX } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function NoResults({ onClear }: { onClear: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <SearchX className="size-8 text-muted-foreground" aria-hidden="true" />
        <div>
          <div className="font-medium">No reviews match these filters</div>
          <p className="mt-1 text-sm text-muted-foreground">Remove a filter or widen the date range.</p>
        </div>
        <Button variant="outline" onClick={onClear}>
          Clear all filters
        </Button>
      </CardContent>
    </Card>
  )
}
