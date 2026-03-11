import { generateClient } from 'aws-amplify/api'
import type { TemplateSummary, TemplateDetail, TemplateUtmDefaults, BackupVersion } from '../types'

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
  // Extract UTM defaults stored inside testData
  if (detail.testData && typeof detail.testData === 'object' && '__utmDefaults__' in detail.testData) {
    detail.utmDefaults = detail.testData.__utmDefaults__ as TemplateUtmDefaults
    delete detail.testData.__utmDefaults__
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
  utmDefaults?: TemplateUtmDefaults
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
  // Merge utmDefaults into testData for persistence
  let testDataStr = input.testData
  if (input.utmDefaults) {
    const hasValues = input.utmDefaults.utmSource || input.utmDefaults.utmMedium || input.utmDefaults.utmCampaign
    if (hasValues) {
      const parsed = testDataStr ? JSON.parse(testDataStr) : {}
      parsed.__utmDefaults__ = input.utmDefaults
      testDataStr = JSON.stringify(parsed)
    }
  }
  const gqlInput = {
    name: input.name,
    displayName: input.displayName,
    subject: input.subject,
    html: input.html,
    text: input.text,
    testData: testDataStr,
  }
  const { data } = await client.graphql({ query: mutation, variables: { input: gqlInput } }) as { data: { saveTemplate: { name: string; updatedAt: string } } }
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
  configurationSet?: string,
  fromAddress?: string,
  tags?: string,
): Promise<{ messageId: string }> {
  const mutation = /* GraphQL */ `
    mutation SendTestEmail($templateName: String!, $toAddress: String!, $fromAddress: String, $testData: AWSJSON, $configurationSet: String, $tags: AWSJSON) {
      sendTestEmail(templateName: $templateName, toAddress: $toAddress, fromAddress: $fromAddress, testData: $testData, configurationSet: $configurationSet, tags: $tags) {
        messageId
      }
    }
  `
  const { data } = await client.graphql({
    query: mutation,
    variables: { templateName, toAddress, fromAddress, testData, configurationSet, tags },
  }) as { data: { sendTestEmail: { messageId: string } } }
  return data.sendTestEmail
}
