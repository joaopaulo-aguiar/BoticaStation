// ── Contacts types (mirrors GraphQL schema) ─────────────────────────────────

export interface CashbackInfo {
  currentBalance: number
  lifetimeEarned: number
  expiryDate: string | null
}

export interface Contact {
  id: string
  email: string
  phone: string | null
  fullName: string
  lifecycleStage: string
  cashbackInfo: CashbackInfo | null
  tags: string[]
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
}

export interface UpdateContactInput {
  fullName?: string | null
  email?: string | null
  phone?: string | null
  lifecycleStage?: string | null
  tags?: string[] | null
  status?: string | null
  emailStatus?: string | null
  phoneStatus?: string | null
}

export interface ContactFilterInput {
  lifecycleStage?: string | null
  status?: string | null
  tag?: string | null
  search?: string | null
}

export interface ContactSortInput {
  field?: 'CREATED_AT' | 'FULL_NAME' | 'EMAIL' | 'LIFECYCLE_STAGE'
  direction?: 'ASC' | 'DESC'
}

export type LifecycleStage = 'lead' | 'subscriber' | 'customer'
export type ContactStatus = 'active' | 'inactive' | 'archived'

export type EmailStatus = 'active' | 'bounced' | 'complained' | 'unsubscribed'
export type PhoneStatus = 'active' | 'invalid' | 'unsubscribed'

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
