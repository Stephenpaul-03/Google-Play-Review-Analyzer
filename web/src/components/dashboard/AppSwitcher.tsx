import { Check, ChevronsUpDown } from "lucide-react"
import { useState } from "react"

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatInt } from "@/data/aggregate"
import type { AppIndexEntry } from "@/data/types"
import { cn } from "@/lib/utils"

interface AppSwitcherProps {
  apps: AppIndexEntry[]
  value: string
  title: string
  onChange: (appId: string) => void
}

/** The app title in the top bar doubles as the app switcher in local mode. */
export function AppSwitcher({ apps, value, title, onChange }: AppSwitcherProps) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="App"
          className="-mx-1.5 inline-flex min-w-0 items-center gap-1 rounded-md px-1.5 py-1 text-sm font-semibold outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <span className="truncate">{title}</span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <Command>
          <CommandInput placeholder="Find an app" />
          <CommandList>
            <CommandEmpty>No apps found.</CommandEmpty>
            <CommandGroup>
              {apps.map((a) => (
                <CommandItem
                  key={a.app_id}
                  value={`${a.app_title} ${a.app_id}`}
                  data-app={a.app_id}
                  onSelect={() => {
                    setOpen(false)
                    if (a.app_id !== value) onChange(a.app_id)
                  }}
                  className="gap-2 py-2"
                >
                  <Check className={cn("size-3.5", a.app_id === value ? "opacity-100" : "opacity-0")} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{a.app_title}</div>
                    <div className="truncate font-mono text-[11px] text-muted-foreground">{a.app_id}</div>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatInt(a.review_count)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
