/** Compare app versions numerically by dot-separated parts ("12.10" > "12.9"). */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".")
  const pb = b.split(".")
  const n = Math.max(pa.length, pb.length)
  for (let i = 0; i < n; i++) {
    const x = pa[i] ?? ""
    const y = pb[i] ?? ""
    const nx = Number.parseInt(x, 10)
    const ny = Number.parseInt(y, 10)
    if (Number.isNaN(nx) || Number.isNaN(ny)) {
      if (x === y) continue
      if (x === "") return -1
      if (y === "") return 1
      const c = x.localeCompare(y)
      if (c !== 0) return c
      continue
    }
    if (nx !== ny) return nx - ny
  }
  return 0
}

/** Unique non-empty versions, newest first. */
export function sortedVersionsDesc(versions: Iterable<string>): string[] {
  return [...new Set(versions)].filter(Boolean).sort((a, b) => compareVersions(b, a))
}
