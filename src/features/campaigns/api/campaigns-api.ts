import { generateClient } from 'aws-amplify/api'
import type { Campaign, CreateCampaignInput, UpdateCampaignInput, CampaignSettings, UpdateCampaignSettingsInput } from '../types'

const client = generateClient()

const CAMPAIGN_FIELDS = /* GraphQL */ `
  id
  name
  subject
  templateName
  senderProfileId
  recipientType
  recipientFilter
  segmentId
  status
  scheduledAt
  sentAt
  completedAt
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
  scheduleArn
  timezone
  utmParams
  estimatedRecipients
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

export async function getCampaignSettings(): Promise<CampaignSettings> {
  const query = /* GraphQL */ `
    query GetCampaignSettings {
      getCampaignSettings {
        timezone
        scheduleGroupName
        defaultUtmSource
        defaultUtmMedium
      }
    }
  `
  const { data } = await client.graphql({ query }) as { data: { getCampaignSettings: CampaignSettings } }
  return data.getCampaignSettings
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

// ── Schedule Management ──────────────────────────────────────────────────────

export async function scheduleCampaign(id: string, scheduledAt: string): Promise<Campaign> {
  const mutation = /* GraphQL */ `
    mutation ScheduleCampaign($id: ID!, $scheduledAt: AWSDateTime!) {
      scheduleCampaign(id: $id, scheduledAt: $scheduledAt) {
        ${CAMPAIGN_FIELDS}
      }
    }
  `
  const { data } = await client.graphql({ query: mutation, variables: { id, scheduledAt } }) as { data: { scheduleCampaign: Campaign } }
  return data.scheduleCampaign
}

export async function rescheduleCampaign(id: string, scheduledAt: string): Promise<Campaign> {
  const mutation = /* GraphQL */ `
    mutation RescheduleCampaign($id: ID!, $scheduledAt: AWSDateTime!) {
      rescheduleCampaign(id: $id, scheduledAt: $scheduledAt) {
        ${CAMPAIGN_FIELDS}
      }
    }
  `
  const { data } = await client.graphql({ query: mutation, variables: { id, scheduledAt } }) as { data: { rescheduleCampaign: Campaign } }
  return data.rescheduleCampaign
}

export async function resumeCampaign(id: string): Promise<Campaign> {
  const mutation = /* GraphQL */ `
    mutation ResumeCampaign($id: ID!) {
      resumeCampaign(id: $id) {
        ${CAMPAIGN_FIELDS}
      }
    }
  `
  const { data } = await client.graphql({ query: mutation, variables: { id } }) as { data: { resumeCampaign: Campaign } }
  return data.resumeCampaign
}

export async function duplicateCampaign(id: string): Promise<Campaign> {
  const mutation = /* GraphQL */ `
    mutation DuplicateCampaign($id: ID!) {
      duplicateCampaign(id: $id) {
        ${CAMPAIGN_FIELDS}
      }
    }
  `
  const { data } = await client.graphql({ query: mutation, variables: { id } }) as { data: { duplicateCampaign: Campaign } }
  return data.duplicateCampaign
}

export async function updateCampaignSettings(input: UpdateCampaignSettingsInput): Promise<CampaignSettings> {
  const mutation = /* GraphQL */ `
    mutation UpdateCampaignSettings($input: UpdateCampaignSettingsInput!) {
      updateCampaignSettings(input: $input) {
        timezone
        scheduleGroupName
        defaultUtmSource
        defaultUtmMedium
      }
    }
  `
  const { data } = await client.graphql({ query: mutation, variables: { input } }) as { data: { updateCampaignSettings: CampaignSettings } }
  return data.updateCampaignSettings
}
