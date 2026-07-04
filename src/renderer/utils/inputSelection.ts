/** Preserve caret/selection after a controlled input value update. */
export function applyControlledInputChange(
  input: HTMLInputElement | HTMLTextAreaElement,
  previousValue: string,
  nextValue: string,
  onChange: (value: string) => void
) {
  const start = input.selectionStart ?? nextValue.length
  const end = input.selectionEnd ?? start
  onChange(nextValue)

  const inserted = nextValue.length - previousValue.length + (end - start)
  const pos = Math.max(0, Math.min(start + inserted, nextValue.length))

  requestAnimationFrame(() => {
    try {
      input.setSelectionRange(pos, pos)
    } catch {
      /* input unmounted */
    }
  })
}
