import { FilterPill } from "@/components/dashboard/filters/FilterPill"
import { ChoiceList, OptionList } from "@/components/dashboard/filters/OptionList"
import {
  categoriesValue,
  firstPlus,
  moreValue,
  ratingValue,
  sentimentsValue,
  versionsValue,
} from "@/components/dashboard/filters/pill-values"
import type { SetFilters } from "@/components/dashboard/use-hash-filters"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import type { CategoryIndex } from "@/data/categories"
import { DEFAULT_FILTERS, type ComplaintFilter, type Filters, type ReplyFilter } from "@/data/filters"
import type { FilterOptions } from "@/data/options"
import { cn } from "@/lib/utils"

interface FilterPillsProps {
  filters: Filters
  setFilters: SetFilters
  options: FilterOptions
  categories: CategoryIndex
  /** Stacked, full-width pills (mobile sheet). */
  block?: boolean
  idPrefix: string
}

const COMPLAINT_LABEL: Record<ComplaintFilter, string> = { all: "", yes: "Only", no: "Excluded" }
const REPLY_LABEL: Record<ReplyFilter, string> = { any: "", yes: "Replied", no: "Not replied" }

export function FilterPills({ filters: f, setFilters, options, categories, block, idPrefix }: FilterPillsProps) {
  const patch = (p: Partial<Filters>) => setFilters((x) => ({ ...x, ...p }))

  return (
    <div className={cn(block ? "flex flex-col gap-2" : "flex flex-wrap items-center gap-1.5")}>
      <FilterPill
        label="Categories"
        value={categoriesValue(f.categories, categories)}
        onClear={() => patch({ categories: [], matchSecondary: false })}
        block={block}
        contentClassName="w-72"
      >
        <OptionList
          options={options.categories}
          selected={f.categories}
          onChange={(categories) => patch({ categories })}
          searchPlaceholder="Search categories"
          footer={
            <SwitchRow
              id={`${idPrefix}-secondary`}
              label="Match secondary categories too"
              checked={f.matchSecondary}
              onChange={(matchSecondary) => patch({ matchSecondary })}
            />
          }
        />
      </FilterPill>
      <FilterPill label="Rating" value={ratingValue(f.ratings)} onClear={() => patch({ ratings: [] })} block={block} contentClassName="w-52">
        <OptionList
          options={options.ratings}
          selected={f.ratings.map(String)}
          onChange={(v) => patch({ ratings: v.map(Number).sort((a, b) => a - b) })}
        />
      </FilterPill>
      <FilterPill label="Sentiment" value={sentimentsValue(f.sentiments)} onClear={() => patch({ sentiments: [] })} block={block} contentClassName="w-56">
        <OptionList options={options.sentiments} selected={f.sentiments} onChange={(sentiments) => patch({ sentiments })} />
      </FilterPill>
      <FilterPill label="Complaints" value={COMPLAINT_LABEL[f.complaint]} onClear={() => patch({ complaint: "all" })} block={block} contentClassName="w-48">
        <ChoiceList<ComplaintFilter>
          value={f.complaint}
          onChange={(complaint) => patch({ complaint })}
          options={[
            { value: "all", label: "All reviews" },
            { value: "yes", label: "Complaints only" },
            { value: "no", label: "Non-complaints only" },
          ]}
        />
      </FilterPill>
      <FilterPill label="Version" value={versionsValue(f.versions)} onClear={() => patch({ versions: [] })} block={block} contentClassName="w-56">
        <OptionList
          options={options.versions}
          selected={f.versions}
          onChange={(versions) => patch({ versions })}
          searchPlaceholder="Search versions"
        />
      </FilterPill>
      {options.countries.length > 1 && (
        <FilterPill
          label="Country"
          value={firstPlus(f.countries.map((c) => c.toUpperCase()))}
          onClear={() => patch({ countries: [] })}
          block={block}
          contentClassName="w-52"
        >
          <OptionList
            options={options.countries}
            selected={f.countries}
            onChange={(countries) => patch({ countries })}
            searchPlaceholder="Search countries"
          />
        </FilterPill>
      )}
      <FilterPill label="Reply" value={REPLY_LABEL[f.reply]} onClear={() => patch({ reply: "any" })} block={block} contentClassName="w-48">
        <ChoiceList<ReplyFilter>
          value={f.reply}
          onChange={(reply) => patch({ reply })}
          options={[
            { value: "any", label: "Any reply status" },
            { value: "yes", label: "Developer replied" },
            { value: "no", label: "No reply" },
          ]}
        />
      </FilterPill>
      <FilterPill
        label="More"
        value={moreValue(f)}
        onClear={() => patch({ minThumbs: 0, includeUnclassified: DEFAULT_FILTERS.includeUnclassified })}
        block={block}
        contentClassName="w-72"
      >
        <div className="space-y-4 p-4">
          <ThumbsControl id={idPrefix} value={f.minThumbs} max={options.maxThumbs} onChange={(minThumbs) => patch({ minThumbs })} />
          <SwitchRow
            id={`${idPrefix}-unclassified`}
            label="Include unclassified reviews"
            checked={f.includeUnclassified}
            onChange={(includeUnclassified) => patch({ includeUnclassified })}
          />
        </div>
      </FilterPill>
    </div>
  )
}

function SwitchRow({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={id} className="text-xs font-normal">
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
        <Label htmlFor={`${id}-thumbs`} className="text-xs font-normal">
          Minimum thumbs up
        </Label>
        <Input
          id={`${id}-thumbs`}
          type="number"
          inputMode="numeric"
          min={0}
          value={value}
          onChange={(e) => onChange(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
          className="h-7 w-16 text-right text-xs"
        />
      </div>
      <Slider
        min={0}
        max={sliderMax}
        step={1}
        value={[Math.min(value, sliderMax)]}
        onValueChange={([v]) => onChange(v ?? 0)}
        aria-label="Minimum thumbs up"
      />
    </div>
  )
}
