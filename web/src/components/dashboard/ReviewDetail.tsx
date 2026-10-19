import { Check, Copy, ExternalLink } from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { formatDateTime, sentimentLabel } from "@/data/aggregate"
import type { CategoryIndex } from "@/data/categories"
import type { DashboardData, PreparedReview } from "@/data/types"

interface Props {
  review: PreparedReview
  data: DashboardData
  categories: CategoryIndex
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

export function ReviewDetail({ review: r, data, categories }: Props) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(false), 1500)
    return () => window.clearTimeout(t)
  }, [copied])

  const link = data.meta.play_url ? `${data.meta.play_url}&reviewId=${encodeURIComponent(r.review_id)}` : ""
  const complaint = r.is_complaint === null ? "Unknown" : r.is_complaint ? "Yes" : "No"
  const reply = r.has_dev_reply ? `Replied${r.dev_reply_date ? ` on ${formatDateTime(r.dev_reply_date)}` : ""}` : "No reply"

  return (
    <div className="space-y-4 rounded-md border bg-background p-4" data-review-detail>
      <p className="text-sm leading-relaxed break-words whitespace-pre-wrap" data-review-text>
        {r.text || "(no text)"}
      </p>
      {r.summary && <p className="text-sm text-muted-foreground">Summary: {r.summary}</p>}
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
        <Item label="Primary category">{categories.get(r.primary_category).label}</Item>
        <Item label="Secondary categories">
          {r.secondary_categories.length ? r.secondary_categories.map((s) => categories.get(s).label).join(", ") : "None"}
        </Item>
        <Item label="Complaint">{complaint}</Item>
        <Item label="Sentiment">{sentimentLabel(r.sentiment)}</Item>
        <Item label="Country">{r.country ? r.country.toUpperCase() : "-"}</Item>
        <Item label="App version">{r.app_version || "-"}</Item>
        <Item label="Reviewed">{formatDateTime(r.review_date) || "-"}</Item>
        <Item label="Developer reply">{reply}</Item>
        <Item label="Model">{r.model || "-"}</Item>
        {data.meta.keep_user_names && <Item label="User">{r.user_name || "-"}</Item>}
        {r.error && <Item label="Error">{r.error}</Item>}
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={async () => setCopied(await copyText(r.text))}
          aria-label="Copy review text"
        >
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {copied ? "Copied" : "Copy text"}
        </Button>
        {link && (
          <Button variant="outline" size="sm" asChild>
            <a href={link} target="_blank" rel="noreferrer noopener">
              Open on Google Play
              <ExternalLink aria-hidden="true" />
            </a>
          </Button>
        )}
      </div>
    </div>
  )
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words">{children}</dd>
    </div>
  )
}
