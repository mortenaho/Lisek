import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode
} from 'react'
import type { RequestModel } from '@shared/types'
import { useAppStore } from '../stores/appStore'

interface RequestEditorActions {
  patch: (partial: Partial<RequestModel>) => void
  flush: () => void
  getDraft: () => RequestModel
}

interface DraftStore {
  getSnapshot: () => RequestModel
  subscribe: (listener: () => void) => () => void
  patch: (partial: Partial<RequestModel>) => void
  replace: (next: RequestModel) => void
}

const DraftStoreContext = createContext<DraftStore | null>(null)
const RequestEditorActionsContext = createContext<RequestEditorActions | null>(null)

function createDraftStore(initial: RequestModel): DraftStore {
  let draft = initial
  const listeners = new Set<() => void>()

  const emit = () => {
    for (const listener of listeners) listener()
  }

  return {
    getSnapshot: () => draft,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    patch: (partial) => {
      draft = { ...draft, ...partial }
      emit()
    },
    replace: (next) => {
      if (next === draft) return
      draft = next
      emit()
    }
  }
}

export function RequestEditorProvider({
  tabId,
  requestId: _requestId,
  children
}: {
  tabId: string
  requestId: string
  children: ReactNode
}) {
  const hasActiveRequest = useAppStore((s) => s.activeRequest !== null)
  const storeRef = useRef<DraftStore | null>(null)
  if (!storeRef.current) {
    storeRef.current = createDraftStore(useAppStore.getState().activeRequest!)
  }
  const store = storeRef.current

  const storeRequest = useAppStore((s) =>
    s.activeTabId === tabId && s.activeRequest ? s.activeRequest : null
  )

  useEffect(() => {
    if (!storeRequest) return
    // Only adopt store updates when switching requests — not on every
    // activeRequest identity change (e.g. after send), which resets carets.
    const current = store.getSnapshot()
    if (current.id !== storeRequest.id) {
      store.replace(storeRequest)
    }
  }, [store, storeRequest])

  const flush = useCallback(() => {
    const current = store.getSnapshot()
    useAppStore.setState((state) => ({
      activeRequest: state.activeTabId === tabId ? current : state.activeRequest,
      requestTabs: state.requestTabs.map((t) =>
        t.tabId === tabId ? { ...t, request: current } : t
      )
    }))
  }, [store, tabId])

  useEffect(() => {
    return () => {
      flush()
    }
  }, [tabId, flush])

  const patch = useCallback((partial: Partial<RequestModel>) => store.patch(partial), [store])
  const getDraft = useCallback(() => store.getSnapshot(), [store])
  const actions = useMemo(() => ({ patch, flush, getDraft }), [patch, flush, getDraft])

  if (!hasActiveRequest) return null

  return (
    <RequestEditorActionsContext.Provider value={actions}>
      <DraftStoreContext.Provider value={store}>{children}</DraftStoreContext.Provider>
    </RequestEditorActionsContext.Provider>
  )
}

function useDraftStore(): DraftStore {
  const store = useContext(DraftStoreContext)
  if (!store) throw new Error('Request draft hooks must be used within RequestEditorProvider')
  return store
}

/** Full draft — re-renders on any field change. Prefer useRequestField when possible. */
export function useRequestDraft(): RequestModel {
  const store = useDraftStore()
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}

export function useRequestEditorActions(): RequestEditorActions {
  const actions = useContext(RequestEditorActionsContext)
  if (!actions) throw new Error('useRequestEditorActions must be used within RequestEditorProvider')
  return actions
}

export function useRequestEditor() {
  return { request: useRequestDraft(), ...useRequestEditorActions() }
}

/** Subscribe to a single field — skips re-render when that field's reference/value is unchanged. */
export function useRequestField<K extends keyof RequestModel>(key: K): RequestModel[K] {
  const store = useDraftStore()
  return useSyncExternalStore(
    store.subscribe,
    () => store.getSnapshot()[key],
    () => store.getSnapshot()[key]
  )
}

/**
 * Subscribe with a selector. Returns the previous selected value when `isEqual` says unchanged,
 * so object/array selectors can avoid re-renders.
 */
export function useRequestSelector<T>(
  selector: (draft: RequestModel) => T,
  isEqual: (a: T, b: T) => boolean = Object.is
): T {
  const store = useDraftStore()
  const selectorRef = useRef(selector)
  selectorRef.current = selector
  const equalRef = useRef(isEqual)
  equalRef.current = isEqual
  const cachedRef = useRef<T | undefined>(undefined)
  const hasCacheRef = useRef(false)

  return useSyncExternalStore(
    store.subscribe,
    () => {
      const next = selectorRef.current(store.getSnapshot())
      if (hasCacheRef.current && equalRef.current(cachedRef.current as T, next)) {
        return cachedRef.current as T
      }
      cachedRef.current = next
      hasCacheRef.current = true
      return next
    },
    () => selectorRef.current(store.getSnapshot())
  )
}
