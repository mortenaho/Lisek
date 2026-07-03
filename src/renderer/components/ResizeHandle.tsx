import { Box, useTheme } from '@mui/material'
import { useCallback, useRef } from 'react'

interface Props {
  axis: 'x' | 'y'
  min: number
  max: number
  getSize: () => number
  onLiveResize: (size: number) => void
  onCommit: (size: number) => void
  /** When true, moving pointer down increases size (response panel). */
  growOnDown?: boolean
  onDragStart?: () => void
  onDragEnd?: () => void
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export default function ResizeHandle({
  axis,
  min,
  max,
  getSize,
  onLiveResize,
  onCommit,
  growOnDown = false,
  onDragStart,
  onDragEnd
}: Props) {
  const theme = useTheme()
  const isX = axis === 'x'
  const rafRef = useRef(0)
  const pendingSizeRef = useRef<number | null>(null)

  const flush = useCallback(() => {
    rafRef.current = 0
    if (pendingSizeRef.current !== null) {
      onLiveResize(pendingSizeRef.current)
      pendingSizeRef.current = null
    }
  }, [onLiveResize])

  const schedule = useCallback(
    (size: number) => {
      pendingSizeRef.current = size
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(flush)
      }
    },
    [flush]
  )

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      const startPos = isX ? e.clientX : e.clientY
      const startSize = getSize()
      let latest = startSize

      onDragStart?.()

      const onMouseMove = (ev: MouseEvent) => {
        const current = isX ? ev.clientX : ev.clientY
        const delta = current - startPos
        const signed = isX ? delta : growOnDown ? delta : -delta
        latest = clamp(startSize + signed, min, max)
        schedule(latest)
      }

      const onMouseUp = () => {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current)
          rafRef.current = 0
        }
        pendingSizeRef.current = null
        onLiveResize(latest)
        onCommit(latest)
        onDragEnd?.()
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        document.documentElement.classList.remove('flux-resizing')
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
      }

      document.body.style.cursor = isX ? 'col-resize' : 'row-resize'
      document.body.style.userSelect = 'none'
      document.documentElement.classList.add('flux-resizing')
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    },
    [isX, growOnDown, getSize, min, max, schedule, onLiveResize, onCommit, onDragStart, onDragEnd]
  )

  return (
    <Box
      onMouseDown={onMouseDown}
      role="separator"
      aria-orientation={isX ? 'vertical' : 'horizontal'}
      sx={{
        flexShrink: 0,
        zIndex: 2,
        bgcolor: 'divider',
        touchAction: 'none',
        ...(isX
          ? {
              width: 5,
              cursor: 'col-resize',
              '&:hover': { bgcolor: theme.palette.primary.main, opacity: 0.55 }
            }
          : {
              height: 5,
              cursor: 'row-resize',
              '&:hover': { bgcolor: theme.palette.primary.main, opacity: 0.55 }
            })
      }}
    />
  )
}

export function readStoredSize(key: string, fallback: number) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const n = Number(raw)
    return Number.isFinite(n) ? n : fallback
  } catch {
    return fallback
  }
}

export function storeSize(key: string, value: number) {
  try {
    localStorage.setItem(key, String(Math.round(value)))
  } catch {
    /* ignore */
  }
}

export { clamp }
