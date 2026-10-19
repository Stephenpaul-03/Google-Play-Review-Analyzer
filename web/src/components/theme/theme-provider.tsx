import { useEffect, useState } from "react"

import {
  ThemeProviderContext,
  type ResolvedTheme,
  type Theme,
} from "@/components/theme/theme-context"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

const query = "(prefers-color-scheme: dark)"

function systemTheme(): ResolvedTheme {
  return typeof window !== "undefined" && window.matchMedia?.(query).matches ? "dark" : "light"
}

function readStoredTheme(storageKey: string, fallback: Theme): Theme {
  try {
    const stored = window.localStorage.getItem(storageKey)
    if (stored === "light" || stored === "dark" || stored === "system") return stored
  } catch {
    // Storage can be unavailable (private mode, file:// restrictions).
  }
  return fallback
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "review-dashboard-theme",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme(storageKey, defaultTheme))
  const [system, setSystem] = useState<ResolvedTheme>(systemTheme)

  useEffect(() => {
    const mq = window.matchMedia?.(query)
    if (!mq) return
    const onChange = () => setSystem(mq.matches ? "dark" : "light")
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  const resolvedTheme: ResolvedTheme = theme === "system" ? system : theme

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(resolvedTheme)
    root.style.colorScheme = resolvedTheme
    root.style.backgroundColor = ""
  }, [resolvedTheme])

  const setTheme = (next: Theme) => {
    try {
      window.localStorage.setItem(storageKey, next)
    } catch {
      // Ignore: the choice just won't persist.
    }
    setThemeState(next)
  }

  return (
    <ThemeProviderContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  )
}
