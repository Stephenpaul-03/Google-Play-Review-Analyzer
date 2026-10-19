import { Search, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  delay?: number
  className?: string
}

function isTyping(el: Element | null): boolean {
  if (!el) return false
  const tag = el.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (el as HTMLElement).isContentEditable
}

/**
 * Debounced search box. "/" focuses it from anywhere, Esc clears it.
 * External resets ("Clear") flow back in.
 */
export function SearchInput({ value, onChange, delay = 250, className }: SearchInputProps) {
  const [text, setText] = useState(value)
  const [synced, setSynced] = useState(value)
  const timer = useRef<number | undefined>(undefined)
  const input = useRef<HTMLInputElement>(null)

  if (value !== synced) {
    setSynced(value)
    setText(value)
  }

  useEffect(() => () => window.clearTimeout(timer.current), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || isTyping(document.activeElement)) return
      if (document.querySelector("[role=dialog]")) return
      e.preventDefault()
      input.current?.focus()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const update = (next: string) => {
    setText(next)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => onChange(next), delay)
  }
  const clear = () => {
    window.clearTimeout(timer.current)
    setText("")
    onChange("")
  }

  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        ref={input}
        type="search"
        value={text}
        onChange={(e) => update(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault()
            if (text) clear()
            else input.current?.blur()
          }
        }}
        placeholder="Search reviews"
        title="Searches review text, summaries and user names"
        aria-label="Search reviews"
        aria-keyshortcuts="/"
        className="h-8 w-full rounded-md border bg-card pr-8 pl-8 text-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 dark:bg-transparent [&::-webkit-search-cancel-button]:hidden"
      />
      {text ? (
        <button
          type="button"
          onClick={clear}
          className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="size-3" aria-hidden="true" />
        </button>
      ) : (
        <kbd
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-2 flex h-5 min-w-5 -translate-y-1/2 items-center justify-center rounded border bg-muted px-1 font-sans text-[10px] font-medium text-muted-foreground"
        >
          /
        </kbd>
      )}
    </div>
  )
}
