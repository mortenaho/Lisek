import { describe, expect, it, vi } from 'vitest'
import { applyControlledInputChange } from '../src/renderer/utils/inputSelection'

function mockInput(value: string, selectionStart: number, selectionEnd = selectionStart) {
  const calls: Array<[number, number]> = []
  return {
    value,
    selectionStart,
    selectionEnd,
    setSelectionRange: (start: number, end: number) => {
      calls.push([start, end])
    },
    getCalls: () => calls
  } as HTMLInputElement & { getCalls: () => Array<[number, number]> }
}

async function flushRestore() {
  await new Promise((r) => setTimeout(r, 0))
}

describe('applyControlledInputChange', () => {
  it('restores caret after insert (browser already advanced it)', async () => {
    // Typed at index 4 → browser caret is already at 5
    const input = mockInput('hello', 5)
    const onChange = vi.fn()

    applyControlledInputChange(input, 'hell', 'hello', onChange)
    expect(onChange).toHaveBeenCalledWith('hello')

    await flushRestore()
    expect(input.getCalls()).toEqual([[5, 5]])
  })

  it('restores caret after backspace (browser already moved it back)', async () => {
    // Deleted char before caret at 5 → browser caret is already at 4
    const input = mockInput('hell', 4)
    const onChange = vi.fn()

    applyControlledInputChange(input, 'hello', 'hell', onChange)
    expect(onChange).toHaveBeenCalledWith('hell')

    await flushRestore()
    expect(input.getCalls()).toEqual([[4, 4]])
  })

  it('restores caret after deleting all text', async () => {
    const input = mockInput('', 0)
    const onChange = vi.fn()

    applyControlledInputChange(input, 'abc', '', onChange)
    await flushRestore()
    expect(input.getCalls()).toEqual([[0, 0]])
  })

  it('clamps selection when it would exceed next value length', async () => {
    const input = mockInput('ab', 5, 5)
    const onChange = vi.fn()

    applyControlledInputChange(input, 'abcde', 'ab', onChange)
    await flushRestore()
    expect(input.getCalls()).toEqual([[2, 2]])
  })
})
