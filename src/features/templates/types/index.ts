export interface TemplateSummary {
  name: string
  displayName: string
  createdAt: string | null
  updatedAt: string | null
}

export interface TemplateUtmDefaults {
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
}

export interface TemplateDetail {
  name: string
  displayName: string
  subject: string
  html: string
  text: string
  testData?: Record<string, unknown>
  utmDefaults?: TemplateUtmDefaults
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

/** Represents a link extracted from template HTML for UTM analysis */
export interface TemplateLink {
  /** The full href value */
  url: string
  /** The text content of the link */
  text: string
  /** Whether this link has data-no-utm attribute */
  excludeFromUtm: boolean
  /** Whether this link already has hardcoded UTM params */
  hasHardcodedUtm: boolean
  /** Whether this is a trackable URL (not mailto:, tel:, #) */
  isTrackable: boolean
  /** Approximate line number in source HTML */
  line?: number
}
