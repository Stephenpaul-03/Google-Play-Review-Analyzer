import { useCallback, useEffect, useState } from "react"

import { Dashboard } from "@/components/dashboard/Dashboard"
import { LoadingState, MessageState } from "@/components/dashboard/States"
import { errorText, fetchApps, fetchDashboard, readEmbeddedData } from "@/data/load"
import type { AppIndexEntry, DashboardData } from "@/data/types"

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "ready"; data: DashboardData; apps: AppIndexEntry[] | null; appId: string | null }

function hashApp(): string | null {
  return new URLSearchParams(window.location.hash.replace(/^#/, "")).get("app")
}

export default function App() {
  const [embedded] = useState(readEmbeddedData)
  const [state, setState] = useState<State>(() => {
    if (embedded.kind === "data") return { status: "ready", data: embedded.data, apps: null, appId: null }
    if (embedded.kind === "error") return { status: "error", message: embedded.message }
    return { status: "loading" }
  })
  const [apps, setApps] = useState<AppIndexEntry[] | null>(null)
  const [appId, setAppId] = useState<string | null>(null)

  // Local web app mode: load the app index.
  useEffect(() => {
    if (embedded.kind !== "none") return
    let cancelled = false
    fetchApps()
      .then(({ apps: list }) => {
        if (cancelled) return
        if (!list.length) {
          setState({ status: "empty" })
          return
        }
        const wanted = hashApp()
        setApps(list)
        setAppId(list.some((a) => a.app_id === wanted) ? wanted : list[0].app_id)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const hint =
          window.location.protocol === "file:"
            ? " This page has no embedded data. Run npm run dev or npm run preview in web/, or open the dashboard.html that build_dashboard.py writes."
            : ""
        setState({ status: "error", message: `Could not load data/apps.json (${errorText(err)}).${hint}` })
      })
    return () => {
      cancelled = true
    }
  }, [embedded])

  // Load the selected app.
  useEffect(() => {
    if (!apps || !appId) return
    let cancelled = false
    setState({ status: "loading" })
    fetchDashboard(appId)
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data, apps, appId })
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ status: "error", message: `Could not load data for ${appId} (${errorText(err)}).` })
      })
    return () => {
      cancelled = true
    }
  }, [apps, appId])

  // Follow manual edits / back-forward of the #app= parameter.
  useEffect(() => {
    if (!apps) return
    const onHash = () => {
      const wanted = hashApp()
      if (wanted && wanted !== appId && apps.some((a) => a.app_id === wanted)) setAppId(wanted)
    }
    window.addEventListener("hashchange", onHash)
    return () => window.removeEventListener("hashchange", onHash)
  }, [apps, appId])

  const switchApp = useCallback((id: string) => {
    // Filters are per app: start the new app with a clean view.
    window.history.replaceState(null, "", `#app=${encodeURIComponent(id)}`)
    setAppId(id)
  }, [])

  if (state.status === "loading") return <LoadingState />
  if (state.status === "error") return <MessageState title="Could not load the dashboard" message={state.message} />
  if (state.status === "empty") {
    return <MessageState kind="empty" title="No apps yet" message="No apps yet. Run python pipeline.py --app <name>." />
  }
  return (
    <Dashboard
      key={state.appId ?? state.data.meta.app_id}
      data={state.data}
      apps={state.apps}
      appId={state.appId}
      onSwitchApp={switchApp}
    />
  )
}
