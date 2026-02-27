/**
 * React Query hooks for SES identity management, account info,
 * configuration sets, suppression list, and template metadata.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/store/auth-store'
import {
  listAllIdentities,
  getIdentityDetail,
  createIdentity,
  deleteIdentity,
  getAccountInfo,
  listConfigurationSets,
  listSuppressedDestinations,
} from '../api/ses-identity-api'
import {
  listTemplateMetadata,
  saveTemplateMetadata,
  deleteTemplateMetadata,
  type TemplateMetadata,
} from '../api/config-api'

const IDENTITIES_KEY = ['ses-all-identities']
const ACCOUNT_KEY = ['ses-account']
const CONFIG_SETS_KEY = ['ses-config-sets']
const SUPPRESSION_KEY = ['ses-suppression']
const TEMPLATE_META_KEY = ['template-metadata']

function useCredentials() {
  const getCredentials = useAuthStore((s) => s.getCredentials)
  return () => {
    const creds = getCredentials()
    if (!creds) throw new Error('Sessão expirada. Faça login novamente.')
    return creds
  }
}

export function useAllIdentities() {
  const getCreds = useCredentials()
  return useQuery({
    queryKey: IDENTITIES_KEY,
    queryFn: () => listAllIdentities(getCreds()),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 3,
  })
}

export function useIdentityDetail(name: string | null) {
  const getCreds = useCredentials()
  return useQuery({
    queryKey: [...IDENTITIES_KEY, name],
    queryFn: () => getIdentityDetail(getCreds(), name!),
    enabled: !!name,
    refetchOnWindowFocus: false,
  })
}

export function useCreateIdentity() {
  const qc = useQueryClient()
  const getCreds = useCredentials()
  return useMutation({
    mutationFn: (identityName: string) => createIdentity(getCreds(), identityName),
    onSuccess: () => qc.invalidateQueries({ queryKey: IDENTITIES_KEY }),
  })
}

export function useDeleteIdentity() {
  const qc = useQueryClient()
  const getCreds = useCredentials()
  return useMutation({
    mutationFn: (identityName: string) => deleteIdentity(getCreds(), identityName),
    onSuccess: () => qc.invalidateQueries({ queryKey: IDENTITIES_KEY }),
  })
}

// ─── SES Account Info ────────────────────────────────────────────────────────

export function useSesAccount() {
  const getCreds = useCredentials()
  return useQuery({
    queryKey: ACCOUNT_KEY,
    queryFn: () => getAccountInfo(getCreds()),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
  })
}

// ─── Configuration Sets ──────────────────────────────────────────────────────

export function useConfigurationSets() {
  const getCreds = useCredentials()
  return useQuery({
    queryKey: CONFIG_SETS_KEY,
    queryFn: () => listConfigurationSets(getCreds()),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
  })
}

// ─── Suppression List ────────────────────────────────────────────────────────

export function useSuppressedDestinations() {
  const getCreds = useCredentials()
  return useQuery({
    queryKey: SUPPRESSION_KEY,
    queryFn: () => listSuppressedDestinations(getCreds()),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
  })
}

// ─── Template Metadata ───────────────────────────────────────────────────────

export function useTemplateMetadata() {
  const getCreds = useCredentials()
  return useQuery({
    queryKey: TEMPLATE_META_KEY,
    queryFn: () => listTemplateMetadata(getCreds()),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 2,
  })
}

export function useSaveTemplateMetadata() {
  const qc = useQueryClient()
  const getCreds = useCredentials()
  return useMutation({
    mutationFn: (data: { displayName: string; sesTemplateName: string }) =>
      saveTemplateMetadata(getCreds(), data),
    onSuccess: () => qc.invalidateQueries({ queryKey: TEMPLATE_META_KEY }),
  })
}

export function useDeleteTemplateMetadata() {
  const qc = useQueryClient()
  const getCreds = useCredentials()
  return useMutation({
    mutationFn: (sesTemplateName: string) => deleteTemplateMetadata(getCreds(), sesTemplateName),
    onSuccess: () => qc.invalidateQueries({ queryKey: TEMPLATE_META_KEY }),
  })
}

