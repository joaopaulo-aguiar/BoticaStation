/**
 * Dashboard email analytics API.
 *
 * Aggregates email event data from the EmailEvents DynamoDB table
 * for use on the dashboard.
 *
 * Supports two modes:
 * 1. GSI-based: Uses the `eventType-timestamp-index` GSI for efficient queries
 *    per event type (recommended for large tables).
 * 2. Scan-based: Falls back to full table scan (acceptable for < 10K items).
 *
 * GSI specification for the user to create in AWS Console:
 * ┌─────────────────────────────────────────────────────────────┐
 * │  GSI Name:       eventType-timestamp-index                  │
 * │  Partition Key:  eventType (String)                         │
 * │  Sort Key:       timestamp (String)                         │
 * │  Projection:     ALL                                        │
 * │                                                             │
 * │  Items in EmailEvents must have top-level attributes:       │
 * │    - eventType: "Send" | "Delivery" | "Open" | "Click" ... │
 * │    - timestamp: ISO 8601 string                             │
 * │  (In addition to existing PK=email, SK=eventTypeTimestamp)  │
 * └─────────────────────────────────────────────────────────────┘
 */
import { QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { createDynamoClient } from '@/shared/lib/dynamodb'
import type { AWSSessionCredentials } from '@/shared/types'
import type { EmailEventType } from '@/features/contacts/api/email-events-api'

const TABLE_NAME = 'EmailEvents'
const GSI_NAME = 'eventType-timestamp-index'

/** Set to true once the GSI is created in AWS. */
const USE_GSI = true

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DashboardEmailStats {
  totalSends: number
  totalDeliveries: number
  totalOpens: number
  totalClicks: number
  totalBounces: number
  totalComplaints: number
  totalRejects: number
  totalRenderingFailures: number
  openRate: number   // percentage
  clickRate: number  // percentage
  bounceRate: number // percentage
}

export interface DailyEventCount {
  date: string         // 'dd/MM'
  enviados: number
  entregues: number
  aberturas: number
  cliques: number
  bounces: number
}

export interface RecentEmailEvent {
  email: string
  eventType: EmailEventType
  timestamp: string
  subject: string
  additionalInfo: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseSortKey(sk: string): { eventType: string; timestamp: string } {
  const hashIdx = sk.indexOf('#')
  if (hashIdx < 0) return { eventType: 'Send', timestamp: sk }
  return { eventType: sk.slice(0, hashIdx), timestamp: sk.slice(hashIdx + 1) }
}

/**
 * Fetch all events from EmailEvents table using Scan.
 * For small tables (< 10K items) this is acceptable.
 * For production scale, use GSI or aggregation table.
 */
async function fetchAllEventsViaScan(
  client: ReturnType<typeof createDynamoClient>,
): Promise<Array<{
  email: string
  eventType: string
  timestamp: string
  subject: string
  additionalInfo: string
}>> {
  const allItems: Array<{
    email: string
    eventType: string
    timestamp: string
    subject: string
    additionalInfo: string
  }> = []

  let lastKey: Record<string, unknown> | undefined
  do {
    const response = await client.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        ...(lastKey ? { ExclusiveStartKey: lastKey } : {}),
      }),
    )

    for (const item of response.Items ?? []) {
      const sk = (item.eventTypeTimestamp as string) ?? ''
      const { eventType, timestamp } = parseSortKey(sk)

      allItems.push({
        email: (item.email as string) ?? '',
        eventType,
        timestamp,
        subject: (item.subject as string) ?? '',
        additionalInfo: (item.additionalInfo as string) ?? '',
      })
    }

    lastKey = response.LastEvaluatedKey as Record<string, unknown> | undefined
  } while (lastKey)

  return allItems
}

/**
 * Fetch events from EmailEvents table using the GSI `eventType-timestamp-index`.
 * Queries each event type separately and merges results.
 * Much more efficient than a full scan for large tables.
 */
async function fetchAllEventsViaGSI(
  client: ReturnType<typeof createDynamoClient>,
  sinceDate?: string,
): Promise<Array<{
  email: string
  eventType: string
  timestamp: string
  subject: string
  additionalInfo: string
}>> {
  const eventTypes: EmailEventType[] = [
    'Send', 'Delivery', 'Open', 'Click', 'Bounce', 'Complaint', 'Reject', 'RenderingFailure',
  ]

  // Query all event types in parallel
  const results = await Promise.all(
    eventTypes.map(async (eventType) => {
      const items: Array<{
        email: string
        eventType: string
        timestamp: string
        subject: string
        additionalInfo: string
      }> = []

      let lastKey: Record<string, unknown> | undefined
      do {
        const params: Record<string, unknown> = {
          TableName: TABLE_NAME,
          IndexName: GSI_NAME,
          KeyConditionExpression: sinceDate
            ? 'eventType = :et AND #ts >= :since'
            : 'eventType = :et',
          ExpressionAttributeValues: {
            ':et': eventType,
            ...(sinceDate ? { ':since': sinceDate } : {}),
          },
          ...(sinceDate
            ? { ExpressionAttributeNames: { '#ts': 'timestamp' } }
            : {}),
          ...(lastKey ? { ExclusiveStartKey: lastKey } : {}),
        }

        const response = await client.send(new QueryCommand(params as any))

        for (const item of response.Items ?? []) {
          items.push({
            email: (item.email as string) ?? '',
            eventType: (item.eventType as string) ?? eventType,
            timestamp: (item.timestamp as string) ?? '',
            subject: (item.subject as string) ?? '',
            additionalInfo: (item.additionalInfo as string) ?? '',
          })
        }

        lastKey = response.LastEvaluatedKey as Record<string, unknown> | undefined
      } while (lastKey)

      return items
    }),
  )

  return results.flat()
}

export async function fetchDashboardEmailData(
  credentials: AWSSessionCredentials,
): Promise<{
  stats: DashboardEmailStats
  dailyVolume: DailyEventCount[]
  recentEvents: RecentEmailEvent[]
}> {
  const client = createDynamoClient(credentials)

  // Determine the date range for GSI queries
  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Fetch events using GSI (preferred) or Scan (fallback)
  let allItems: Array<{
    email: string
    eventType: string
    timestamp: string
    subject: string
    additionalInfo: string
  }>

  if (USE_GSI) {
    // GSI-based: query events from last 30 days efficiently
    allItems = await fetchAllEventsViaGSI(client, thirtyDaysAgo.toISOString())
  } else {
    // Scan-based: fetch everything
    allItems = await fetchAllEventsViaScan(client)
  }

  // Aggregate stats
  const stats: DashboardEmailStats = {
    totalSends: 0,
    totalDeliveries: 0,
    totalOpens: 0,
    totalClicks: 0,
    totalBounces: 0,
    totalComplaints: 0,
    totalRejects: 0,
    totalRenderingFailures: 0,
    openRate: 0,
    clickRate: 0,
    bounceRate: 0,
  }

  // Daily breakdown (last 30 days)
  const dailyMap = new Map<string, DailyEventCount>()

  // Initialize last 30 days
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    dailyMap.set(key, {
      date: key,
      enviados: 0,
      entregues: 0,
      aberturas: 0,
      cliques: 0,
      bounces: 0,
    })
  }

  for (const item of allItems) {
    // Aggregate by type
    switch (item.eventType) {
      case 'Send':              stats.totalSends++;              break
      case 'Delivery':          stats.totalDeliveries++;         break
      case 'Open':              stats.totalOpens++;              break
      case 'Click':             stats.totalClicks++;             break
      case 'Bounce':            stats.totalBounces++;            break
      case 'Complaint':         stats.totalComplaints++;         break
      case 'Reject':            stats.totalRejects++;            break
      case 'RenderingFailure':  stats.totalRenderingFailures++;  break
    }

    // Aggregate by day (last 30 days only)
    try {
      const eventDate = new Date(item.timestamp)
      if (eventDate >= thirtyDaysAgo) {
        const dateKey = eventDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        const daily = dailyMap.get(dateKey)
        if (daily) {
          switch (item.eventType) {
            case 'Send':      daily.enviados++;   break
            case 'Delivery':  daily.entregues++;  break
            case 'Open':      daily.aberturas++;  break
            case 'Click':     daily.cliques++;    break
            case 'Bounce':    daily.bounces++;    break
          }
        }
      }
    } catch {
      // Skip invalid timestamps
    }
  }

  // Calculate rates
  if (stats.totalSends > 0) {
    stats.openRate = (stats.totalOpens / stats.totalSends) * 100
    stats.clickRate = (stats.totalClicks / stats.totalSends) * 100
    stats.bounceRate = (stats.totalBounces / stats.totalSends) * 100
  }

  // Build daily volume array (sorted by date)
  const dailyVolume = Array.from(dailyMap.values())

  // Recent events (last 50, sorted by timestamp desc)
  const recentEvents: RecentEmailEvent[] = allItems
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 50)
    .map((item) => ({
      email: item.email,
      eventType: item.eventType as EmailEventType,
      timestamp: item.timestamp,
      subject: item.subject,
      additionalInfo: item.additionalInfo,
    }))

  return { stats, dailyVolume, recentEvents }
}
