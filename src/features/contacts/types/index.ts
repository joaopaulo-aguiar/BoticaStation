// ── Contacts types (mirrors GraphQL schema) ─────────────────────────────────

export interface CashbackInfo {
  currentBalance: number
  lifetimeEarned: number
  expiryDate: string | null
}

export interface ContactStats {
  emailSends: number
  emailDeliveries: number
  emailOpens: number
  emailClicks: number
  emailBounces: number
  emailComplaints: number
  smsSends: number
  smsDeliveries: number
}

export interface EcommerceInfo {
  paidOrders: number
  revenue: number
  avgTicket: number
  lastPurchaseAt: string | null
  abandonedCarts: number
  abandonedCartValue: number
}

export interface LifecycleCounts {
  lead: number
  subscriber: number
  customer: number
}

export interface ContactCounters {
  total: number
  byLifecycle: LifecycleCounts
  updatedAt: string | null
}

export interface Contact {
  id: string
  email: string
  phone: string | null
  fullName: string
  lifecycleStage: string
  cashbackInfo: CashbackInfo | null
  ecommerceInfo: EcommerceInfo | null
  legalBasis: string | null
  tags: string[]
  stats: ContactStats | null
  createdAt: string
  updatedAt: string | null
  source: string
  status: string
  emailStatus: string | null
  emailFailReason: string | null
  phoneStatus: string | null
  createdBy: string | null
  updatedBy: string | null
}

export interface ContactListResult {
  items: Contact[]
  nextToken: string | null
  totalCount: number | null
}

export interface ImportResult {
  success: number
  failed: number
  errors: string[] | null
}

export interface CreateContactInput {
  email: string
  phone?: string | null
  fullName: string
  lifecycleStage?: string | null
  cashbackBalance?: number | null
  tags?: string[] | null
  source?: string | null
  emailStatus?: string | null
  phoneStatus?: string | null
}

export interface UpdateContactInput {
  fullName?: string | null
  email?: string | null
  phone?: string | null
  lifecycleStage?: string | null
  tags?: string[] | null
  status?: string | null
  emailStatus?: string | null
  emailFailReason?: string | null
  phoneStatus?: string | null
}

export interface ContactFilterInput {
  lifecycleStage?: string | null
  status?: string | null
  tag?: string | null
  search?: string | null
  emailStatus?: string | null
  phoneStatus?: string | null
}

export interface ContactSortInput {
  field?: 'CREATED_AT' | 'FULL_NAME' | 'EMAIL' | 'LIFECYCLE_STAGE'
  direction?: 'ASC' | 'DESC'
}

// ── Contact Events ──────────────────────────────────────────────────────────

export interface ContactEvent {
  contactId: string
  eventId: string
  channel: string
  eventType: string
  details: string | null
  campaignId: string | null
  campaignName: string | null
  subject: string | null
  createdAt: string
}

export interface ContactEventListResult {
  items: ContactEvent[]
  nextToken: string | null
}

export interface ContactEventFilterInput {
  channel?: string | null
  eventType?: string | null
}

// ── Enums & UI configs ──────────────────────────────────────────────────────

export type LifecycleStage = 'lead' | 'subscriber' | 'customer'
export type ContactStatus = 'active' | 'inactive' | 'archived'

export type EmailStatus = 'active' | 'bounced' | 'complained' | 'unsubscribed'
export type PhoneStatus = 'active' | 'invalid' | 'unsubscribed'

export type EmailEventType = 'Send' | 'Delivery' | 'Open' | 'Click' | 'Bounce' | 'Complaint' | 'Reject'
export type EventChannel = 'email' | 'sms' | 'cashback' | 'web'

export const EMAIL_STATUSES: { value: EmailStatus; label: string; color: string }[] = [
  { value: 'active', label: 'Ativo', color: 'bg-green-100 text-green-700' },
  { value: 'bounced', label: 'Bounce', color: 'bg-red-100 text-red-700' },
  { value: 'complained', label: 'Complaint', color: 'bg-red-100 text-red-700' },
  { value: 'unsubscribed', label: 'Descadastrado', color: 'bg-slate-100 text-slate-600' },
]

export const PHONE_STATUSES: { value: PhoneStatus; label: string; color: string }[] = [
  { value: 'active', label: 'Ativo', color: 'bg-green-100 text-green-700' },
  { value: 'invalid', label: 'Inválido', color: 'bg-red-100 text-red-700' },
  { value: 'unsubscribed', label: 'Descadastrado', color: 'bg-slate-100 text-slate-600' },
]

export const LIFECYCLE_STAGES: { value: LifecycleStage; label: string; color: string }[] = [
  { value: 'lead', label: 'Lead', color: 'bg-amber-100 text-amber-700' },
  { value: 'subscriber', label: 'Subscriber', color: 'bg-blue-100 text-blue-700' },
  { value: 'customer', label: 'Customer', color: 'bg-green-100 text-green-700' },
]

export const CONTACT_STATUSES: { value: ContactStatus; label: string; color: string }[] = [
  { value: 'active', label: 'Ativo', color: 'bg-green-100 text-green-700' },
  { value: 'inactive', label: 'Inativo', color: 'bg-slate-100 text-slate-600' },
]

export const EVENT_TYPE_CONFIG: Record<string, Record<string, { label: string; color: string }>> = {
  email: {
    Send:      { label: 'E-mail enviado',    color: 'text-blue-500' },
    Delivery:  { label: 'E-mail entregue',   color: 'text-green-500' },
    Open:      { label: 'E-mail aberto',     color: 'text-purple-500' },
    Click:     { label: 'Link clicado',      color: 'text-indigo-500' },
    Bounce:    { label: 'E-mail bounce',     color: 'text-red-500' },
    Complaint: { label: 'E-mail reclamação', color: 'text-red-600' },
    Reject:    { label: 'E-mail rejeitado',  color: 'text-red-400' },
  },
  sms: {
    Send:     { label: 'SMS enviado',    color: 'text-cyan-500' },
    Delivery: { label: 'SMS entregue',   color: 'text-cyan-600' },
  },
  cashback: {
    Earned:   { label: 'Cashback recebido',  color: 'text-emerald-500' },
    Redeemed: { label: 'Cashback resgatado', color: 'text-amber-500' },
    Expired:  { label: 'Cashback expirado',  color: 'text-slate-400' },
  },
  web: {
    PageView:   { label: 'Visita no site',      color: 'text-sky-500' },
    FormSubmit: { label: 'Formulário enviado',  color: 'text-violet-500' },
  },
}

export function getEventConfig(channel: string, eventType: string) {
  return EVENT_TYPE_CONFIG[channel]?.[eventType]
    ?? { label: `${channel}: ${eventType}`, color: 'text-slate-500' }
}

export const CHANNEL_FILTERS = [
  { channel: null,       label: 'Todos',    icon: '📋' },
  { channel: 'email',    label: 'E-mail',   icon: '📧' },
  { channel: 'sms',      label: 'SMS',      icon: '💬' },
  { channel: 'cashback', label: 'Cashback', icon: '💰' },
  { channel: 'web',      label: 'Web',      icon: '🌐' },
] as const

export const SOURCE_LABELS: Record<string, string> = {
  manual_input: 'Entrada manual',
  import_csv: 'Importação CSV',
  website: 'Website',
  api: 'API',
  automation: 'Automação',
}
