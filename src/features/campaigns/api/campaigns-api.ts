/**
 * AWS SES + DynamoDB API layer for email campaigns.
 *
 * - Campaign metadata is stored in DynamoDB.
 * - Emails are sent via SES v2 (simple or bulk).
 * - Analytics are tracked in DynamoDB (updated by SES event notifications
 *   via SNS → Lambda in production; here we read whatever data is available).
 */
import {
  SESv2Client,
  SendEmailCommand,
  SendBulkEmailCommand,
  GetEmailTemplateCommand,
  type BulkEmailEntry,
} from '@aws-sdk/client-sesv2'
import {
  ScanCommand,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb'
import { v4 as uuidv4 } from 'uuid'
import { createDynamoClient } from '@/shared/lib/dynamodb'
import { useSettingsStore } from '@/features/settings/store/settings-store'
import type { AWSSessionCredentials } from '@/shared/types'
import type { Campaign, CampaignFormData, CampaignStats, EMPTY_STATS } from '../types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SES_REGION = 'sa-east-1'

function getTableName(): string {
  return 'Config'
}

function createSES(credentials: AWSSessionCredentials): SESv2Client {
  return new SESv2Client({
    region: SES_REGION,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  })
}

const EMPTY: CampaignStats = {
  selected: 0,
  sent: 0,
  delivered: 0,
  opened: 0,
  clicked: 0,
  bounced: 0,
  complained: 0,
  unsubscribed: 0,
}

// ─── CRUD operations ─────────────────────────────────────────────────────────

export async function listCampaigns(
  credentials: AWSSessionCredentials,
): Promise<Campaign[]> {
  const client = createDynamoClient(credentials)
  const table = getTableName()

  const response = await client.send(
    new ScanCommand({
      TableName: table,
      FilterExpression: 'SK = :sk',
      ExpressionAttributeValues: { ':sk': 'METADATA' },
    }),
  )

  return ((response.Items as Campaign[]) || []).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

export async function getCampaign(
  credentials: AWSSessionCredentials,
  campaignId: string,
): Promise<Campaign | null> {
  const client = createDynamoClient(credentials)
  const table = getTableName()

  const res = await client.send(
    new GetCommand({
      TableName: table,
      Key: { PK: `CAMPAIGN#${campaignId}`, SK: 'METADATA' },
    }),
  )

  return (res.Item as Campaign) ?? null
}

export async function createCampaign(
  credentials: AWSSessionCredentials,
  data: CampaignFormData,
): Promise<Campaign> {
  const client = createDynamoClient(credentials)
  const table = getTableName()
  const id = uuidv4()
  const now = new Date().toISOString()

  const campaign: Campaign = {
    PK: `CAMPAIGN#${id}`,
    SK: 'METADATA',
    id,
    name: data.name,
    subject: data.subject,
    templateName: data.templateName,
    htmlBody: data.htmlBody,
    textBody: data.textBody,
    senderEmail: data.senderEmail,
    senderName: data.senderName,
    replyTo: data.replyTo,
    recipientTags: data.recipientTags,
    segmentIds: data.segmentIds ?? [],
    excludeSegmentIds: data.excludeSegmentIds ?? [],
    configurationSetName: data.configurationSetName,
    enableOpenTracking: data.enableOpenTracking ?? false,
    enableClickTracking: data.enableClickTracking ?? false,
    trackingBaseUrl: data.trackingBaseUrl,
    status: data.scheduledAt ? 'scheduled' : 'draft',
    scheduledAt: data.scheduledAt,
    stats: { ...EMPTY },
    createdAt: now,
    updatedAt: now,
  }

  await client.send(new PutCommand({ TableName: table, Item: campaign }))
  return campaign
}

export async function updateCampaign(
  credentials: AWSSessionCredentials,
  campaignId: string,
  data: Partial<CampaignFormData> & { status?: Campaign['status'] },
): Promise<void> {
  const client = createDynamoClient(credentials)
  const table = getTableName()

  const exprs: string[] = ['#ua = :ua']
  const names: Record<string, string> = { '#ua': 'updatedAt' }
  const vals: Record<string, unknown> = { ':ua': new Date().toISOString() }

  const fields: Array<[string, keyof typeof data]> = [
    ['#nm', 'name'],
    ['#su', 'subject'],
    ['#tn', 'templateName'],
    ['#hb', 'htmlBody'],
    ['#tb', 'textBody'],
    ['#se', 'senderEmail'],
    ['#sn', 'senderName'],
    ['#rt', 'replyTo'],
    ['#rp', 'recipientTags'],
    ['#st', 'status'],
    ['#sa', 'scheduledAt'],
    ['#si', 'segmentIds'],
    ['#esi', 'excludeSegmentIds'],
    ['#csn', 'configurationSetName'],
    ['#eot', 'enableOpenTracking'],
    ['#ect', 'enableClickTracking'],
    ['#tbu', 'trackingBaseUrl'],
  ]

  const attrMap: Record<string, string> = {
    '#nm': 'name',
    '#su': 'subject',
    '#tn': 'templateName',
    '#hb': 'htmlBody',
    '#tb': 'textBody',
    '#se': 'senderEmail',
    '#sn': 'senderName',
    '#rt': 'replyTo',
    '#rp': 'recipientTags',
    '#st': 'status',
    '#sa': 'scheduledAt',
    '#si': 'segmentIds',
    '#esi': 'excludeSegmentIds',
    '#csn': 'configurationSetName',
    '#eot': 'enableOpenTracking',
    '#ect': 'enableClickTracking',
    '#tbu': 'trackingBaseUrl',
  }

  for (const [alias, key] of fields) {
    if (data[key] !== undefined) {
      exprs.push(`${alias} = :${key}`)
      names[alias] = attrMap[alias]
      vals[`:${key}`] = data[key]
    }
  }

  await client.send(
    new UpdateCommand({
      TableName: table,
      Key: { PK: `CAMPAIGN#${campaignId}`, SK: 'METADATA' },
      UpdateExpression: `SET ${exprs.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: vals,
    }),
  )
}

export async function deleteCampaign(
  credentials: AWSSessionCredentials,
  campaignId: string,
): Promise<void> {
  const client = createDynamoClient(credentials)
  const table = getTableName()

  await client.send(
    new DeleteCommand({
      TableName: table,
      Key: { PK: `CAMPAIGN#${campaignId}`, SK: 'METADATA' },
    }),
  )
}

export async function duplicateCampaign(
  credentials: AWSSessionCredentials,
  campaignId: string,
  newName: string,
): Promise<Campaign> {
  const original = await getCampaign(credentials, campaignId)
  if (!original) throw new Error('Campanha não encontrada')

  return createCampaign(credentials, {
    name: newName,
    subject: original.subject,
    templateName: original.templateName,
    htmlBody: original.htmlBody,
    textBody: original.textBody,
    senderEmail: original.senderEmail,
    senderName: original.senderName,
    replyTo: original.replyTo,
    recipientTags: original.recipientTags,
    segmentIds: original.segmentIds,
    excludeSegmentIds: original.excludeSegmentIds,
    configurationSetName: original.configurationSetName,
    enableOpenTracking: original.enableOpenTracking,
    enableClickTracking: original.enableClickTracking,
    trackingBaseUrl: original.trackingBaseUrl,
  })
}

// ─── Tracking helpers ────────────────────────────────────────────────────────

/**
 * Inject a 1×1 tracking pixel before </body> for open tracking.
 */
function injectTrackingPixel(html: string, baseUrl: string, campaignId: string, recipientEmail: string): string {
  const pixelUrl = `${baseUrl}/track/open?cid=${encodeURIComponent(campaignId)}&email=${encodeURIComponent(recipientEmail)}`
  const pixel = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0;" />`

  if (html.includes('</body>')) {
    return html.replace('</body>', `${pixel}</body>`)
  }
  return html + pixel
}

/**
 * Rewrite all <a href="..."> links to pass through a click-tracking redirect.
 */
function rewriteLinksForTracking(html: string, baseUrl: string, campaignId: string, recipientEmail: string): string {
  return html.replace(
    /<a\s([^>]*?)href="([^"]+)"([^>]*)>/gi,
    (_match, before, href, after) => {
      // Don't rewrite mailto: or tel: links, or anchors or unsubscribe
      if (/^(mailto:|tel:|#|{{)/i.test(href)) return _match
      const redirectUrl = `${baseUrl}/track/click?cid=${encodeURIComponent(campaignId)}&email=${encodeURIComponent(recipientEmail)}&url=${encodeURIComponent(href)}`
      return `<a ${before}href="${redirectUrl}"${after}>`
    },
  )
}

/**
 * Apply tracking instrumentation to HTML body.
 */
function instrumentHtml(
  html: string,
  campaign: Campaign,
  recipientEmail: string,
): string {
  if (!html) return html
  let result = html

  const baseUrl = campaign.trackingBaseUrl || ''

  if (campaign.enableOpenTracking && baseUrl) {
    result = injectTrackingPixel(result, baseUrl, campaign.id, recipientEmail)
  }

  if (campaign.enableClickTracking && baseUrl) {
    result = rewriteLinksForTracking(result, baseUrl, campaign.id, recipientEmail)
  }

  return result
}

// ─── Sending ─────────────────────────────────────────────────────────────────

/**
 * Send a campaign to a list of email addresses.
 * Uses SES SendEmail (individual) for each recipient when using raw HTML,
 * or SendBulkEmail when using a SES template.
 */
export async function sendCampaign(
  credentials: AWSSessionCredentials,
  campaignId: string,
  recipientEmails: string[],
): Promise<{ sentCount: number; failedCount: number }> {
  const campaign = await getCampaign(credentials, campaignId)
  if (!campaign) throw new Error('Campanha não encontrada')

  const ses = createSES(credentials)
  const dynamo = createDynamoClient(credentials)
  const table = getTableName()

  // Mark as sending
  await dynamo.send(
    new UpdateCommand({
      TableName: table,
      Key: { PK: `CAMPAIGN#${campaignId}`, SK: 'METADATA' },
      UpdateExpression: 'SET #st = :st, #ua = :ua',
      ExpressionAttributeNames: { '#st': 'status', '#ua': 'updatedAt' },
      ExpressionAttributeValues: { ':st': 'sending', ':ua': new Date().toISOString() },
    }),
  )

  let sentCount = 0
  let failedCount = 0

  const fromAddr = campaign.senderName
    ? `${campaign.senderName} <${campaign.senderEmail}>`
    : campaign.senderEmail

  if (campaign.templateName) {
    // ── Bulk sending with SES template ──────────────────────────────────
    const BATCH_SIZE = 50
    for (let i = 0; i < recipientEmails.length; i += BATCH_SIZE) {
      const batch = recipientEmails.slice(i, i + BATCH_SIZE)

      const entries: BulkEmailEntry[] = batch.map((email) => ({
        Destination: { ToAddresses: [email] },
      }))

      try {
        const response = await ses.send(
          new SendBulkEmailCommand({
            FromEmailAddress: fromAddr,
            ReplyToAddresses: campaign.replyTo ? [campaign.replyTo] : undefined,
            DefaultContent: {
              Template: {
                TemplateName: campaign.templateName,
                TemplateData: JSON.stringify({ subject: campaign.subject }),
              },
            },
            BulkEmailEntries: entries,
          }),
        )

        for (const result of response.BulkEmailEntryResults ?? []) {
          if (result.Status === 'SUCCESS') sentCount++
          else failedCount++
        }
      } catch (err) {
        console.error('Bulk send batch error:', err)
        failedCount += batch.length
      }
    }
  } else {
    // ── Individual sending with raw HTML ──────────────────────────────
    for (const email of recipientEmails) {
      try {
        const personalizedHtml = instrumentHtml(campaign.htmlBody ?? '', campaign, email)

        await ses.send(
          new SendEmailCommand({
            FromEmailAddress: fromAddr,
            ReplyToAddresses: campaign.replyTo ? [campaign.replyTo] : undefined,
            Destination: { ToAddresses: [email] },
            Content: {
              Simple: {
                Subject: { Data: campaign.subject, Charset: 'UTF-8' },
                Body: {
                  Html: { Data: personalizedHtml, Charset: 'UTF-8' },
                  ...(campaign.textBody
                    ? { Text: { Data: campaign.textBody, Charset: 'UTF-8' } }
                    : {}),
                },
              },
            },
            ...(campaign.configurationSetName
              ? { ConfigurationSetName: campaign.configurationSetName }
              : {}),
          }),
        )
        sentCount++
      } catch (err) {
        console.error(`Send to ${email} failed:`, err)
        failedCount++
      }
    }
  }

  // Update campaign with final stats
  const now = new Date().toISOString()
  await dynamo.send(
    new UpdateCommand({
      TableName: table,
      Key: { PK: `CAMPAIGN#${campaignId}`, SK: 'METADATA' },
      UpdateExpression:
        'SET #st = :st, #sa2 = :sa2, #ua = :ua, stats.selected = :sel, stats.sent = :snt, stats.delivered = :dlv',
      ExpressionAttributeNames: {
        '#st': 'status',
        '#sa2': 'sentAt',
        '#ua': 'updatedAt',
      },
      ExpressionAttributeValues: {
        ':st': 'sent',
        ':sa2': now,
        ':ua': now,
        ':sel': recipientEmails.length,
        ':snt': sentCount,
        ':dlv': sentCount, // initially assume delivered = sent (adjusted later by SNS events)
      },
    }),
  )

  return { sentCount, failedCount }
}

/**
 * Fetch recipient emails from the Contacts table based on tags.
 * Returns email addresses of active contacts matching any of the given tags.
 */
export async function getRecipientsByTags(
  credentials: AWSSessionCredentials,
  tags: string[],
): Promise<string[]> {
  const client = createDynamoClient(credentials)

  const response = await client.send(
    new ScanCommand({
      TableName: 'Contact',
      FilterExpression: 'SK = :sk AND #status = :active AND opt_in_email <> :false',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':sk': 'METADATA',
        ':active': 'active',
        ':false': false,
      },
      ProjectionExpression: 'email, tags',
    }),
  )

  const contacts = (response.Items ?? []) as Array<{ email: string; tags?: string[] }>

  if (tags.length === 0) {
    return contacts.map((c) => c.email).filter(Boolean)
  }

  return contacts
    .filter((c) => c.tags?.some((t) => tags.includes(t)))
    .map((c) => c.email)
    .filter(Boolean)
}

/**
 * Fetch recipient emails combining tags AND segment IDs.
 * Merges tag-based + segment-based, removes excluded-segments, deduplicates.
 */
export async function getRecipientsByCriteria(
  credentials: AWSSessionCredentials,
  opts: {
    tags?: string[]
    segmentIds?: string[]
    excludeSegmentIds?: string[]
  },
): Promise<string[]> {
  const emails = new Set<string>()

  // 1) Tag-based recipients
  const tagEmails = await getRecipientsByTags(credentials, opts.tags ?? [])
  for (const e of tagEmails) emails.add(e)

  // 2) Segment-based recipients
  if (opts.segmentIds?.length) {
    // Import dynamically to avoid circular deps
    const { getSegmentEmails } = await import('@/features/segmentation/api/segmentation-api')
    for (const segId of opts.segmentIds) {
      try {
        const segEmails = await getSegmentEmails(credentials, segId)
        for (const e of segEmails) emails.add(e)
      } catch (err) {
        console.warn(`Failed to resolve segment ${segId}:`, err)
      }
    }
  }

  // 3) Exclude segments
  if (opts.excludeSegmentIds?.length) {
    const { getSegmentEmails } = await import('@/features/segmentation/api/segmentation-api')
    for (const segId of opts.excludeSegmentIds) {
      try {
        const segEmails = await getSegmentEmails(credentials, segId)
        for (const e of segEmails) emails.delete(e)
      } catch (err) {
        console.warn(`Failed to resolve exclude segment ${segId}:`, err)
      }
    }
  }

  return Array.from(emails)
}
