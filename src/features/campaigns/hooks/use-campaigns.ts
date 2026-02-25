/**
 * React Query hooks for campaign operations.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/store/auth-store'
import {
  listCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  duplicateCampaign,
  sendCampaign,
  getRecipientsByTags,
} from '../api/campaigns-api'
import type { CampaignFormData, Campaign } from '../types'

const CAMPAIGNS_KEY = ['campaigns']

function useCredentials() {
  const getCredentials = useAuthStore((s) => s.getCredentials)
  return () => {
    const creds = getCredentials()
    if (!creds) throw new Error('Sessão expirada. Faça login novamente.')
    return creds
  }
}

export function useCampaigns() {
  const getCreds = useCredentials()
  return useQuery({
    queryKey: CAMPAIGNS_KEY,
    queryFn: () => listCampaigns(getCreds()),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 2,
  })
}

export function useCampaign(id: string | null) {
  const getCreds = useCredentials()
  return useQuery({
    queryKey: [...CAMPAIGNS_KEY, id],
    queryFn: () => getCampaign(getCreds(), id!),
    enabled: !!id,
    refetchOnWindowFocus: false,
  })
}

export function useCreateCampaign() {
  const qc = useQueryClient()
  const getCreds = useCredentials()
  return useMutation({
    mutationFn: (data: CampaignFormData) => createCampaign(getCreds(), data),
    onSuccess: () => qc.invalidateQueries({ queryKey: CAMPAIGNS_KEY }),
  })
}

export function useUpdateCampaign() {
  const qc = useQueryClient()
  const getCreds = useCredentials()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CampaignFormData> & { status?: Campaign['status'] } }) =>
      updateCampaign(getCreds(), id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: CAMPAIGNS_KEY }),
  })
}

export function useDeleteCampaign() {
  const qc = useQueryClient()
  const getCreds = useCredentials()
  return useMutation({
    mutationFn: (id: string) => deleteCampaign(getCreds(), id),
    onSuccess: () => qc.invalidateQueries({ queryKey: CAMPAIGNS_KEY }),
  })
}

export function useDuplicateCampaign() {
  const qc = useQueryClient()
  const getCreds = useCredentials()
  return useMutation({
    mutationFn: ({ id, newName }: { id: string; newName: string }) =>
      duplicateCampaign(getCreds(), id, newName),
    onSuccess: () => qc.invalidateQueries({ queryKey: CAMPAIGNS_KEY }),
  })
}

export function useSendCampaign() {
  const qc = useQueryClient()
  const getCreds = useCredentials()
  return useMutation({
    mutationFn: ({ campaignId, emails }: { campaignId: string; emails: string[] }) =>
      sendCampaign(getCreds(), campaignId, emails),
    onSuccess: () => qc.invalidateQueries({ queryKey: CAMPAIGNS_KEY }),
  })
}

export function useRecipientsByTags(tags: string[], enabled = true) {
  const getCreds = useCredentials()
  return useQuery({
    queryKey: ['recipients', ...tags],
    queryFn: () => getRecipientsByTags(getCreds(), tags),
    enabled: enabled && tags.length > 0,
    refetchOnWindowFocus: false,
  })
}
