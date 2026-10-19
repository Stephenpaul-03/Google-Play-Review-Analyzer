import { CircleAlert } from "lucide-react"

import { ModeToggle } from "@/components/theme/mode-toggle"
import { Skeleton } from "@/components/ui/skeleton"

export function LoadingState() {
  return (
    <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:px-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  )
}

export function MessageState({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex justify-end p-4">
        <ModeToggle />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-24">
        <div className="max-w-md text-center">
          <CircleAlert className="mx-auto mb-4 size-8 text-muted-foreground" aria-hidden="true" />
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
    </div>
  )
}
