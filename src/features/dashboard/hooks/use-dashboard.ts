import { useQuery } from '@tanstack/react-query'
import { getDashboardMetrics } from '../api/dashboard-api'
import type { DashboardPeriod } from '../types'

const DASHBOARD_KEY = ['dashboard'] as const

export function useDashboardMetrics(period: DashboardPeriod, refetchIntervalMs?: number) {
  return useQuery({
    queryKey: [...DASHBOARD_KEY, period],
    queryFn: () => getDashboardMetrics(period),
    staleTime: 60_000,
    refetchInterval: refetchIntervalMs || false,
  })
}
