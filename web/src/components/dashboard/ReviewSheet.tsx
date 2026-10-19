import { Check, ChevronDown, ChevronUp, Copy, ExternalLink, Star } from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"

import { Swatch } from "@/components/dashboard/Swatch"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { formatDateTime, formatInt, sentimentLabel } from "@/data/aggregate"
import { sentimentColor, type CategoryIndex } from "@/data/categories"
import type { DashboardData, PreparedReview } from "@/data/types"
import { cn } from "@/lib/utils"

interface Props {
  review: PreparedReview | null
  index: number
  total: number
  data: DashboardData
  categories: CategoryIndex
  onClose: () => void
  onMove: (delta: number) => void
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement("textarea")
    ta.value = text
    ta.style.position = "fixed"
    ta.style.opacity = "0"
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand("copy")
    ta.remove()
    return ok
  }
}

/** Right-side detail panel for one review, with j/k (or arrows) to move through the list. */
export function ReviewSheet({ review, index, total, data, categories, onClose, onMove }: Props) {
  const open = review !== null
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault()
        onMove(1)
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault()
        onMove(-1)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onMove])

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full gap-0 bg-card p-0 outline-none sm:max-w-xl"
        data-review-sheet
        onOpenAutoFocus={(e) => {
          // Focus the panel itself (keyboard j/k works) instead of ringing the first button.
          e.preventDefault()
          ;(e.currentTarget as HTMLElement | null)?.focus()
        }}
      >
        {review && (
          <ReviewBody review={review} index={index} total={total} data={data} categories={categories} onMove={onMove} />
        )}
      </SheetContent>
    </Sheet>
  )
}

function ReviewBody({
  review: r,
  index,
  total,
  data,
  categories,
  onMove,
}: Omit<Props, "review" | "onClose"> & { review: PreparedReview }) {
  const [copied, setCopied] = useState<string | null>(null)
  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(null), 1500)
    return () => window.clearTimeout(t)
  }, [copied])

  const cat = categories.get(r.primary_category)
  const link = data.meta.play_url ? `${data.meta.play_url}&reviewId=${encodeURIComponent(r.review_id)}` : ""
  const complaint = r.is_complaint === null ? "Unknown" : r.is_complaint ? "Yes" : "No"

  return (
    <>
      <SheetHeader className="gap-1 border-b px-6 py-4 pr-12">
        <SheetTitle className="flex items-center gap-2 text-sm">
          <span className="flex gap-0.5" aria-label={`${r.rating} of 5 stars`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={cn("size-3.5", n <= r.rating ? "fill-foreground text-foreground" : "fill-track text-track")}
                aria-hidden="true"
              />
            ))}
          </span>
          <span className="truncate">{data.meta.keep_user_names && r.user_name ? r.user_name : "Review"}</span>
        </SheetTitle>
        <SheetDescription className="text-xs">
          {formatDateTime(r.review_date) || "No date"} · {formatInt(index + 1)} of {formatInt(total)}
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
        <p className="max-w-prose text-[15px] leading-relaxed break-words whitespace-pre-wrap" data-review-text>
          {r.text || "(no text)"}
        </p>
        {r.summary && (
          <div className="rounded-lg border bg-muted/40 px-3.5 py-2.5">
            <div className="text-[11px] font-medium text-muted-foreground">Summary</div>
            <p className="mt-0.5 text-sm">{r.summary}</p>
          </div>
        )}
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5 text-xs">
          <Item label="Category">
            <span className="inline-flex items-center gap-1.5">
              <Swatch color={cat.color} />
              {cat.label}
            </span>
          </Item>
          <Item label="Secondary categories">
            {r.secondary_categories.length ? r.secondary_categories.map((s) => categories.get(s).label).join(", ") : "None"}
          </Item>
          <Item label="Sentiment">
            <span className="inline-flex items-center gap-1.5">
              <Swatch color={sentimentColor(r.sentiment)} />
              {sentimentLabel(r.sentiment)}
            </span>
          </Item>
          <Item label="Complaint">{complaint}</Item>
          <Item label="Rating">{r.rating} of 5</Item>
          <Item label="Thumbs up">{formatInt(r.thumbs_up)}</Item>
          <Item label="App version">
            <span className="font-mono">{r.app_version || "-"}</span>
          </Item>
          <Item label="Country">{r.country ? r.country.toUpperCase() : "-"}</Item>
          <Item label="Developer reply">
            {r.has_dev_reply ? `Replied${r.dev_reply_date ? ` ${formatDateTime(r.dev_reply_date)}` : ""}` : "No reply"}
          </Item>
          <Item label="Model">{r.model || "-"}</Item>
          {r.error && <Item label="Error">{r.error}</Item>}
          <Item label="Review ID">
            <span className="font-mono text-[11px] break-all">{r.review_id}</span>
          </Item>
        </dl>
      </div>

      <div className="flex items-center justify-between gap-2 border-t px-4 py-3 sm:px-6">
        <div className="flex gap-2">
          {link && (
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" asChild>
              <a href={link} target="_blank" rel="noreferrer noopener">
                <ExternalLink className="size-3.5" aria-hidden="true" />
                <span className="sm:hidden">Google Play</span>
                <span className="max-sm:hidden">Open on Google Play</span>
              </a>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={async () => setCopied((await copyText(r.text)) ? r.review_id : null)}
            aria-label="Copy review text"
          >
            {copied === r.review_id ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
            {copied === r.review_id ? "Copied" : "Copy text"}
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <span className="mr-1 hidden text-[11px] text-muted-foreground sm:inline">
            <Kbd>k</Kbd> <Kbd>j</Kbd>
          </span>
          <Button variant="outline" size="icon" className="size-8" onClick={() => onMove(-1)} disabled={index <= 0} aria-label="Previous review">
            <ChevronUp className="size-3.5" aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => onMove(1)}
            disabled={index >= total - 1}
            aria-label="Next review"
          >
            <ChevronDown className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </>
  )
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1 font-sans text-[10px] font-medium">{children}</kbd>
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-foreground">{children}</dd>
    </div>
  )
}
