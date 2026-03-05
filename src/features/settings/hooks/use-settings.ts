import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/settings-api'

const KEYS = {
  identities: ['ses-identities'] as const,
}

export function useVerifiedIdentities() {
  return useQuery({
    queryKey: KEYS.identities,
    queryFn: api.listVerifiedIdentities,
    staleTime: 30_000,
  })
}

export function useRequestEmailVerification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.requestEmailVerification,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.identities })
    },
  })
}

export function useDeleteVerifiedIdentity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteVerifiedIdentity,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.identities })
    },
  })
}
