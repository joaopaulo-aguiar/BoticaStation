import {
  ScanCommand,
  PutCommand,
  DeleteCommand,
  UpdateCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb'
import { v4 as uuidv4 } from 'uuid'
import { createDynamoClient } from '@/shared/lib/dynamodb'
import type { AWSSessionCredentials, Contact, ContactFormData } from '@/shared/types'
import { normalizePhone } from '@/shared/lib/utils'

const TABLE_NAME = 'Contact'

export async function fetchContacts(credentials: AWSSessionCredentials): Promise<Contact[]> {
  const client = createDynamoClient(credentials)

  const command = new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: 'SK = :sk',
    ExpressionAttributeValues: {
      ':sk': 'METADATA',
    },
  })

  const response = await client.send(command)
  return (response.Items as Contact[]) || []
}

export async function createContact(
  credentials: AWSSessionCredentials,
  data: ContactFormData
): Promise<Contact> {
  const client = createDynamoClient(credentials)
  const id = uuidv4()

  const contact: Contact = {
    PK: `CONTACT#${id}`,
    SK: 'METADATA',
    email: data.email,
    phone: normalizePhone(data.phone),
    full_name: data.full_name,
    lifecycle_stage: data.lifecycle_stage,
    cashback_info: {
      current_balance: data.cashback_balance || 0,
      lifetime_earned: 0,
      expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
    tags: data.tags || [],
    created_at: new Date().toISOString(),
    source: 'manual_input',
    status: 'active',
  }

  const command = new PutCommand({
    TableName: TABLE_NAME,
    Item: contact,
  })

  await client.send(command)
  return contact
}

export async function updateContact(
  credentials: AWSSessionCredentials,
  pk: string,
  data: Partial<ContactFormData>
): Promise<void> {
  const client = createDynamoClient(credentials)

  const updateExpressions: string[] = []
  const expressionAttributeNames: Record<string, string> = {}
  const expressionAttributeValues: Record<string, unknown> = {}

  if (data.full_name !== undefined) {
    updateExpressions.push('#fn = :fn')
    expressionAttributeNames['#fn'] = 'full_name'
    expressionAttributeValues[':fn'] = data.full_name
  }
  if (data.email !== undefined) {
    updateExpressions.push('#em = :em')
    expressionAttributeNames['#em'] = 'email'
    expressionAttributeValues[':em'] = data.email
  }
  if (data.phone !== undefined) {
    updateExpressions.push('#ph = :ph')
    expressionAttributeNames['#ph'] = 'phone'
    expressionAttributeValues[':ph'] = normalizePhone(data.phone)
  }
  if (data.lifecycle_stage !== undefined) {
    updateExpressions.push('#ls = :ls')
    expressionAttributeNames['#ls'] = 'lifecycle_stage'
    expressionAttributeValues[':ls'] = data.lifecycle_stage
  }
  if (data.tags !== undefined) {
    updateExpressions.push('#tg = :tg')
    expressionAttributeNames['#tg'] = 'tags'
    expressionAttributeValues[':tg'] = data.tags
  }

  if (updateExpressions.length === 0) return

  const command = new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: pk, SK: 'METADATA' },
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
  })

  await client.send(command)
}

export async function deleteContact(
  credentials: AWSSessionCredentials,
  pk: string
): Promise<void> {
  const client = createDynamoClient(credentials)

  const command = new DeleteCommand({
    TableName: TABLE_NAME,
    Key: { PK: pk, SK: 'METADATA' },
  })

  await client.send(command)
}

export async function batchImportContacts(
  credentials: AWSSessionCredentials,
  contacts: ContactFormData[]
): Promise<{ success: number; failed: number }> {
  const client = createDynamoClient(credentials)
  let success = 0
  let failed = 0

  // DynamoDB BatchWriteItem supports max 25 items per batch
  const BATCH_SIZE = 25
  const batches: Contact[][] = []

  const items: Contact[] = contacts.map((data) => {
    const id = uuidv4()
    return {
      PK: `CONTACT#${id}`,
      SK: 'METADATA',
      email: data.email,
      phone: normalizePhone(data.phone),
      full_name: data.full_name,
      lifecycle_stage: data.lifecycle_stage,
      cashback_info: {
        current_balance: data.cashback_balance || 0,
        lifetime_earned: 0,
        expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
      tags: data.tags || [],
      created_at: new Date().toISOString(),
      source: 'import_csv' as const,
      status: 'active' as const,
    }
  })

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    batches.push(items.slice(i, i + BATCH_SIZE))
  }

  for (const batch of batches) {
    try {
      const command = new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: batch.map((item) => ({
            PutRequest: { Item: item },
          })),
        },
      })

      await client.send(command)
      success += batch.length
    } catch {
      failed += batch.length
    }
  }

  return { success, failed }
}
