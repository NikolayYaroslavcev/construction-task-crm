import { useCallback, useEffect, useState } from 'react'

/** Runs an async loader on mount / when deps change; exposes reload for after mutations. */
export function useLoad<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(loader, deps)

  const reload = useCallback(async () => {
    try {
      setData(await run())
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [run])

  useEffect(() => {
    reload()
  }, [reload])

  return { data, error, reload }
}
