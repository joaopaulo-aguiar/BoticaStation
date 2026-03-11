// ── SES Types ────────────────────────────────────────────────────────────────

export interface SesAccountStatus {
  sendingEnabled: boolean
  inSandbox: boolean
  max24HourSend: number
  sentLast24Hours: number
  maxSendRate: number
  configSets: number
}

export interface VerifiedIdentity {
  identity: string
  type: string                 // EmailAddress | Domain
  sendingEnabled: boolean
  verificationStatus: string   // Success | Pending | Failed | TemporaryFailure | NotStarted
}

export interface SenderProfile {
  id: string
  name: string                 // e.g. "Botica Alternativa"
  email: string                // e.g. "contato@tevora.com.br"
  replyTo: string | null
  isDefault: boolean
  createdAt: string
}

// ── Cognito Types ────────────────────────────────────────────────────────────

export interface CognitoUser {
  username: string
  email: string
  name: string | null
  status: string               // CONFIRMED | FORCE_CHANGE_PASSWORD | UNCONFIRMED
  enabled: boolean
  groups: string[]
  createdAt: string
  updatedAt: string | null
}

export interface CognitoGroup {
  name: string
  description: string | null
  precedence: number | null
  createdAt: string
  updatedAt: string | null
}

export interface CreateUserInput {
  email: string
  name: string
  temporaryPassword: string
  group: string
}

export interface UpdateUserInput {
  name?: string
  enabled?: boolean
}

// ── Campaign Settings (EventBridge Scheduler) ────────────────────────────────

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
