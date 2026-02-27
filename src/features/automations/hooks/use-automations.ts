/**
 * React Query hooks for automation workflows.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/store/auth-store'
import {
  listAutomations,
  getAutomation,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  duplicateAutomation,
  activateAutomation,
  pauseAutomation,
  archiveAutomation,
  getAutomationExecutions,
} from '../api/automations-api'
import type { AutomationFormData, AutomationNode, AutomationStatus } from '../types'

const AUTOMATIONS_KEY = ['automations']

function useCredentials() {
  const getCredentials = useAuthStore((s) => s.getCredentials)
  return () => {
    const creds = getCredentials()
    if (!creds) throw new Error('Sessão expirada. Faça login novamente.')
    return creds
  }
}

export function useAutomations() {
  const getCreds = useCredentials()
  return useQuery({
    queryKey: AUTOMATIONS_KEY,
    queryFn: () => listAutomations(getCreds()),
    staleTime: 1000 * 60 * 2,
  })
}

export function useAutomation(id: string | null) {
  const getCreds = useCredentials()
  return useQuery({
    queryKey: [...AUTOMATIONS_KEY, id],
    queryFn: () => getAutomation(getCreds(), id!),
    enabled: !!id,
  })
}

export function useCreateAutomation() {
  const qc = useQueryClient()
  const getCreds = useCredentials()
  return useMutation({
    mutationFn: (data: AutomationFormData) => createAutomation(getCreds(), data),
    onSuccess: () => qc.invalidateQueries({ queryKey: AUTOMATIONS_KEY }),
  })
}

export function useUpdateAutomation() {
  const qc = useQueryClient()
  const getCreds = useCredentials()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: Partial<AutomationFormData> & { status?: AutomationStatus }
    }) => updateAutomation(getCreds(), id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: AUTOMATIONS_KEY }),
  })
}

export function useDeleteAutomation() {
  const qc = useQueryClient()
  const getCreds = useCredentials()
  return useMutation({
    mutationFn: (id: string) => deleteAutomation(getCreds(), id),
    onSuccess: () => qc.invalidateQueries({ queryKey: AUTOMATIONS_KEY }),
  })
}

export function useDuplicateAutomation() {
  const qc = useQueryClient()
  const getCreds = useCredentials()
  return useMutation({
    mutationFn: ({ id, newName }: { id: string; newName: string }) =>
      duplicateAutomation(getCreds(), id, newName),
    onSuccess: () => qc.invalidateQueries({ queryKey: AUTOMATIONS_KEY }),
  })
}

export function useActivateAutomation() {
  const qc = useQueryClient()
  const getCreds = useCredentials()
  return useMutation({
    mutationFn: (id: string) => activateAutomation(getCreds(), id),
    onSuccess: () => qc.invalidateQueries({ queryKey: AUTOMATIONS_KEY }),
  })
}

export function usePauseAutomation() {
  const qc = useQueryClient()
  const getCreds = useCredentials()
  return useMutation({
    mutationFn: (id: string) => pauseAutomation(getCreds(), id),
    onSuccess: () => qc.invalidateQueries({ queryKey: AUTOMATIONS_KEY }),
  })
}

export function useAutomationExecutions(automationId: string | null) {
  const getCreds = useCredentials()
  return useQuery({
    queryKey: [...AUTOMATIONS_KEY, automationId, 'executions'],
    queryFn: () => getAutomationExecutions(getCreds(), automationId!),
    enabled: !!automationId,
    staleTime: 1000 * 30,
  })
}
