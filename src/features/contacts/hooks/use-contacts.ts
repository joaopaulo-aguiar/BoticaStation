import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/store/auth-store'
import {
  fetchContacts,
  createContact,
  updateContact,
  deleteContact,
  batchImportContacts,
} from '@/features/contacts/api/contacts-api'
import type { ContactFormData } from '@/shared/types'

const CONTACTS_KEY = ['contacts']

export function useContacts() {
  const getCredentials = useAuthStore((s) => s.getCredentials)

  return useQuery({
    queryKey: CONTACTS_KEY,
    queryFn: () => {
      const creds = getCredentials()
      if (!creds) throw new Error('Sessão expirada. Faça login novamente.')
      return fetchContacts(creds)
    },
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 2, // 2 min
  })
}

export function useCreateContact() {
  const queryClient = useQueryClient()
  const getCredentials = useAuthStore((s) => s.getCredentials)

  return useMutation({
    mutationFn: (data: ContactFormData) => {
      const creds = getCredentials()
      if (!creds) throw new Error('Sessão expirada.')
      return createContact(creds, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTACTS_KEY })
    },
  })
}

export function useUpdateContact() {
  const queryClient = useQueryClient()
  const getCredentials = useAuthStore((s) => s.getCredentials)

  return useMutation({
    mutationFn: ({ pk, data }: { pk: string; data: Partial<ContactFormData> }) => {
      const creds = getCredentials()
      if (!creds) throw new Error('Sessão expirada.')
      return updateContact(creds, pk, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTACTS_KEY })
    },
  })
}

export function useDeleteContact() {
  const queryClient = useQueryClient()
  const getCredentials = useAuthStore((s) => s.getCredentials)

  return useMutation({
    mutationFn: (pk: string) => {
      const creds = getCredentials()
      if (!creds) throw new Error('Sessão expirada.')
      return deleteContact(creds, pk)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTACTS_KEY })
    },
  })
}

export function useImportContacts() {
  const queryClient = useQueryClient()
  const getCredentials = useAuthStore((s) => s.getCredentials)

  return useMutation({
    mutationFn: (contacts: ContactFormData[]) => {
      const creds = getCredentials()
      if (!creds) throw new Error('Sessão expirada.')
      return batchImportContacts(creds, contacts)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTACTS_KEY })
    },
  })
}
