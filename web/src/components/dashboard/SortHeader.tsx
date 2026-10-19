import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"

interface SortHeaderProps {
  label: string
  active: boolean
  dir: "asc" | "desc"
  onClick: () => void
  align?: "left" | "right"
  sortKey: string
}

/** Table header button with a subtle sort indicator. */
export function SortHeader({ label, active, dir, onClick, align = "left", sortKey }: SortHeaderProps) {
  const Icon = !active ? ChevronsUpDown : dir === "asc" ? ArrowUp : ArrowDown
  return (
    <button
      type="button"
      onClick={onClick}
      data-sort={sortKey}
      aria-label={`Sort by ${label}`}
      className={cn(
        "group inline-flex items-center gap-1 rounded-sm text-xs font-medium whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        align === "right" && "flex-row-reverse",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      <Icon
        className={cn("size-3 shrink-0", active ? "opacity-80" : "opacity-0 group-hover:opacity-50 group-focus-visible:opacity-50")}
        aria-hidden="true"
      />
    </button>
  )
}
