import { Search, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  delay?: number
  className?: string
}

/** Debounced search box. External resets (chips, "Clear all") flow back in. */
export function SearchInput({ value, onChange, delay = 250, className }: SearchInputProps) {
  const [text, setText] = useState(value)
  const [synced, setSynced] = useState(value)
  const timer = useRef<number | undefined>(undefined)

  if (value !== synced) {
    setSynced(value)
    setText(value)
  }

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const update = (next: string) => {
    setText(next)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => onChange(next), delay)
  }

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        type="search"
        value={text}
        onChange={(e) => update(e.target.value)}
        placeholder="Search reviews"
        title="Searches review text, summaries and user names"
        aria-label="Search reviews"
        className="pr-8 pl-8 [&::-webkit-search-cancel-button]:hidden"
      />
      {text && (
        <button
          type="button"
          onClick={() => {
            window.clearTimeout(timer.current)
            setText("")
            onChange("")
          }}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
