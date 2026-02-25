/**
 * Campaign types — modeled after RD Station email marketing concepts.
 */

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled'

export interface CampaignStats {
  /** Total recipients selected */
  selected: number
  /** Emails actually sent */
  sent: number
  /** Emails delivered (sent - bounced) */
  delivered: number
  /** Unique opens */
  opened: number
  /** Unique clicks */
  clicked: number
  /** Hard + soft bounces */
  bounced: number
  /** Marked as spam */
  complained: number
  /** Unsubscribed via link */
  unsubscribed: number
}

export interface Campaign {
  /** DynamoDB PK = CAMPAIGN#<id> */
  PK: string
  /** DynamoDB SK = METADATA */
  SK: string
  /** Unique campaign id (UUID) */
  id: string
  /** Human-readable campaign name */
  name: string
  /** Email subject line (may contain Handlebars vars) */
  subject: string
  /** SES template name used (optional — can send raw HTML) */
  templateName?: string
  /** Raw HTML body (when not using a SES template) */
  htmlBody?: string
  /** Plain text body */
  textBody?: string
  /** Sender email address */
  senderEmail: string
  /** Sender display name */
  senderName?: string
  /** Reply-to address */
  replyTo?: string
  /** Contact tags/segments to target */
  recipientTags: string[]
  /** Campaign status */
  status: CampaignStatus
  /** ISO date when campaign is scheduled to be sent */
  scheduledAt?: string
  /** ISO date when the campaign was actually sent */
  sentAt?: string
  /** Campaign analytics */
  stats: CampaignStats
  /** ISO date of creation */
  createdAt: string
  /** ISO date of last update */
  updatedAt: string
}

export interface CampaignFormData {
  name: string
  subject: string
  templateName?: string
  htmlBody?: string
  textBody?: string
  senderEmail: string
  senderName?: string
  replyTo?: string
  recipientTags: string[]
  scheduledAt?: string
}

/** Summary row in the campaign list table */
export interface CampaignListItem {
  id: string
  name: string
  status: CampaignStatus
  sentAt: string | null
  scheduledAt: string | null
  stats: CampaignStats
}

export const EMPTY_STATS: CampaignStats = {
  selected: 0,
  sent: 0,
  delivered: 0,
  opened: 0,
  clicked: 0,
  bounced: 0,
  complained: 0,
  unsubscribed: 0,
}
