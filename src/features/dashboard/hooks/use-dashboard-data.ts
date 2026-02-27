import { useQuery } from '@tanstack/react-query'
import { useSettingsStore } from '@/features/settings/store/settings-store'
import { fetchDashboardEmailData } from '../api/dashboard-api'

/**
 * Hook to fetch real email event data for the dashboard.
 * Returns aggregated stats, daily volume, and recent events.
 *
 * Refreshes every 5 minutes. Falls back gracefully if no data.
 */
export function useDashboardEmailData() {
  const credentials = useSettingsStore((s) => s.sessionCredentials)

  return useQuery({
    queryKey: ['dashboard', 'email-data'],
    queryFn: () => {
      if (!credentials) throw new Error('No credentials')
      return fetchDashboardEmailData(credentials)
    },
    enabled: !!credentials,
    staleTime: 5 * 60 * 1000,       // 5 min
    refetchInterval: 5 * 60 * 1000,  // auto-refresh every 5 min
    retry: 2,
  })
}
