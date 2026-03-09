import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/templates-api'
import type { TemplateDetail } from '../types'

const KEYS = {
  all: ['templates'] as const,
  list: () => [...KEYS.all, 'list'] as const,
  detail: (name: string) => [...KEYS.all, 'detail', name] as const,
  versions: (name: string) => [...KEYS.all, 'versions', name] as const,
}

// ── Queries ──────────────────────────────────────────────────────────────────

export function useTemplatesList() {
  return useQuery({
    queryKey: KEYS.list(),
    queryFn: api.listTemplates,
    staleTime: 30_000,
  })
}

export function useTemplateDetail(name: string | null) {
  return useQuery({
    queryKey: KEYS.detail(name!),
    queryFn: () => api.getTemplate(name!),
    enabled: !!name,
    staleTime: 60_000,
  })
}

export function useTemplateVersions(name: string | null) {
  return useQuery({
    queryKey: KEYS.versions(name!),
    queryFn: () => api.listTemplateVersions(name!),
    enabled: !!name,
    staleTime: 60_000,
  })
}

// ── Mutations ────────────────────────────────────────────────────────────────

export function useSaveTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.saveTemplate,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.list() })
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.name) })
      qc.invalidateQueries({ queryKey: KEYS.versions(variables.name) })
    },
  })
}

export function useDeleteTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteTemplate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.list() })
    },
  })
}

export function useDuplicateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sourceName, newName, newDisplayName }: { sourceName: string; newName: string; newDisplayName: string }) =>
      api.duplicateTemplate(sourceName, newName, newDisplayName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.list() })
    },
  })
}

export function useSendTestEmail() {
  return useMutation({
    mutationFn: ({
      templateName, toAddress, testData, configurationSet, fromAddress, tags,
    }: { templateName: string; toAddress: string; testData?: string; configurationSet?: string; fromAddress?: string; tags?: string }) =>
      api.sendTestEmail(templateName, toAddress, testData, configurationSet, fromAddress, tags),
  })
}

/** Prefetch a single template detail into the query cache. */
export function usePrefetchTemplate() {
  const qc = useQueryClient()
  return (name: string) =>
    qc.prefetchQuery({
      queryKey: KEYS.detail(name),
      queryFn: () => api.getTemplate(name),
      staleTime: 60_000,
    })
}

/** Update template detail optimistically in cache. */
export function useOptimisticUpdateTemplate() {
  const qc = useQueryClient()
  return (name: string, updater: (old: TemplateDetail) => TemplateDetail) => {
    qc.setQueryData<TemplateDetail>(KEYS.detail(name), (old) => {
      if (!old) return old
      return updater(old)
    })
  }
}
