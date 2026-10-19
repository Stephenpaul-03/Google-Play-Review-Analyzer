import { Moon, Sun } from "lucide-react"

import { useTheme } from "@/components/theme/theme-context"
import { Button } from "@/components/ui/button"

// Starts from the system setting (the provider's default) and shows the mode in use;
// each click switches to the other mode and remembers the choice.
export function ModeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const next = resolvedTheme === "dark" ? "light" : "dark"
  const Icon = resolvedTheme === "dark" ? Moon : Sun
  const label = `${resolvedTheme === "dark" ? "Dark" : "Light"} mode. Switch to ${next} mode`

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={label}
      title={label}
      onClick={() => setTheme(next)}
      className="size-8 shadow-none text-muted-foreground hover:text-foreground"
    >
      <Icon className="size-3.5" aria-hidden="true" />
    </Button>
  )
}
