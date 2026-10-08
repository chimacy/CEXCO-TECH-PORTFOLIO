import { useEffect, useState } from 'react'

// Tiny in-memory cache so pages open instantly when you come back to them, and requests start as early as possible.
const TTL = 5 * 60_000
const store = new Map<string, { v: unknown; at: number }>()
const inflight = new Map<string, Promise<unknown>>()

export function peek<T>(k: string): T | undefined {
  const e = store.get(k)
  return e && Date.now() - e.at < TTL ? (e.v as T) : undefined
}
export function put<T>(k: string, v: T) { store.set(k, { v, at: Date.now() }) }

export function load<T>(k: string, fn: () => Promise<T>): Promise<T> {
  const hit = peek<T>(k)
  if (hit !== undefined) return Promise.resolve(hit)
  let p = inflight.get(k) as Promise<T> | undefined
  if (!p) {
    p = fn().then((v) => { put(k, v); inflight.delete(k); return v }, (e: unknown) => { inflight.delete(k); throw e })
    inflight.set(k, p)
  }
  return p
}

export function useCached<T>(k: string, fn: () => Promise<T>): { data: T | undefined; error: boolean } {
  const [data, setData] = useState<T | undefined>(() => peek<T>(k))
  const [error, setError] = useState(false)
  useEffect(() => {
    let live = true
    const hit = peek<T>(k)
    if (hit !== undefined) { setData(hit); return }
    load(k, fn).then((v) => { if (live) setData(v) }).catch(() => { if (live) setError(true) })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k])
  return { data, error }
  }
