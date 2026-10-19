import type { CSSProperties } from "react"

import type { ThemedColor } from "@/data/categories"
import { cn } from "@/lib/utils"

/** Small colour key for a category; picks the light or dark palette step. */
export function Swatch({ color, className }: { color: ThemedColor; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-2.5 shrink-0 rounded-[3px] bg-(--sw-l) dark:bg-(--sw-d)", className)}
      style={{ "--sw-l": color.light, "--sw-d": color.dark } as CSSProperties}
    />
  )
}
