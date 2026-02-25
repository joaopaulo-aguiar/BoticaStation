/**
 * React Query hooks for SES identity management.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/store/auth-store'
import {
  listAllIdentities,
  getIdentityDetail,
  createIdentity,
  deleteIdentity,
} from '../api/ses-identity-api'

const IDENTITIES_KEY = ['ses-all-identities']

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
