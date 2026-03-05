export interface TemplateSummary {
  name: string
  displayName: string
  createdAt: string | null
  updatedAt: string | null
}

export interface TemplateDetail {
  name: string
  displayName: string
  subject: string
  html: string
  text: string
  testData?: Record<string, unknown>
}

export interface BackupVersion {
  version: string
  key: string
  lastModified: string
  size: number
}

export interface VerifiedIdentity {
  identity: string
  type: string
  sendingEnabled: boolean
  verificationStatus: string
}
