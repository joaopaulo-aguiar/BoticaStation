import { generateClient } from 'aws-amplify/api'
import type { Segment, CreateSegmentInput, UpdateSegmentInput, SegmentCondition } from '../types'
import type { ContactListResult } from '@/features/contacts/types'

const client = generateClient()

// ── Fragments ────────────────────────────────────────────────────────────────

const SEGMENT_FIELDS = /* GraphQL */ `
  fragment SegmentFields on Segment {
    id
    name
    description
    conditionLogic
    conditions {
      field
      operator
      value
    }
    contactCount
    lastCountAt
    createdAt
    updatedAt
    createdBy
  }
`

// ── Queries ──────────────────────────────────────────────────────────────────

export async function listSegments(): Promise<Segment[]> {
  const query = /* GraphQL */ `
    ${SEGMENT_FIELDS}
    query ListSegments {
      listSegments { ...SegmentFields }
    }
  `
  const { data } = await client.graphql({ query }) as { data: { listSegments: Segment[] } }
  return data.listSegments
}

export async function getSegment(id: string): Promise<Segment> {
  const query = /* GraphQL */ `
    ${SEGMENT_FIELDS}
    query GetSegment($id: ID!) {
      getSegment(id: $id) { ...SegmentFields }
    }
  `
  const { data } = await client.graphql({ query, variables: { id } }) as { data: { getSegment: Segment } }
  return data.getSegment
}

// ── Mutations ────────────────────────────────────────────────────────────────

export async function createSegment(input: CreateSegmentInput): Promise<Segment> {
  const mutation = /* GraphQL */ `
    ${SEGMENT_FIELDS}
    mutation CreateSegment($input: CreateSegmentInput!) {
      createSegment(input: $input) { ...SegmentFields }
    }
  `
  const { data } = await client.graphql({ query: mutation, variables: { input } }) as { data: { createSegment: Segment } }
  return data.createSegment
}

export async function updateSegment(id: string, input: UpdateSegmentInput): Promise<Segment> {
  const mutation = /* GraphQL */ `
    ${SEGMENT_FIELDS}
    mutation UpdateSegment($id: ID!, $input: UpdateSegmentInput!) {
      updateSegment(id: $id, input: $input) { ...SegmentFields }
    }
  `
  const { data } = await client.graphql({ query: mutation, variables: { id, input } }) as { data: { updateSegment: Segment } }
  return data.updateSegment
}

export async function deleteSegment(id: string): Promise<boolean> {
  const mutation = /* GraphQL */ `
    mutation DeleteSegment($id: ID!) {
      deleteSegment(id: $id)
    }
  `
  const { data } = await client.graphql({ query: mutation, variables: { id } }) as { data: { deleteSegment: boolean } }
  return data.deleteSegment
}

// ── Segment Preview ──────────────────────────────────────────────────────────

const PREVIEW_CONTACT_FIELDS = /* GraphQL */ `
  id
  fullName
  email
  phone
  lifecycleStage
  tags
  status
  emailStatus
`

export async function previewSegmentContacts(
  conditions: SegmentCondition[],
  conditionLogic: string,
  search?: string,
  pageSize?: number,
  nextToken?: string,
): Promise<ContactListResult> {
  const query = /* GraphQL */ `
    query PreviewSegmentContacts(
      $conditions: [SegmentConditionInput!]!
      $conditionLogic: String
      $search: String
      $pageSize: Int
      $nextToken: String
    ) {
      previewSegmentContacts(
        conditions: $conditions
        conditionLogic: $conditionLogic
        search: $search
        pageSize: $pageSize
        nextToken: $nextToken
      ) {
        items { ${PREVIEW_CONTACT_FIELDS} }
        nextToken
        totalCount
      }
    }
  `
  const { data } = await client.graphql({
    query,
    variables: { conditions, conditionLogic, search: search || undefined, pageSize, nextToken },
  }) as { data: { previewSegmentContacts: ContactListResult } }
  return data.previewSegmentContacts
}
