import { createContext, useContext, useEffect, useReducer, useRef, useState, type Dispatch, type ReactNode } from 'react'
import { loadState, saveState } from '../lib/storage'
import type { InspectionState } from '../lib/types'
import { createInitialState, inspectionReducer, type InspectionAction } from './inspectionReducer'

interface InspectionContextValue {
  readonly state: InspectionState
  readonly dispatch: Dispatch<InspectionAction>
  readonly ready: boolean
  readonly storageError?: string
}

const InspectionContext = createContext<InspectionContextValue | undefined>(undefined)

interface InspectionProviderProps {
  readonly children: ReactNode
  readonly initialState?: InspectionState
}

export function InspectionProvider({ children, initialState }: InspectionProviderProps) {
  const [state, dispatch] = useReducer(inspectionReducer, initialState ?? createInitialState())
  const [ready, setReady] = useState(false)
  const [storageError, setStorageError] = useState<string>()
  const hydrated = useRef(false)

  useEffect(() => {
    let cancelled = false
    loadState()
      .then((loaded) => {
        if (cancelled) return
        dispatch({ type: 'hydrate', state: loaded })
      })
      .catch((err: unknown) => {
        console.error('Failed to load local data', err)
        if (!cancelled) setStorageError('تعذّر تحميل البيانات المحفوظة على هذا الجهاز. سيعمل التطبيق، لكن قد لا تُحفظ التغييرات.')
      })
      .finally(() => {
        if (cancelled) return
        hydrated.current = true
        setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!hydrated.current) return
    saveState(state).catch((err: unknown) => {
      console.error('Failed to save local data', err)
      setStorageError('تعذّر حفظ التغييرات على هذا الجهاز. قد تكون مساحة التخزين ممتلئة أو التصفح خاصًا.')
    })
  }, [state])

  return <InspectionContext.Provider value={{ state, dispatch, ready, storageError }}>{children}</InspectionContext.Provider>
}

export function useInspection(): InspectionContextValue {
  const ctx = useContext(InspectionContext)
  if (!ctx) throw new Error('useInspection must be used inside InspectionProvider')
  return ctx
}
