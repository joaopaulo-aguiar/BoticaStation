import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/settings-api'
import type { UpdateUserInput } from '../types'

const KEYS = {
  identities: ['ses-identities'] as const,
  sesStatus: ['ses-status'] as const,
  senderProfiles: ['sender-profiles'] as const,
  users: ['cognito-users'] as const,
  groups: ['cognito-groups'] as const,
}

// ── SES ──────────────────────────────────────────────────────────────────────

export function useSesAccountStatus() {
  return useQuery({
    queryKey: KEYS.sesStatus,
    queryFn: api.getSesAccountStatus,
    staleTime: 60_000,
  })
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.identities }) },
  })
}

export function useVerifyDomain() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.verifyDomain,
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.identities }) },
  })
}

export function useDeleteVerifiedIdentity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteVerifiedIdentity,
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.identities }) },
  })
}

// ── Sender Profiles ──────────────────────────────────────────────────────────

export function useSenderProfiles() {
  return useQuery({
    queryKey: KEYS.senderProfiles,
    queryFn: api.listSenderProfiles,
    staleTime: 30_000,
  })
}

export function useCreateSenderProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createSenderProfile,
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.senderProfiles }) },
  })
}

export function useDeleteSenderProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteSenderProfile,
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.senderProfiles }) },
  })
}

// ── Cognito Users ────────────────────────────────────────────────────────────

export function useUsersList() {
  return useQuery({
    queryKey: KEYS.users,
    queryFn: api.listUsers,
    staleTime: 30_000,
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createUser,
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.users }) },
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ username, input }: { username: string; input: UpdateUserInput }) =>
      api.updateUser(username, input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.users }) },
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteUser,
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.users }) },
  })
}

export function useAddUserToGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ username, group }: { username: string; group: string }) =>
      api.addUserToGroup(username, group),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.users }) },
  })
}

export function useRemoveUserFromGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ username, group }: { username: string; group: string }) =>
      api.removeUserFromGroup(username, group),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.users }) },
  })
}

export function useResetUserPassword() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.resetUserPassword,
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.users }) },
  })
}

// ── Cognito Groups ───────────────────────────────────────────────────────────

export function useGroupsList() {
  return useQuery({
    queryKey: KEYS.groups,
    queryFn: api.listGroups,
    staleTime: 60_000,
  })
}
