import { CircleAlert, Inbox } from "lucide-react"

import { ModeToggle } from "@/components/theme/mode-toggle"
import { Skeleton } from "@/components/ui/skeleton"

/** Skeleton that mirrors the dashboard layout, so nothing jumps when data arrives. */
export function LoadingState() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard">
      <div className="border-b">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-3 px-4 sm:px-6">
          <Skeleton className="size-7 rounded-md" />
          <Skeleton className="h-4 w-48" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-8 w-28 max-sm:w-8" />
            <Skeleton className="h-8 w-20 max-sm:w-8" />
            <Skeleton className="size-8" />
          </div>
        </div>
      </div>
      <div className="border-b">
        <div className="mx-auto flex max-w-[1440px] gap-1.5 px-4 py-2.5 sm:px-6">
          <Skeleton className="h-8 w-56" />
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="hidden h-8 w-24 lg:block" />
          ))}
        </div>
      </div>
      <div className="mx-auto max-w-[1440px] space-y-6 px-4 py-6 sm:px-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-[132px] rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-12">
          <Skeleton className="h-[420px] rounded-xl lg:col-span-5" />
          <Skeleton className="h-[420px] rounded-xl lg:col-span-7" />
        </div>
        <div className="grid gap-6 lg:grid-cols-12">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-[300px] rounded-xl lg:col-span-4" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function MessageState({ title, message, kind = "error" }: { title: string; message: string; kind?: "error" | "empty" }) {
  const Icon = kind === "empty" ? Inbox : CircleAlert
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex h-14 items-center justify-end border-b px-4 sm:px-6">
        <ModeToggle />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-24">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 flex size-10 items-center justify-center rounded-lg border bg-card shadow-xs">
            <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
          </div>
          <h1 className="text-sm font-semibold">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
    </div>
  )
}
