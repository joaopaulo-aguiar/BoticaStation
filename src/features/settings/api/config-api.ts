/**
 * Config DynamoDB table API.
 *
 * Uses the "Config" table (PK = PK, SK = SK) to store
 * system metadata such as template display-name mappings.
 */
import {
  PutCommand,
  GetCommand,
  QueryCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb'
import { createDynamoClient } from '@/shared/lib/dynamodb'
import type { AWSSessionCredentials } from '@/shared/types'

const TABLE_NAME = 'Config'

// ─── Template Metadata ───────────────────────────────────────────────────────

export interface TemplateMetadata {
  PK: string // "TEMPLATE_META"
  SK: string // SES template name (slug)
  displayName: string // Friendly name typed by user
  sesTemplateName: string // Slug stored in SES
  createdAt: string
  updatedAt: string
}

/**
 * Convert a user-friendly template name into an SES-safe slug.
 * Rules: lowercase, spaces/pipes/special chars → underscores, trim edges.
 * "Promo | Final de Semana | 25-02-26" → "promo_final_de_semana_25-02-26"
 */
export function toSesTemplateName(displayName: string): string {
  return displayName
    .trim()
    .toLowerCase()
    .replace(/\|/g, '_')
    .replace(/[^a-z0-9_\-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

/**
 * Save template metadata (display name ↔ SES name mapping).
 */
export async function saveTemplateMetadata(
  credentials: AWSSessionCredentials,
  data: { displayName: string; sesTemplateName: string },
): Promise<TemplateMetadata> {
  const client = createDynamoClient(credentials)
  const now = new Date().toISOString()

  // Try to find existing entry
  const existing = await getTemplateMetadataBySesName(credentials, data.sesTemplateName)

  const item: TemplateMetadata = {
    PK: 'TEMPLATE_META',
    SK: data.sesTemplateName,
    displayName: data.displayName,
    sesTemplateName: data.sesTemplateName,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }

  await client.send(new PutCommand({ TableName: TABLE_NAME, Item: item }))
  return item
}

/**
 * Get template metadata by SES template name.
 */
export async function getTemplateMetadataBySesName(
  credentials: AWSSessionCredentials,
  sesTemplateName: string,
): Promise<TemplateMetadata | null> {
  const client = createDynamoClient(credentials)

  const res = await client.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: 'TEMPLATE_META', SK: sesTemplateName },
    }),
  )

  return (res.Item as TemplateMetadata) ?? null
}

/**
 * List all template metadata entries.
 */
export async function listTemplateMetadata(
  credentials: AWSSessionCredentials,
): Promise<TemplateMetadata[]> {
  const client = createDynamoClient(credentials)

  const res = await client.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': 'TEMPLATE_META' },
    }),
  )

  return (res.Items as TemplateMetadata[]) ?? []
}

/**
 * Delete template metadata.
 */
export async function deleteTemplateMetadata(
  credentials: AWSSessionCredentials,
  sesTemplateName: string,
): Promise<void> {
  const client = createDynamoClient(credentials)

  await client.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { PK: 'TEMPLATE_META', SK: sesTemplateName },
    }),
  )
}
