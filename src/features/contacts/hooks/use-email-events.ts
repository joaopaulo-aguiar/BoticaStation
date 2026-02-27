/**
 * React Query hooks for email event tracking.
 */
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/store/auth-store'
import {
  fetchEmailEvents,
  fetchEmailEventsByType,
  fetchBulkEmailStats,
  type EmailEventType,
} from '../api/email-events-api'

const EMAIL_EVENTS_KEY = ['email-events']

function useCredentials() {
  const getCredentials = useAuthStore((s) => s.getCredentials)
  return () => {
    const creds = getCredentials()
    if (!creds) throw new Error('Sessão expirada. Faça login novamente.')
    return creds
  }
}

/**
 * Fetch all email events + stats for a single contact email.
 */
export function useEmailActivity(email: string | null) {
  const getCreds = useCredentials()
  return useQuery({
    queryKey: [...EMAIL_EVENTS_KEY, email],
    queryFn: () => fetchEmailEvents(getCreds(), email!),
    enabled: !!email,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 2,
  })
}

/**
 * Fetch email events filtered by type for a single contact email.
 */
export function useEmailEventsByType(email: string | null, eventType: EmailEventType | null) {
  const getCreds = useCredentials()
  return useQuery({
    queryKey: [...EMAIL_EVENTS_KEY, email, eventType],
    queryFn: () => fetchEmailEventsByType(getCreds(), email!, eventType!),
    enabled: !!email && !!eventType,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 2,
  })
}

/**
 * Fetch aggregate email stats for multiple contacts.
 */
export function useBulkEmailStats(emails: string[]) {
  const getCreds = useCredentials()
  return useQuery({
    queryKey: [...EMAIL_EVENTS_KEY, 'bulk', ...emails.slice(0, 5)],
    queryFn: () => fetchBulkEmailStats(getCreds(), emails),
    enabled: emails.length > 0,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 3,
  })
}
