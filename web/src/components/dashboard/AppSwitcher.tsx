import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatInt } from "@/data/aggregate"
import type { AppIndexEntry } from "@/data/types"

interface AppSwitcherProps {
  apps: AppIndexEntry[]
  value: string
  onChange: (appId: string) => void
}

export function AppSwitcher({ apps, value, onChange }: AppSwitcherProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[220px] max-w-full" aria-label="App">
        <SelectValue placeholder="Choose an app" />
      </SelectTrigger>
      <SelectContent align="end">
        {apps.map((a) => (
          <SelectItem key={a.app_id} value={a.app_id}>
            <span className="truncate">{a.app_title}</span>
            <span className="ml-auto pl-2 text-xs text-muted-foreground tabular-nums">{formatInt(a.review_count)}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
