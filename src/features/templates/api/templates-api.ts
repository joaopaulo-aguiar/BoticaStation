import { generateClient } from 'aws-amplify/api'
import type { TemplateSummary, TemplateDetail, BackupVersion } from '../types'

const client = generateClient()

/** Convert a friendly display name to an SES-compatible slug. */
export function slugifyTemplateName(displayName: string): string {
  return displayName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 128)
}

// ── Queries ──────────────────────────────────────────────────────────────────

export async function listTemplates(): Promise<TemplateSummary[]> {
  const query = /* GraphQL */ `
    query ListTemplates {
      listTemplates {
        name
        displayName
        createdAt
        updatedAt
      }
    }
  `
  const { data } = await client.graphql({ query }) as { data: { listTemplates: TemplateSummary[] } }
  return data.listTemplates ?? []
}

export async function getTemplate(name: string): Promise<TemplateDetail> {
  const query = /* GraphQL */ `
    query GetTemplate($name: String!) {
      getTemplate(name: $name) {
        name
        displayName
        subject
        html
        text
        testData
      }
    }
  `
  const { data } = await client.graphql({ query, variables: { name } }) as { data: { getTemplate: TemplateDetail } }
  const detail = data.getTemplate
  if (detail.testData && typeof detail.testData === 'string') {
    try { detail.testData = JSON.parse(detail.testData) } catch { /* keep as is */ }
  }
  return detail
}

export async function listTemplateVersions(name: string): Promise<BackupVersion[]> {
  const query = /* GraphQL */ `
    query ListTemplateVersions($name: String!) {
      listTemplateVersions(name: $name) {
        version
        key
        lastModified
        size
      }
    }
  `
  const { data } = await client.graphql({ query, variables: { name } }) as { data: { listTemplateVersions: BackupVersion[] } }
  return data.listTemplateVersions ?? []
}

export async function getTemplateVersion(name: string, version: string): Promise<TemplateDetail> {
  const query = /* GraphQL */ `
    query GetTemplateVersion($name: String!, $version: String!) {
      getTemplateVersion(name: $name, version: $version) {
        name
        displayName
        subject
        html
        text
        testData
      }
    }
  `
  const { data } = await client.graphql({ query, variables: { name, version } }) as { data: { getTemplateVersion: TemplateDetail } }
  return data.getTemplateVersion
}

// ── Mutations ────────────────────────────────────────────────────────────────

export interface SaveTemplateInput {
  name: string
  displayName: string
  subject: string
  html: string
  text: string
  testData?: string
}

export async function saveTemplate(input: SaveTemplateInput): Promise<{ name: string; updatedAt: string }> {
  const mutation = /* GraphQL */ `
    mutation SaveTemplate($input: SaveTemplateInput!) {
      saveTemplate(input: $input) {
        name
        updatedAt
      }
    }
  `
  const { data } = await client.graphql({ query: mutation, variables: { input } }) as { data: { saveTemplate: { name: string; updatedAt: string } } }
  return data.saveTemplate
}

export async function deleteTemplate(name: string): Promise<boolean> {
  const mutation = /* GraphQL */ `
    mutation DeleteTemplate($name: String!) {
      deleteTemplate(name: $name)
    }
  `
  const { data } = await client.graphql({ query: mutation, variables: { name } }) as { data: { deleteTemplate: boolean } }
  return data.deleteTemplate
}

export async function duplicateTemplate(sourceName: string, newName: string, newDisplayName: string): Promise<{ name: string }> {
  const mutation = /* GraphQL */ `
    mutation DuplicateTemplate($sourceName: String!, $newName: String!, $newDisplayName: String!) {
      duplicateTemplate(sourceName: $sourceName, newName: $newName, newDisplayName: $newDisplayName) {
        name
      }
    }
  `
  const { data } = await client.graphql({ query: mutation, variables: { sourceName, newName, newDisplayName } }) as { data: { duplicateTemplate: { name: string } } }
  return data.duplicateTemplate
}

export async function sendTestEmail(
  templateName: string,
  toAddress: string,
  testData?: string,
): Promise<{ messageId: string }> {
  const mutation = /* GraphQL */ `
    mutation SendTestEmail($templateName: String!, $toAddress: String!, $testData: AWSJSON) {
      sendTestEmail(templateName: $templateName, toAddress: $toAddress, testData: $testData) {
        messageId
      }
    }
  `
  const { data } = await client.graphql({
    query: mutation,
    variables: { templateName, toAddress, testData },
  }) as { data: { sendTestEmail: { messageId: string } } }
  return data.sendTestEmail
}
