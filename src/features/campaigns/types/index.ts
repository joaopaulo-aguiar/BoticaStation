// ── Campaign types (mirrors GraphQL schema) ─────────────────────────────────

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled'

export interface CampaignMetrics {
  sent: number
  delivered: number
  opened: number
  clicked: number
  bounced: number
  complained: number
  unsubscribed: number
}

export interface Campaign {
  id: string
  name: string
  subject: string
  templateName: string
  senderProfileId: string
  /** Segment filter or "all" */
  recipientFilter: string
  status: CampaignStatus
  scheduledAt: string | null
  sentAt: string | null
  metrics: CampaignMetrics | null
  configurationSet: string | null
  createdAt: string
  updatedAt: string | null
  createdBy: string | null
}

export interface CreateCampaignInput {
  name: string
  subject: string
  templateName: string
  senderProfileId: string
  recipientFilter?: string | null
  scheduledAt?: string | null
  configurationSet?: string | null
}

export interface UpdateCampaignInput {
  name?: string | null
  subject?: string | null
  templateName?: string | null
  senderProfileId?: string | null
  recipientFilter?: string | null
  scheduledAt?: string | null
  configurationSet?: string | null
}

export const CAMPAIGN_STATUSES: { value: CampaignStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Rascunho', color: 'bg-slate-100 text-slate-600' },
  { value: 'scheduled', label: 'Agendada', color: 'bg-blue-100 text-blue-700' },
  { value: 'sending', label: 'Enviando', color: 'bg-amber-100 text-amber-700' },
  { value: 'sent', label: 'Enviada', color: 'bg-green-100 text-green-700' },
  { value: 'paused', label: 'Pausada', color: 'bg-amber-100 text-amber-700' },
  { value: 'cancelled', label: 'Cancelada', color: 'bg-red-100 text-red-700' },
]
