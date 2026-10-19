import { useEffect, useState } from "react"

import { decodeFilters, encodeFilters, readHash, writeHash, type Filters } from "@/data/filters"

/**
 * Filter state mirrored into the URL hash (so a view can be bookmarked).
 * `appId` is kept in the hash too when the page is in local (multi-app) mode.
 */
export function useHashFilters(appId: string | null) {
  const [filters, setFilters] = useState<Filters>(() => decodeFilters(readHash()))

  useEffect(() => {
    const params = new URLSearchParams()
    if (appId) params.set("app", appId)
    encodeFilters(filters).forEach((v, k) => params.set(k, v))
    writeHash(params)
  }, [filters, appId])

  useEffect(() => {
    const onHash = () => setFilters(decodeFilters(readHash()))
    window.addEventListener("hashchange", onHash)
    return () => window.removeEventListener("hashchange", onHash)
  }, [])

  return [filters, setFilters] as const
}

export type SetFilters = ReturnType<typeof useHashFilters>[1]
