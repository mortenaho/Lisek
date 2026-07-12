/** Strip leading `v` / `V` and any pre-release / build suffix for numeric compare. */
export function normalizeVersion(version: string): string {
  return version.trim().replace(/^[vV]/, '').split(/[-+]/)[0] ?? ''
}

/** Compare two semver-like strings. Returns 1 if a > b, -1 if a < b, 0 if equal. */
export function compareVersions(a: string, b: string): number {
  const pa = normalizeVersion(a)
    .split('.')
    .map((part) => parseInt(part, 10) || 0)
  const pb = normalizeVersion(b)
    .split('.')
    .map((part) => parseInt(part, 10) || 0)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const da = pa[i] ?? 0
    const db = pb[i] ?? 0
    if (da > db) return 1
    if (da < db) return -1
  }
  return 0
}

export function isNewerVersion(latest: string, current: string): boolean {
  return compareVersions(latest, current) > 0
}
