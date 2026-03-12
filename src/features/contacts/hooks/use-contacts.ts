import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import {
  listContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
  importContacts,
  listContactEvents,
  getContactCounters,
} from '../api/contacts-api'
import type {
  ContactFilterInput,
  ContactSortInput,
  CreateContactInput,
  UpdateContactInput,
  ContactEventFilterInput,
} from '../types'

const CONTACTS_KEY = ['contacts'] as const
const EVENTS_KEY = ['contact-events'] as const
const COUNTERS_KEY = ['contact-counters'] as const

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

export function useContactCounters() {
  return useQuery({
    queryKey: [...COUNTERS_KEY],
    queryFn: () => getContactCounters(),
    staleTime: 60_000, // 1 min cache
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTACTS_KEY })
      qc.invalidateQueries({ queryKey: COUNTERS_KEY })
    },
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTACTS_KEY })
      qc.invalidateQueries({ queryKey: COUNTERS_KEY })
    },
  })
}

export function useImportContacts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (inputs: CreateContactInput[]) => importContacts(inputs),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTACTS_KEY })
      qc.invalidateQueries({ queryKey: COUNTERS_KEY })
    },
  })
}

// ── Contact Events ──────────────────────────────────────────────────────────

export function useContactEvents(
  contactId: string | null,
  filter?: ContactEventFilterInput | null,
) {
  return useInfiniteQuery({
    queryKey: [...EVENTS_KEY, contactId, filter],
    queryFn: ({ pageParam }) => listContactEvents(contactId!, 30, pageParam as string | null, filter),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextToken ?? undefined,
    enabled: !!contactId,
  })
}
