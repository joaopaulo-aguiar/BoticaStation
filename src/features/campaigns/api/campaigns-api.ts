import { generateClient } from 'aws-amplify/api'
import type { Campaign, CreateCampaignInput, UpdateCampaignInput } from '../types'

const client = generateClient()

const CAMPAIGN_FIELDS = /* GraphQL */ `
  id
  name
  subject
  templateName
  senderProfileId
  recipientFilter
  status
  scheduledAt
  sentAt
  metrics {
    sent
    delivered
    opened
    clicked
    bounced
    complained
    unsubscribed
  }
  configurationSet
  createdAt
  updatedAt
  createdBy
`

// ── Queries ──────────────────────────────────────────────────────────────────

export async function listCampaigns(): Promise<Campaign[]> {
  const query = /* GraphQL */ `
    query ListCampaigns {
      listCampaigns {
        ${CAMPAIGN_FIELDS}
      }
    }
  `
  const { data } = await client.graphql({ query }) as { data: { listCampaigns: Campaign[] } }
  return data.listCampaigns ?? []
}

export async function getCampaign(id: string): Promise<Campaign> {
  const query = /* GraphQL */ `
    query GetCampaign($id: ID!) {
      getCampaign(id: $id) {
        ${CAMPAIGN_FIELDS}
      }
    }
  `
  const { data } = await client.graphql({ query, variables: { id } }) as { data: { getCampaign: Campaign } }
  return data.getCampaign
}

// ── Mutations ────────────────────────────────────────────────────────────────

export async function createCampaign(input: CreateCampaignInput): Promise<Campaign> {
  const mutation = /* GraphQL */ `
    mutation CreateCampaign($input: CreateCampaignInput!) {
      createCampaign(input: $input) {
        ${CAMPAIGN_FIELDS}
      }
    }
  `
  const { data } = await client.graphql({ query: mutation, variables: { input } }) as { data: { createCampaign: Campaign } }
  return data.createCampaign
}

export async function updateCampaign(id: string, input: UpdateCampaignInput): Promise<Campaign> {
  const mutation = /* GraphQL */ `
    mutation UpdateCampaign($id: ID!, $input: UpdateCampaignInput!) {
      updateCampaign(id: $id, input: $input) {
        ${CAMPAIGN_FIELDS}
      }
    }
  `
  const { data } = await client.graphql({ query: mutation, variables: { id, input } }) as { data: { updateCampaign: Campaign } }
  return data.updateCampaign
}

export async function deleteCampaign(id: string): Promise<boolean> {
  const mutation = /* GraphQL */ `
    mutation DeleteCampaign($id: ID!) {
      deleteCampaign(id: $id)
    }
  `
  const { data } = await client.graphql({ query: mutation, variables: { id } }) as { data: { deleteCampaign: boolean } }
  return data.deleteCampaign
}

export async function sendCampaign(id: string): Promise<Campaign> {
  const mutation = /* GraphQL */ `
    mutation SendCampaign($id: ID!) {
      sendCampaign(id: $id) {
        ${CAMPAIGN_FIELDS}
      }
    }
  `
  const { data } = await client.graphql({ query: mutation, variables: { id } }) as { data: { sendCampaign: Campaign } }
  return data.sendCampaign
}

export async function pauseCampaign(id: string): Promise<Campaign> {
  const mutation = /* GraphQL */ `
    mutation PauseCampaign($id: ID!) {
      pauseCampaign(id: $id) {
        ${CAMPAIGN_FIELDS}
      }
    }
  `
  const { data } = await client.graphql({ query: mutation, variables: { id } }) as { data: { pauseCampaign: Campaign } }
  return data.pauseCampaign
}

export async function cancelCampaign(id: string): Promise<Campaign> {
  const mutation = /* GraphQL */ `
    mutation CancelCampaign($id: ID!) {
      cancelCampaign(id: $id) {
        ${CAMPAIGN_FIELDS}
      }
    }
  `
  const { data } = await client.graphql({ query: mutation, variables: { id } }) as { data: { cancelCampaign: Campaign } }
  return data.cancelCampaign
}
