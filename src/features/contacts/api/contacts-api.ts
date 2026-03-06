import { generateClient } from 'aws-amplify/api'
import type {
  Contact,
  ContactListResult,
  CreateContactInput,
  UpdateContactInput,
  ContactFilterInput,
  ContactSortInput,
  ImportResult,
} from '../types'

const client = generateClient()

// ── Fragments ────────────────────────────────────────────────────────────────

const CONTACT_FIELDS = /* GraphQL */ `
  fragment ContactFields on Contact {
    id
    email
    phone
    fullName
    lifecycleStage
    cashbackInfo {
      currentBalance
      lifetimeEarned
      expiryDate
    }
    tags
    createdAt
    updatedAt
    source
    status
    emailStatus
    emailFailReason
    phoneStatus
    createdBy
    updatedBy
  }
`

// ── Queries ──────────────────────────────────────────────────────────────────

export async function listContacts(
  pageSize?: number,
  nextToken?: string | null,
  filter?: ContactFilterInput | null,
  sort?: ContactSortInput | null,
): Promise<ContactListResult> {
  const query = /* GraphQL */ `
    ${CONTACT_FIELDS}
    query ListContacts($pageSize: Int, $nextToken: String, $filter: ContactFilterInput, $sort: ContactSortInput) {
      listContacts(pageSize: $pageSize, nextToken: $nextToken, filter: $filter, sort: $sort) {
        items { ...ContactFields }
        nextToken
        totalCount
      }
    }
  `
  const { data } = await client.graphql({
    query,
    variables: {
      pageSize: pageSize ?? 50,
      nextToken: nextToken ?? null,
      filter: filter ?? null,
      sort: sort ?? null,
    },
  }) as { data: { listContacts: ContactListResult } }
  return data.listContacts
}

export async function getContact(id: string): Promise<Contact> {
  const query = /* GraphQL */ `
    ${CONTACT_FIELDS}
    query GetContact($id: ID!) {
      getContact(id: $id) { ...ContactFields }
    }
  `
  const { data } = await client.graphql({ query, variables: { id } }) as { data: { getContact: Contact } }
  return data.getContact
}

export async function findContactByEmail(email: string): Promise<Contact | null> {
  const query = /* GraphQL */ `
    ${CONTACT_FIELDS}
    query FindContactByEmail($email: String!) {
      findContactByEmail(email: $email) { ...ContactFields }
    }
  `
  const { data } = await client.graphql({ query, variables: { email } }) as { data: { findContactByEmail: Contact | null } }
  return data.findContactByEmail
}

// ── Mutations ────────────────────────────────────────────────────────────────

export async function createContact(input: CreateContactInput): Promise<Contact> {
  const mutation = /* GraphQL */ `
    ${CONTACT_FIELDS}
    mutation CreateContact($input: CreateContactInput!) {
      createContact(input: $input) { ...ContactFields }
    }
  `
  const { data } = await client.graphql({ query: mutation, variables: { input } }) as { data: { createContact: Contact } }
  return data.createContact
}

export async function updateContact(id: string, input: UpdateContactInput): Promise<Contact> {
  const mutation = /* GraphQL */ `
    ${CONTACT_FIELDS}
    mutation UpdateContact($id: ID!, $input: UpdateContactInput!) {
      updateContact(id: $id, input: $input) { ...ContactFields }
    }
  `
  const { data } = await client.graphql({ query: mutation, variables: { id, input } }) as { data: { updateContact: Contact } }
  return data.updateContact
}

export async function deleteContact(id: string): Promise<boolean> {
  const mutation = /* GraphQL */ `
    mutation DeleteContact($id: ID!) {
      deleteContact(id: $id)
    }
  `
  const { data } = await client.graphql({ query: mutation, variables: { id } }) as { data: { deleteContact: boolean } }
  return data.deleteContact
}

export async function importContacts(inputs: CreateContactInput[]): Promise<ImportResult> {
  const mutation = /* GraphQL */ `
    mutation ImportContacts($inputs: [CreateContactInput!]!) {
      importContacts(inputs: $inputs) {
        success
        failed
        errors
      }
    }
  `
  const { data } = await client.graphql({ query: mutation, variables: { inputs } }) as { data: { importContacts: ImportResult } }
  return data.importContacts
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Normalize a Brazilian phone number to +55XXXXXXXXXXX format. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('55') && digits.length >= 12) return `+${digits}`
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`
  return raw.trim()
}
