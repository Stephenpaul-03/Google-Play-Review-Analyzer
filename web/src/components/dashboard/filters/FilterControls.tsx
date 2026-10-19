import { ChevronDown, SlidersHorizontal, Star } from "lucide-react"
import type { ReactNode } from "react"

import { MultiSelect } from "@/components/dashboard/filters/MultiSelect"
import type { SetFilters } from "@/components/dashboard/use-hash-filters"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { ComplaintFilter, Filters, ReplyFilter } from "@/data/filters"
import type { FilterOptions } from "@/data/options"
import { cn } from "@/lib/utils"

interface FilterControlsProps {
  filters: Filters
  setFilters: SetFilters
  options: FilterOptions
  /** "stacked" = labelled, full-width controls (mobile sheet). */
  layout: "inline" | "stacked"
}

export function FilterControls({ filters, setFilters, options, layout }: FilterControlsProps) {
  const stacked = layout === "stacked"
  const patch = (p: Partial<Filters>) => setFilters((f) => ({ ...f, ...p }))
  const full = stacked ? "w-full" : ""

  const secondarySwitch = (
    <SwitchRow
      id={`${layout}-secondary`}
      label="Match secondary categories too"
      checked={filters.matchSecondary}
      onChange={(v) => patch({ matchSecondary: v })}
    />
  )

  const extra = (
    <div className="space-y-4">
      <ThumbsControl value={filters.minThumbs} max={options.maxThumbs} onChange={(v) => patch({ minThumbs: v })} id={layout} />
      <SwitchRow
        id={`${layout}-unclassified`}
        label="Include unclassified reviews"
        checked={filters.includeUnclassified}
        onChange={(v) => patch({ includeUnclassified: v })}
      />
    </div>
  )
  const extraActive = (filters.minThumbs > 0 ? 1 : 0) + (filters.includeUnclassified ? 0 : 1)

  return (
    <div className={cn(stacked ? "flex flex-col gap-5" : "flex flex-wrap items-center gap-2")}>
      <Field label="Categories" stacked={stacked}>
        <MultiSelect
          label="Categories"
          options={options.categories}
          selected={filters.categories}
          onChange={(categories) => patch({ categories })}
          footer={secondarySwitch}
          className={full}
          emptyText={stacked ? "All" : undefined}
        />
      </Field>
      <Field label="Rating" stacked={stacked}>
        <ToggleGroup
          type="multiple"
          variant="outline"
          value={filters.ratings.map(String)}
          onValueChange={(v) => patch({ ratings: v.map(Number).sort() })}
          aria-label="Rating filter"
          className={full}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <ToggleGroupItem key={n} value={String(n)} aria-label={`${n} star`} className="min-w-9 flex-1 gap-1 px-2.5">
              {n}
              <Star className="size-3 text-muted-foreground" aria-hidden="true" />
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Field>
      <Field label="Sentiment" stacked={stacked}>
        <MultiSelect
          label="Sentiment"
          options={options.sentiments}
          selected={filters.sentiments}
          onChange={(sentiments) => patch({ sentiments })}
          searchable={false}
          className={full}
          emptyText={stacked ? "All" : undefined}
        />
      </Field>
      <Field label="Complaints" stacked={stacked}>
        <Select value={filters.complaint} onValueChange={(v) => patch({ complaint: v as ComplaintFilter })}>
          <SelectTrigger className={cn("w-[160px]", full)} aria-label="Complaint filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All reviews</SelectItem>
            <SelectItem value="yes">Complaints only</SelectItem>
            <SelectItem value="no">Non-complaints</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="App version" stacked={stacked}>
        <MultiSelect
          label="Versions"
          options={options.versions}
          selected={filters.versions}
          onChange={(versions) => patch({ versions })}
          className={full}
          emptyText={stacked ? "All" : undefined}
        />
      </Field>
      {options.countries.length > 1 && (
        <Field label="Country" stacked={stacked}>
          <MultiSelect
            label="Countries"
            options={options.countries}
            selected={filters.countries}
            onChange={(countries) => patch({ countries })}
            className={full}
            emptyText={stacked ? "All" : undefined}
          />
        </Field>
      )}
      <Field label="Developer reply" stacked={stacked}>
        <Select value={filters.reply} onValueChange={(v) => patch({ reply: v as ReplyFilter })}>
          <SelectTrigger className={cn("w-[172px]", full)} aria-label="Developer reply filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any reply status</SelectItem>
            <SelectItem value="yes">Replied</SelectItem>
            <SelectItem value="no">Not replied</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      {stacked ? (
        extra
      ) : (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" aria-label="More filters">
              <SlidersHorizontal className="text-muted-foreground" aria-hidden="true" />
              More
              {extraActive > 0 && (
                <Badge variant="secondary" className="rounded-sm px-1.5 font-normal tabular-nums">
                  {extraActive}
                </Badge>
              )}
              <ChevronDown className="text-muted-foreground" aria-hidden="true" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72">
            {extra}
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}

function Field({ label, stacked, children }: { label: string; stacked: boolean; children: ReactNode }) {
  if (!stacked) return <>{children}</>
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  )
}

function SwitchRow({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={id} className="text-sm font-normal">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function ThumbsControl({ id, value, max, onChange }: { id: string; value: number; max: number; onChange: (v: number) => void }) {
  const sliderMax = Math.max(1, Math.min(max, 100))
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={`${id}-thumbs`} className="text-sm font-normal">
          Min thumbs up
        </Label>
        <Input
          id={`${id}-thumbs`}
          type="number"
          inputMode="numeric"
          min={0}
          value={value}
          onChange={(e) => onChange(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
          className="h-8 w-20 text-right tabular-nums"
        />
      </div>
      <Slider
        min={0}
        max={sliderMax}
        step={1}
        value={[Math.min(value, sliderMax)]}
        onValueChange={([v]) => onChange(v ?? 0)}
        aria-label="Min thumbs up"
      />
    </div>
  )
}
