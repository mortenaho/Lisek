import { useCallback, useRef, useState } from 'react'

export type DropTarget =
  | { kind: 'before-request'; requestId: string }
  | { kind: 'after-request'; requestId: string }
  | { kind: 'into-collection'; collectionId: string | null }

function parseCollectionId(raw: string | undefined): string | null {
  if (!raw || raw === '__none__') return null
  return raw
}

function pointerPlacement(clientY: number, rect: DOMRect): 'before' | 'after' {
  return clientY < rect.top + rect.height / 2 ? 'before' : 'after'
}

type RequestHit = {
  requestId: string
  collectionId: string | null
  placement: 'before' | 'after'
}

function findRequestHit(clientX: number, clientY: number, draggingId: string): RequestHit | null {
  const nodes = document.querySelectorAll<HTMLElement>('[data-request-id]')
  for (const el of nodes) {
    const requestId = el.dataset.requestId
    if (!requestId || requestId === draggingId) continue
    const rect = el.getBoundingClientRect()
    if (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    ) {
      return {
        requestId,
        collectionId: parseCollectionId(el.dataset.collectionId),
        placement: pointerPlacement(clientY, rect)
      }
    }
  }
  return null
}

function findCollectionHit(clientX: number, clientY: number): string | null | undefined {
  let match: { collectionId: string | null; area: number } | null = null
  const nodes = document.querySelectorAll<HTMLElement>('[data-collection-drop]')
  for (const el of nodes) {
    const rect = el.getBoundingClientRect()
    if (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    ) {
      const area = rect.width * rect.height
      if (!match || area < match.area) {
        match = { collectionId: parseCollectionId(el.dataset.collectionDrop), area }
      }
    }
  }
  return match ? match.collectionId : undefined
}

function resolveDropTarget(
  clientX: number,
  clientY: number,
  draggingId: string
): DropTarget | null {
  const requestHit = findRequestHit(clientX, clientY, draggingId)
  if (requestHit) {
    return requestHit.placement === 'before'
      ? { kind: 'before-request', requestId: requestHit.requestId }
      : { kind: 'after-request', requestId: requestHit.requestId }
  }

  const collectionId = findCollectionHit(clientX, clientY)
  if (collectionId !== undefined) {
    return { kind: 'into-collection', collectionId }
  }

  return null
}

function commitFromTarget(
  target: DropTarget,
  draggingId: string,
  getInsertBeforeId: (
    collectionId: string | null,
    afterRequestId: string,
    excludeRequestId: string
  ) => string | null
): { collectionId: string | null; beforeRequestId: string | null } {
  if (target.kind === 'into-collection') {
    return { collectionId: target.collectionId, beforeRequestId: null }
  }

  const requestEl = document.querySelector<HTMLElement>(
    `[data-request-id="${target.requestId}"]`
  )
  const collectionId = parseCollectionId(requestEl?.dataset.collectionId)

  if (target.kind === 'before-request') {
    return { collectionId, beforeRequestId: target.requestId }
  }

  return {
    collectionId,
    beforeRequestId: getInsertBeforeId(collectionId, target.requestId, draggingId)
  }
}

export function useCollectionDragDrop({
  enabled,
  onMove,
  onExpandCollection,
  getInsertBeforeId
}: {
  enabled: boolean
  onMove: (
    requestId: string,
    targetCollectionId: string | null,
    beforeRequestId: string | null
  ) => Promise<void>
  onExpandCollection: (collectionId: string) => void
  getInsertBeforeId: (
    collectionId: string | null,
    afterRequestId: string,
    excludeRequestId: string
  ) => string | null
}) {
  const draggingIdRef = useRef<string | null>(null)
  const [dragRequestId, setDragRequestId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)

  const clearDrag = useCallback(() => {
    draggingIdRef.current = null
    setDragRequestId(null)
    setDropTarget(null)
    document.body.style.removeProperty('user-select')
    document.body.style.removeProperty('cursor')
  }, [])

  const updateDropFromPoint = useCallback(
    (clientX: number, clientY: number) => {
      const draggingId = draggingIdRef.current
      if (!draggingId) return

      const target = resolveDropTarget(clientX, clientY, draggingId)
      if (target?.kind === 'into-collection' && target.collectionId) {
        onExpandCollection(target.collectionId)
      }
      setDropTarget(target)
    },
    [onExpandCollection]
  )

  const commitDrop = useCallback(
    (clientX: number, clientY: number) => {
      const draggingId = draggingIdRef.current
      if (!draggingId || !enabled) {
        clearDrag()
        return
      }

      const target = resolveDropTarget(clientX, clientY, draggingId)
      if (!target) {
        clearDrag()
        return
      }

      const { collectionId, beforeRequestId } = commitFromTarget(
        target,
        draggingId,
        getInsertBeforeId
      )
      void onMove(draggingId, collectionId, beforeRequestId).finally(clearDrag)
    },
    [enabled, clearDrag, onMove, getInsertBeforeId]
  )

  const bindDragHandle = useCallback(
    (requestId: string) => ({
      onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
        if (!enabled || e.button !== 0) return
        e.stopPropagation()
        e.preventDefault()

        draggingIdRef.current = requestId
        setDragRequestId(requestId)
        document.body.style.userSelect = 'none'
        document.body.style.cursor = 'grabbing'

        const handle = e.currentTarget
        handle.setPointerCapture(e.pointerId)

        const onPointerMove = (ev: PointerEvent) => {
          if (ev.pointerId !== e.pointerId) return
          updateDropFromPoint(ev.clientX, ev.clientY)
        }

        const onPointerUp = (ev: PointerEvent) => {
          if (ev.pointerId !== e.pointerId) return
          try {
            handle.releasePointerCapture(e.pointerId)
          } catch {
            /* capture already released */
          }
          window.removeEventListener('pointermove', onPointerMove)
          window.removeEventListener('pointerup', onPointerUp)
          window.removeEventListener('pointercancel', onPointerUp)
          commitDrop(ev.clientX, ev.clientY)
        }

        window.addEventListener('pointermove', onPointerMove)
        window.addEventListener('pointerup', onPointerUp)
        window.addEventListener('pointercancel', onPointerUp)
      }
    }),
    [enabled, updateDropFromPoint, commitDrop]
  )

  const isDropBefore = useCallback(
    (requestId: string) =>
      dropTarget?.kind === 'before-request' && dropTarget.requestId === requestId,
    [dropTarget]
  )

  const isDropAfter = useCallback(
    (requestId: string) =>
      dropTarget?.kind === 'after-request' && dropTarget.requestId === requestId,
    [dropTarget]
  )

  const isDropIntoCollection = useCallback(
    (collectionId: string | null) =>
      dropTarget?.kind === 'into-collection' && dropTarget.collectionId === collectionId,
    [dropTarget]
  )

  return {
    dragRequestId,
    bindDragHandle,
    isDropBefore,
    isDropAfter,
    isDropIntoCollection
  }
}
