import { useState, useEffect, useCallback } from 'react'
import { fetchDashboard } from '../api/client'
import type { DashboardData } from '../../../shared/src/types'

type Status = 'idle' | 'loading' | 'success' | 'error'

interface UseDashboardResult {
  data: DashboardData | null
  status: Status
  error: string | null
  refetch: () => void
}

export function useDashboardData(sessionId: string | null): UseDashboardResult {
  const [data, setData] = useState<DashboardData | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!sessionId) return
    setStatus('loading')
    setError(null)
    setData(null)   // clear stale data immediately so old results don't show during load
    try {
      const result = await fetchDashboard(sessionId)
      setData(result)
      setStatus('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStatus('error')
    }
  }, [sessionId])

  useEffect(() => {
    void load()
  }, [load])

  return { data, status, error, refetch: () => void load() }
}
