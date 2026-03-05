import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
  importContacts,
} from '../api/contacts-api'
import type {
  ContactFilterInput,
  ContactSortInput,
  CreateContactInput,
  UpdateContactInput,
} from '../types'

const CONTACTS_KEY = ['contacts'] as const

export function useContactsList(
  pageSize?: number,
  nextToken?: string | null,
  filter?: ContactFilterInput | null,
  sort?: ContactSortInput | null,
) {
  return useQuery({
    queryKey: [...CONTACTS_KEY, 'list', pageSize, nextToken, filter, sort],
    queryFn: () => listContacts(pageSize, nextToken, filter, sort),
  })
}

export function useContactDetail(id: string | null) {
  return useQuery({
    queryKey: [...CONTACTS_KEY, 'detail', id],
    queryFn: () => getContact(id!),
    enabled: !!id,
  })
}

export function useCreateContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateContactInput) => createContact(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: CONTACTS_KEY }),
  })
}

export function useUpdateContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateContactInput }) => updateContact(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: CONTACTS_KEY }),
  })
}

export function useDeleteContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteContact(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: CONTACTS_KEY }),
  })
}

export function useImportContacts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (inputs: CreateContactInput[]) => importContacts(inputs),
    onSuccess: () => qc.invalidateQueries({ queryKey: CONTACTS_KEY }),
  })
}
