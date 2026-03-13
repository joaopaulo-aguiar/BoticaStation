import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listAutomations,
  getAutomation,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  updateAutomationStatus,
  duplicateAutomation,
  startExecution,
  stopExecution,
  listExecutions,
  describeExecution,
  getExecutionHistory,
} from '../api/automations-api'
import type { AutomationStatus, CreateAutomationInput, UpdateAutomationInput, ExecutionStatus } from '../types'

const KEY = ['automations'] as const
const EXEC_KEY = ['automations', 'executions'] as const

export function useAutomationsList() {
  return useQuery({
    queryKey: [...KEY, 'list'],
    queryFn: listAutomations,
  })
}

export function useAutomationDetail(id: string | null) {
  return useQuery({
    queryKey: [...KEY, 'detail', id],
    queryFn: () => getAutomation(id!),
    enabled: !!id,
  })
}

export function useCreateAutomation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateAutomationInput) => createAutomation(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateAutomation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAutomationInput }) => updateAutomation(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteAutomation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAutomation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateAutomationStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AutomationStatus }) => updateAutomationStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDuplicateAutomation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => duplicateAutomation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

// ── Execution Hooks ──────────────────────────────────────────────────────────

export function useListExecutions(automationId: string | null, status?: ExecutionStatus) {
  return useQuery({
    queryKey: [...EXEC_KEY, automationId, status],
    queryFn: () => listExecutions(automationId!, status),
    enabled: !!automationId,
    refetchInterval: 15_000,
  })
}

export function useDescribeExecution(executionArn: string | null) {
  return useQuery({
    queryKey: [...EXEC_KEY, 'detail', executionArn],
    queryFn: () => describeExecution(executionArn!),
    enabled: !!executionArn,
  })
}

export function useExecutionHistory(executionArn: string | null) {
  return useQuery({
    queryKey: [...EXEC_KEY, 'history', executionArn],
    queryFn: () => getExecutionHistory(executionArn!),
    enabled: !!executionArn,
  })
}

export function useStartExecution() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ automationId, contactId, input }: { automationId: string; contactId: string; input?: string }) =>
      startExecution(automationId, contactId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: EXEC_KEY })
    },
  })
}

export function useStopExecution() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (executionArn: string) => stopExecution(executionArn),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: EXEC_KEY })
    },
  })
}
