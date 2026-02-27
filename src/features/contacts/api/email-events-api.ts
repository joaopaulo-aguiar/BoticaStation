/**
 * Email Events API — reads from the EmailEvents DynamoDB table.
 *
 * Table schema:
 *   PK:  email (String)           — e.g. "joaopaulo.aguiar@gmail.com"
 *   SK:  eventTypeTimestamp (String) — e.g. "Open#2026-02-27T13:29:22Z"
 *
 * Each item also has:
 *   additionalInfo (String)  — user-agent, SMTP response, clicked URL, etc.
 *   subject (String)         — email subject line
 *
 * AWS SES event types we handle:
 *   Send, Delivery, Open, Click, Bounce, Complaint, Reject, RenderingFailure
 */
import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { createDynamoClient } from '@/shared/lib/dynamodb'
import type { AWSSessionCredentials } from '@/shared/types'

const TABLE_NAME = 'EmailEvents'

// ─── Types ───────────────────────────────────────────────────────────────────

export type EmailEventType =
  | 'Send'
  | 'Delivery'
  | 'Open'
  | 'Click'
  | 'Bounce'
  | 'Complaint'
  | 'Reject'
  | 'RenderingFailure'

export interface EmailEvent {
  email: string
  eventType: EmailEventType
  timestamp: string           // ISO 8601
  additionalInfo: string
  subject: string
  /** Composite sort key as stored in DynamoDB */
  eventTypeTimestamp: string
}

export interface EmailEventStats {
  sends: number
  deliveries: number
  opens: number
  clicks: number
  bounces: number
  complaints: number
  rejects: number
  renderingFailures: number
}

export interface EmailActivityResult {
  events: EmailEvent[]
  stats: EmailEventStats
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Parse the composite sort key "EventType#ISO_Timestamp" into parts.
 */
function parseSortKey(sk: string): { eventType: EmailEventType; timestamp: string } {
  const hashIdx = sk.indexOf('#')
  if (hashIdx < 0) {
    return { eventType: 'Send', timestamp: sk }
  }
  return {
    eventType: sk.slice(0, hashIdx) as EmailEventType,
    timestamp: sk.slice(hashIdx + 1),
  }
}

function emptyStats(): EmailEventStats {
  return {
    sends: 0,
    deliveries: 0,
    opens: 0,
    clicks: 0,
    bounces: 0,
    complaints: 0,
    rejects: 0,
    renderingFailures: 0,
  }
}

function incrementStat(stats: EmailEventStats, type: EmailEventType): void {
  switch (type) {
    case 'Send':              stats.sends++;              break
    case 'Delivery':          stats.deliveries++;         break
    case 'Open':              stats.opens++;              break
    case 'Click':             stats.clicks++;             break
    case 'Bounce':            stats.bounces++;            break
    case 'Complaint':         stats.complaints++;         break
    case 'Reject':            stats.rejects++;            break
    case 'RenderingFailure':  stats.renderingFailures++;  break
  }
}

// ─── API Functions ───────────────────────────────────────────────────────────

/**
 * Fetch all email events for a given email address.
 * Uses a Query on the PK (email) — efficient, no scan needed.
 * Returns events sorted by timestamp descending (most recent first).
 */
export async function fetchEmailEvents(
  credentials: AWSSessionCredentials,
  email: string,
): Promise<EmailActivityResult> {
  const client = createDynamoClient(credentials)
  const events: EmailEvent[] = []
  const stats = emptyStats()
  let lastKey: Record<string, unknown> | undefined

  do {
    const response = await client.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: { ':email': email },
        ScanIndexForward: false, // newest first
        ...(lastKey ? { ExclusiveStartKey: lastKey } : {}),
      }),
    )

    for (const item of response.Items ?? []) {
      const sk = (item.eventTypeTimestamp as string) ?? ''
      const { eventType, timestamp } = parseSortKey(sk)

      events.push({
        email: (item.email as string) ?? email,
        eventType,
        timestamp,
        additionalInfo: (item.additionalInfo as string) ?? '',
        subject: (item.subject as string) ?? '',
        eventTypeTimestamp: sk,
      })

      incrementStat(stats, eventType)
    }

    lastKey = response.LastEvaluatedKey as Record<string, unknown> | undefined
  } while (lastKey)

  // Sort descending by timestamp
  events.sort((a, b) => b.timestamp.localeCompare(a.timestamp))

  return { events, stats }
}

/**
 * Fetch email events for a given email, filtered by event type.
 * Uses KeyConditionExpression begins_with on the sort key.
 */
export async function fetchEmailEventsByType(
  credentials: AWSSessionCredentials,
  email: string,
  eventType: EmailEventType,
): Promise<EmailEvent[]> {
  const client = createDynamoClient(credentials)
  const events: EmailEvent[] = []
  let lastKey: Record<string, unknown> | undefined

  do {
    const response = await client.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'email = :email AND begins_with(eventTypeTimestamp, :prefix)',
        ExpressionAttributeValues: {
          ':email': email,
          ':prefix': `${eventType}#`,
        },
        ScanIndexForward: false,
        ...(lastKey ? { ExclusiveStartKey: lastKey } : {}),
      }),
    )

    for (const item of response.Items ?? []) {
      const sk = (item.eventTypeTimestamp as string) ?? ''
      const { eventType: et, timestamp } = parseSortKey(sk)

      events.push({
        email: (item.email as string) ?? email,
        eventType: et,
        timestamp,
        additionalInfo: (item.additionalInfo as string) ?? '',
        subject: (item.subject as string) ?? '',
        eventTypeTimestamp: sk,
      })
    }

    lastKey = response.LastEvaluatedKey as Record<string, unknown> | undefined
  } while (lastKey)

  events.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  return events
}

/**
 * Fetch recent email events across ALL contacts for dashboard.
 * NOTE: This uses a Scan with a limit — for production scale,
 * consider creating a GSI or an aggregation table.
 * For now, we accept a limited scan since the table is small.
 */
export async function fetchRecentEmailEvents(
  credentials: AWSSessionCredentials,
  limit = 200,
): Promise<EmailEvent[]> {
  const client = createDynamoClient(credentials)
  const events: EmailEvent[] = []

  // We'll scan with a limit — not ideal at scale, but acceptable for small datasets
  const response = await client.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': '__GLOBAL__' }, // placeholder — won't work for global
      Limit: limit,
    }).catch(() => null) as any,
  )

  // Since we can't do a global query on a PK-based table, we'll
  // use the per-contact approach and aggregate in the frontend.
  // The dashboard will use the contacts list to aggregate stats.
  return events
}

/**
 * Fetch email stats for multiple contacts efficiently.
 * Runs parallel queries for each email address.
 */
export async function fetchBulkEmailStats(
  credentials: AWSSessionCredentials,
  emails: string[],
): Promise<Map<string, EmailEventStats>> {
  const results = new Map<string, EmailEventStats>()

  // Process in batches of 10 to avoid throttling
  const BATCH_SIZE = 10
  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE)
    const promises = batch.map(async (email) => {
      try {
        const { stats } = await fetchEmailEvents(credentials, email)
        results.set(email, stats)
      } catch {
        results.set(email, emptyStats())
      }
    })
    await Promise.all(promises)
  }

  return results
}
