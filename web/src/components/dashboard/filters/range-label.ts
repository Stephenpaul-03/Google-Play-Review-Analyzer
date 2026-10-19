import { formatDate } from "@/data/aggregate"
import { RANGE_PRESETS, type DateRangeFilter } from "@/data/filters"

export function rangeLabel(value: DateRangeFilter): string {
  if (value.preset === "custom") {
    const from = formatDate(`${value.from}T00:00:00Z`)
    const to = formatDate(`${value.to}T00:00:00Z`)
    return from === to ? from : `${from} to ${to}`
  }
  return RANGE_PRESETS.find((p) => p.value === value.preset)?.label ?? "All time"
}
