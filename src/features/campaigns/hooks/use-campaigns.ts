import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/campaigns-api'
import type { UpdateCampaignInput, UpdateCampaignSettingsInput, UpdateTagInput } from '../types'

const KEYS = {
  all: ['campaigns'] as const,
  list: () => [...KEYS.all, 'list'] as const,
  detail: (id: string) => [...KEYS.all, 'detail', id] as const,
  settings: () => [...KEYS.all, 'settings'] as const,
  tags: () => [...KEYS.all, 'tags'] as const,
}

// ── Queries ──────────────────────────────────────────────────────────────────

export function useCampaignsList() {
  return useQuery({
    queryKey: KEYS.list(),
    queryFn: api.listCampaigns,
    staleTime: 30_000,
  })
}

export function useCampaignDetail(id: string | null) {
  return useQuery({
    queryKey: KEYS.detail(id!),
    queryFn: () => api.getCampaign(id!),
    enabled: !!id,
    staleTime: 60_000,
  })
}

export function useCampaignSettings() {
  return useQuery({
    queryKey: KEYS.settings(),
    queryFn: api.getCampaignSettings,
    staleTime: 120_000,
  })
}

// ── Mutations ────────────────────────────────────────────────────────────────

export function useCreateCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createCampaign,
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.list() }) },
  })
}

export function useUpdateCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCampaignInput }) =>
      api.updateCampaign(id, input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.list() })
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.id) })
    },
  })
}

export function useDeleteCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteCampaign,
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.list() }) },
  })
}

export function useSendCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.sendCampaign,
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: KEYS.list() })
      qc.invalidateQueries({ queryKey: KEYS.detail(id) })
    },
  })
}

export function usePauseCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.pauseCampaign,
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: KEYS.list() })
      qc.invalidateQueries({ queryKey: KEYS.detail(id) })
    },
  })
}

export function useCancelCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.cancelCampaign,
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: KEYS.list() })
      qc.invalidateQueries({ queryKey: KEYS.detail(id) })
    },
  })
}

// ── Schedule Management ──────────────────────────────────────────────────────

export function useScheduleCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, scheduledAt }: { id: string; scheduledAt: string }) =>
      api.scheduleCampaign(id, scheduledAt),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.list() })
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.id) })
    },
  })
}

export function useRescheduleCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, scheduledAt }: { id: string; scheduledAt: string }) =>
      api.rescheduleCampaign(id, scheduledAt),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.list() })
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.id) })
    },
  })
}

export function useResumeCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.resumeCampaign,
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: KEYS.list() })
      qc.invalidateQueries({ queryKey: KEYS.detail(id) })
    },
  })
}

export function useDuplicateCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.duplicateCampaign,
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.list() }) },
  })
}

export function useUpdateCampaignSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateCampaignSettingsInput) =>
      api.updateCampaignSettings(input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.settings() }) },
  })
}

// ── Campaign Tags ────────────────────────────────────────────────────────────

export function useCampaignTags() {
  return useQuery({
    queryKey: KEYS.tags(),
    queryFn: api.listCampaignTags,
    staleTime: 60_000,
  })
}

export function useCreateCampaignTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createCampaignTag,
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.tags() }) },
  })
}

export function useUpdateCampaignTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTagInput }) =>
      api.updateCampaignTag(id, input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.tags() }) },
  })
}

export function useDeleteCampaignTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteCampaignTag,
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.tags() }) },
  })
}
