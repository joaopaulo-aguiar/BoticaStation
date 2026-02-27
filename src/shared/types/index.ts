export interface Contact {
  PK: string
  SK: string
  email: string
  phone: string
  full_name: string
  first_name?: string
  last_name?: string
  lifecycle_stage: 'customer' | 'subscriber' | 'lead'
  cashback_info: {
    current_balance: number
    lifetime_earned: number
    expiry_date: string
    last_transaction_date?: string
  }
  tags: string[]
  created_at: string
  updated_at?: string
  source: string
  status?: 'active' | 'inactive' | 'bounced' | 'unsubscribed' | 'complained'
  lead_score?: number
  opt_in_email?: boolean
  opt_in_sms?: boolean
  custom_fields?: Record<string, string>
}

export interface ContactFormData {
  email: string
  phone: string
  full_name: string
  lifecycle_stage: 'customer' | 'subscriber' | 'lead'
  cashback_balance: number
  tags: string[]
  status?: 'active' | 'inactive' | 'bounced' | 'unsubscribed' | 'complained'
  opt_in_email?: boolean
  opt_in_sms?: boolean
  custom_fields?: Record<string, string>
}

export interface AWSSessionCredentials {
  accessKeyId: string
  secretAccessKey: string
  sessionToken: string
  expiration: Date
  region: string
}

export interface AWSLoginForm {
  accessKeyId: string
  secretAccessKey: string
  mfaToken: string
  mfaSerialNumber: string
  region: string
}
