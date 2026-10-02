import { useCallback, useEffect, useRef, useState } from 'react'
import { errMsg } from '@/utils/format'

export interface AsyncState<T> { data: T | null; loading: boolean; error: string | null; reload: () => void; setData: (d: T | null) => void }

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    let live = true
    setLoading(true); setError(null)
    fnRef.current().then((d) => { if (live) { setData(d); setLoading(false) } })
      .catch((e: unknown) => { if (live) { setError(errMsg(e)); setLoading(false) } })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { data, loading, error, reload, setData }
}

export function useDebounced<T>(value: T, ms = 350): T {
  const [v, setV] = useState(value)
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t) }, [value, ms])
  return v
}
