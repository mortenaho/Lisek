/** Strip Electron's IPC wrapper so only the underlying error is shown. */
export function formatIpcError(err: unknown, fallback = 'Unknown error'): string {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : fallback
  return raw
    .replace(/^Error invoking remote method '[^']+':\s*/, '')
    .replace(/^(?:TypeError|RangeError|SyntaxError|URIError|ReferenceError|Error):\s*/, '')
    .trim() || fallback
}
