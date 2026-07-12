/** Preserve caret/selection after a controlled input value update. */
export function applyControlledInputChange(
  input: HTMLInputElement | HTMLTextAreaElement,
  _previousValue: string,
  nextValue: string,
  onChange: (value: string) => void
) {
  // By the time the browser fires `onChange`, it has already applied the edit
  // and moved the caret. Capture that selection, then restore it after React
  // re-renders the controlled value (which otherwise jumps the caret).
  const start = input.selectionStart
  const end = input.selectionEnd

  onChange(nextValue)

  const restore = () => {
    try {
      if (start == null || end == null) return
      const max = nextValue.length
      input.setSelectionRange(Math.min(start, max), Math.min(end, max))
    } catch {
      /* input unmounted or not focused */
    }
  }

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(restore)
  } else {
    setTimeout(restore, 0)
  }
}
