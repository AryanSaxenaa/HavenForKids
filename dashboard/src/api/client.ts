import type { DashboardData } from '../../../shared/src/types'

const BASE = import.meta.env.VITE_API_BASE_URL

export async function fetchDashboard(sessionId: string): Promise<DashboardData> {
  const response = await fetch(`${BASE}/api/v1/dashboard/${encodeURIComponent(sessionId)}`)

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Session not found. Please check the session ID and try again.')
    }
    if (response.status === 400) {
      throw new Error('That doesn\'t look like a valid session ID. Please check and try again.')
    }
    if (response.status === 429) {
      throw new Error('Too many requests — please wait a moment and try again.')
    }
    throw new Error('Something went wrong loading the dashboard. Please try again shortly.')
  }

  return response.json() as Promise<DashboardData>
}
