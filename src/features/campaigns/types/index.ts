// ── Campaign types (mirrors GraphQL schema) ─────────────────────────────────

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled'

export type RecipientType = 'all' | 'lifecycleStage' | 'segment'

export interface CampaignMetrics {
  sent: number
  delivered: number
  opened: number
  clicked: number
  bounced: number
  complained: number
  unsubscribed: number
}

export interface UtmParams {
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmTerm?: string
  utmContent?: string
}

export interface Campaign {
  id: string
  name: string
  subject: string
  templateName: string
  senderProfileId: string
  recipientType: RecipientType
  recipientFilter: string | null
  segmentId: string | null
  status: CampaignStatus
  scheduledAt: string | null
  sentAt: string | null
  completedAt: string | null
  metrics: CampaignMetrics | null
  configurationSet: string | null
  scheduleArn: string | null
  timezone: string | null
  utmParams: string | null // AWSJSON
  estimatedRecipients: number | null
  createdAt: string
  updatedAt: string | null
  createdBy: string | null
}

export interface CreateCampaignInput {
  name: string
  subject: string
  templateName: string
  senderProfileId: string
  recipientType?: string | null
  recipientFilter?: string | null
  segmentId?: string | null
  scheduledAt?: string | null
  configurationSet?: string | null
  utmParams?: string | null
}

export interface UpdateCampaignInput {
  name?: string | null
  subject?: string | null
  templateName?: string | null
  senderProfileId?: string | null
  recipientType?: string | null
  recipientFilter?: string | null
  segmentId?: string | null
  scheduledAt?: string | null
  configurationSet?: string | null
  utmParams?: string | null
}

export interface CampaignSettings {
  timezone: string
  scheduleGroupName: string
  defaultUtmSource: string | null
  defaultUtmMedium: string | null
}

export interface UpdateCampaignSettingsInput {
  timezone?: string | null
  scheduleGroupName?: string | null
  defaultUtmSource?: string | null
  defaultUtmMedium?: string | null
}

export const CAMPAIGN_STATUSES: { value: CampaignStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Rascunho', color: 'bg-slate-100 text-slate-600' },
  { value: 'scheduled', label: 'Agendada', color: 'bg-blue-100 text-blue-700' },
  { value: 'sending', label: 'Enviando', color: 'bg-amber-100 text-amber-700' },
  { value: 'sent', label: 'Enviada', color: 'bg-green-100 text-green-700' },
  { value: 'paused', label: 'Pausada', color: 'bg-amber-100 text-amber-700' },
  { value: 'cancelled', label: 'Cancelada', color: 'bg-red-100 text-red-700' },
]

export const RECIPIENT_TYPE_OPTIONS: { value: RecipientType; label: string; description: string }[] = [
  { value: 'all', label: 'Todos os Contatos', description: 'Enviar para toda a base de contatos ativos' },
  { value: 'lifecycleStage', label: 'Por Estágio do Ciclo', description: 'Filtrar por Lead, Subscriber, Customer ou Active' },
  { value: 'segment', label: 'Por Segmento', description: 'Enviar para um segmento específico' },
]

export const LIFECYCLE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'lead', label: 'Lead' },
  { value: 'subscriber', label: 'Subscriber' },
  { value: 'customer', label: 'Customer' },
  { value: 'active', label: 'Active' },
]

export const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: 'America/Sao_Paulo', label: 'Brasília (GMT-3)' },
  { value: 'America/Manaus', label: 'Manaus (GMT-4)' },
  { value: 'America/Belem', label: 'Belém (GMT-3)' },
  { value: 'America/Fortaleza', label: 'Fortaleza (GMT-3)' },
  { value: 'America/Recife', label: 'Recife (GMT-3)' },
  { value: 'America/Cuiaba', label: 'Cuiabá (GMT-4)' },
  { value: 'America/Rio_Branco', label: 'Rio Branco (GMT-5)' },
  { value: 'America/Noronha', label: 'Noronha (GMT-2)' },
]

// ── Timezone Options ─────────────────────────────────────────────────────────
