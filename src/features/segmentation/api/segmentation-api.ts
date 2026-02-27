/**
 * Segmentation API — DynamoDB operations for segments.
 *
 * Uses its own "Segments" table (single-table design):
 *   PK: SEGMENT#<uuid>  SK: METADATA     → Segment definition
 *   PK: SEGMENT#<uuid>  SK: MEMBER#<email> → Static segment member
 *
 * Dynamic segments evaluate rules against the Contact table on-the-fly.
 */
import {
  ScanCommand,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb'
import { v4 as uuidv4 } from 'uuid'
import { createDynamoClient } from '@/shared/lib/dynamodb'
import type { AWSSessionCredentials, Contact } from '@/shared/types'
import type {
  Segment,
  SegmentFormData,
  SegmentMember,
  SegmentRuleGroup,
  SegmentCondition,
  ConditionOperator,
} from '../types'

const TABLE_NAME = 'Segments'
const CONTACT_TABLE = 'Contact'

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function listSegments(
  credentials: AWSSessionCredentials,
): Promise<Segment[]> {
  const client = createDynamoClient(credentials)

  const response = await client.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'SK = :sk',
      ExpressionAttributeValues: { ':sk': 'METADATA' },
    }),
  )

  return ((response.Items as Segment[]) ?? []).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}

export async function getSegment(
  credentials: AWSSessionCredentials,
  segmentId: string,
): Promise<Segment | null> {
  const client = createDynamoClient(credentials)

  const res = await client.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `SEGMENT#${segmentId}`, SK: 'METADATA' },
    }),
  )

  return (res.Item as Segment) ?? null
}

export async function createSegment(
  credentials: AWSSessionCredentials,
  data: SegmentFormData,
): Promise<Segment> {
  const client = createDynamoClient(credentials)
  const id = uuidv4()
  const now = new Date().toISOString()

  const segment: Segment = {
    PK: `SEGMENT#${id}`,
    SK: 'METADATA',
    id,
    name: data.name,
    description: data.description,
    type: data.type,
    rules: data.rules,
    contactCount: 0,
    createdAt: now,
    updatedAt: now,
  }

  await client.send(new PutCommand({ TableName: TABLE_NAME, Item: segment }))
  return segment
}

export async function updateSegment(
  credentials: AWSSessionCredentials,
  segmentId: string,
  data: Partial<SegmentFormData>,
): Promise<void> {
  const client = createDynamoClient(credentials)

  const exprs: string[] = ['#ua = :ua']
  const names: Record<string, string> = { '#ua': 'updatedAt' }
  const vals: Record<string, unknown> = { ':ua': new Date().toISOString() }

  if (data.name !== undefined) {
    exprs.push('#nm = :nm')
    names['#nm'] = 'name'
    vals[':nm'] = data.name
  }
  if (data.description !== undefined) {
    exprs.push('#ds = :ds')
    names['#ds'] = 'description'
    vals[':ds'] = data.description
  }
  if (data.type !== undefined) {
    exprs.push('#tp = :tp')
    names['#tp'] = 'type'
    vals[':tp'] = data.type
  }
  if (data.rules !== undefined) {
    exprs.push('#rl = :rl')
    names['#rl'] = 'rules'
    vals[':rl'] = data.rules
  }

  await client.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `SEGMENT#${segmentId}`, SK: 'METADATA' },
      UpdateExpression: `SET ${exprs.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: vals,
    }),
  )
}

export async function deleteSegment(
  credentials: AWSSessionCredentials,
  segmentId: string,
): Promise<void> {
  const client = createDynamoClient(credentials)

  // Delete all members first
  const members = await listSegmentMembers(credentials, segmentId)
  if (members.length > 0) {
    const batches: SegmentMember[][] = []
    for (let i = 0; i < members.length; i += 25) {
      batches.push(members.slice(i, i + 25))
    }
    for (const batch of batches) {
      await client.send(
        new BatchWriteCommand({
          RequestItems: {
            [TABLE_NAME]: batch.map((m) => ({
              DeleteRequest: { Key: { PK: m.PK, SK: m.SK } },
            })),
          },
        }),
      )
    }
  }

  // Delete segment metadata
  await client.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { PK: `SEGMENT#${segmentId}`, SK: 'METADATA' },
    }),
  )
}

// ─── Static segment members ──────────────────────────────────────────────────

export async function listSegmentMembers(
  credentials: AWSSessionCredentials,
  segmentId: string,
): Promise<SegmentMember[]> {
  const client = createDynamoClient(credentials)

  const response = await client.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': `SEGMENT#${segmentId}`,
        ':prefix': 'MEMBER#',
      },
    }),
  )

  return (response.Items as SegmentMember[]) ?? []
}

export async function addSegmentMembers(
  credentials: AWSSessionCredentials,
  segmentId: string,
  emails: string[],
): Promise<void> {
  const client = createDynamoClient(credentials)
  const now = new Date().toISOString()

  const items: SegmentMember[] = emails.map((email) => ({
    PK: `SEGMENT#${segmentId}`,
    SK: `MEMBER#${email}`,
    email,
    addedAt: now,
  }))

  for (let i = 0; i < items.length; i += 25) {
    const batch = items.slice(i, i + 25)
    await client.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: batch.map((item) => ({
            PutRequest: { Item: item },
          })),
        },
      }),
    )
  }

  // Update contact count
  await updateSegmentContactCount(credentials, segmentId)
}

export async function removeSegmentMembers(
  credentials: AWSSessionCredentials,
  segmentId: string,
  emails: string[],
): Promise<void> {
  const client = createDynamoClient(credentials)

  for (let i = 0; i < emails.length; i += 25) {
    const batch = emails.slice(i, i + 25)
    await client.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: batch.map((email) => ({
            DeleteRequest: {
              Key: { PK: `SEGMENT#${segmentId}`, SK: `MEMBER#${email}` },
            },
          })),
        },
      }),
    )
  }

  await updateSegmentContactCount(credentials, segmentId)
}

// ─── Dynamic segment evaluation ──────────────────────────────────────────────

/**
 * Evaluate a dynamic segment's rules against all contacts.
 * Returns matching contact emails.
 *
 * The rules are evaluated client-side (in the browser) because DynamoDB
 * FilterExpressions have limited support for nested AND/OR/contains logic.
 * For production scale, consider evaluating via Lambda or server-side.
 */
export async function evaluateSegment(
  credentials: AWSSessionCredentials,
  segmentId: string,
): Promise<string[]> {
  const segment = await getSegment(credentials, segmentId)
  if (!segment || segment.type !== 'dynamic' || !segment.rules) return []

  return evaluateRules(credentials, segment.rules)
}

export async function evaluateRules(
  credentials: AWSSessionCredentials,
  rules: SegmentRuleGroup,
): Promise<string[]> {
  const client = createDynamoClient(credentials)

  // Fetch all contacts
  const contacts: Contact[] = []
  let lastKey: Record<string, unknown> | undefined
  do {
    const response = await client.send(
      new ScanCommand({
        TableName: CONTACT_TABLE,
        FilterExpression: 'SK = :sk',
        ExpressionAttributeValues: { ':sk': 'METADATA' },
        ...(lastKey ? { ExclusiveStartKey: lastKey } : {}),
      }),
    )
    contacts.push(...((response.Items as Contact[]) ?? []))
    lastKey = response.LastEvaluatedKey as Record<string, unknown> | undefined
  } while (lastKey)

  // Evaluate each contact against the rules
  return contacts
    .filter((contact) => matchesRuleGroup(contact, rules))
    .map((c) => c.email)
}

/**
 * Evaluate a rule group (AND/OR of conditions + sub-groups) against a contact.
 */
function matchesRuleGroup(contact: Contact, group: SegmentRuleGroup): boolean {
  const conditionResults = group.conditions.map((c) => matchesCondition(contact, c))
  const subGroupResults = group.groups.map((g) => matchesRuleGroup(contact, g))
  const allResults = [...conditionResults, ...subGroupResults]

  if (allResults.length === 0) return true

  return group.operator === 'AND'
    ? allResults.every(Boolean)
    : allResults.some(Boolean)
}

/**
 * Evaluate a single condition against a contact.
 */
function matchesCondition(contact: Contact, condition: SegmentCondition): boolean {
  const fieldValue = getNestedValue(contact, condition.field)
  const { operator, value, value2 } = condition

  return evaluateOperator(fieldValue, operator, value, value2)
}

/**
 * Get a nested value from an object using dot notation.
 * e.g., getNestedValue(contact, 'cashback_info.current_balance')
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current && typeof current === 'object') {
      return (current as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

/**
 * Evaluate an operator against a field value.
 */
function evaluateOperator(
  fieldValue: unknown,
  operator: ConditionOperator,
  value: string | number | boolean | string[],
  value2?: string | number,
): boolean {
  switch (operator) {
    // String / generic
    case 'equals':
      return String(fieldValue) === String(value)
    case 'not_equals':
      return String(fieldValue) !== String(value)
    case 'contains':
      return String(fieldValue ?? '').toLowerCase().includes(String(value).toLowerCase())
    case 'not_contains':
      return !String(fieldValue ?? '').toLowerCase().includes(String(value).toLowerCase())
    case 'starts_with':
      return String(fieldValue ?? '').toLowerCase().startsWith(String(value).toLowerCase())
    case 'ends_with':
      return String(fieldValue ?? '').toLowerCase().endsWith(String(value).toLowerCase())
    case 'exists':
      return fieldValue !== undefined && fieldValue !== null && fieldValue !== ''
    case 'not_exists':
      return fieldValue === undefined || fieldValue === null || fieldValue === ''

    // Number
    case 'greater_than':
      return Number(fieldValue) > Number(value)
    case 'less_than':
      return Number(fieldValue) < Number(value)
    case 'greater_or_equal':
      return Number(fieldValue) >= Number(value)
    case 'less_or_equal':
      return Number(fieldValue) <= Number(value)
    case 'between':
      return Number(fieldValue) >= Number(value) && Number(fieldValue) <= Number(value2)

    // Date
    case 'before':
      return new Date(String(fieldValue)) < new Date(String(value))
    case 'after':
      return new Date(String(fieldValue)) > new Date(String(value))
    case 'on': {
      const d1 = new Date(String(fieldValue)).toISOString().slice(0, 10)
      const d2 = new Date(String(value)).toISOString().slice(0, 10)
      return d1 === d2
    }
    case 'in_last_days': {
      const date = new Date(String(fieldValue))
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - Number(value))
      return date >= cutoff
    }
    case 'not_in_last_days': {
      const date2 = new Date(String(fieldValue))
      const cutoff2 = new Date()
      cutoff2.setDate(cutoff2.getDate() - Number(value))
      return date2 < cutoff2
    }

    // Array
    case 'array_contains':
      return Array.isArray(fieldValue) && fieldValue.some((v: unknown) =>
        String(v).toLowerCase() === String(value).toLowerCase())
    case 'array_not_contains':
      return !Array.isArray(fieldValue) || !fieldValue.some((v: unknown) =>
        String(v).toLowerCase() === String(value).toLowerCase())
    case 'array_contains_all': {
      if (!Array.isArray(fieldValue) || !Array.isArray(value)) return false
      return value.every((v) =>
        fieldValue.some((fv: unknown) => String(fv).toLowerCase() === String(v).toLowerCase()))
    }
    case 'array_is_empty':
      return !Array.isArray(fieldValue) || fieldValue.length === 0
    case 'array_is_not_empty':
      return Array.isArray(fieldValue) && fieldValue.length > 0

    // Boolean
    case 'is_true':
      return fieldValue === true || fieldValue === 'true'
    case 'is_false':
      return fieldValue === false || fieldValue === 'false' || fieldValue === undefined

    // Select
    case 'in':
      return Array.isArray(value) && value.includes(String(fieldValue))
    case 'not_in':
      return Array.isArray(value) && !value.includes(String(fieldValue))

    default:
      return false
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function updateSegmentContactCount(
  credentials: AWSSessionCredentials,
  segmentId: string,
): Promise<void> {
  const client = createDynamoClient(credentials)
  const members = await listSegmentMembers(credentials, segmentId)

  await client.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `SEGMENT#${segmentId}`, SK: 'METADATA' },
      UpdateExpression: 'SET contactCount = :count, #ua = :ua',
      ExpressionAttributeNames: { '#ua': 'updatedAt' },
      ExpressionAttributeValues: {
        ':count': members.length,
        ':ua': new Date().toISOString(),
      },
    }),
  )
}

/**
 * Get emails matching a segment (works for both static and dynamic).
 */
export async function getSegmentEmails(
  credentials: AWSSessionCredentials,
  segmentId: string,
): Promise<string[]> {
  const segment = await getSegment(credentials, segmentId)
  if (!segment) return []

  if (segment.type === 'static') {
    const members = await listSegmentMembers(credentials, segmentId)
    return members.map((m) => m.email)
  }

  // Dynamic
  if (!segment.rules) return []
  return evaluateRules(credentials, segment.rules)
}
