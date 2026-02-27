/**
 * Settings store – persisted in localStorage.
 * Manages S3 bucket config for template backups,
 * DynamoDB table config for campaign analytics,
 * and SES sender profile configuration.
 */
import { create } from 'zustand'

const SETTINGS_KEY = 'botica_settings'

export interface S3BucketConfig {
  bucketArn: string // e.g. arn:aws:s3:::templates-botica
  region: string // e.g. sa-east-1
}

export interface DynamoTableConfig {
  tableName: string
  region: string
}

/** A configured sender profile for email campaigns */
export interface SenderProfile {
  id: string
  label: string        // e.g. "Marketing"
  email: string        // e.g. "desperte@boticaalternativa.com.br"
  displayName: string  // e.g. "Botica Alternativa"
  replyTo?: string
  isDefault?: boolean
}

export interface SesConfig {
  region: string
  senderProfiles: SenderProfile[]
  defaultConfigurationSet?: string
}

export interface EventBridgeConfig {
  /** Whether EventBridge scheduling is enabled */
  enabled: boolean
  /** AWS region for EventBridge Scheduler */
  region: string
  /** IAM Role ARN for EventBridge to assume when invoking targets */
  roleArn: string
  /** Target Lambda ARN that processes scheduled campaign sends */
  targetLambdaArn: string
  /** Schedule group name (optional) */
  scheduleGroupName: string
}

export interface AppSettings {
  s3Bucket: S3BucketConfig
  campaignAnalyticsTable: DynamoTableConfig
  ses: SesConfig
  eventBridge: EventBridgeConfig
}

const DEFAULT_SETTINGS: AppSettings = {
  s3Bucket: {
    bucketArn: 'arn:aws:s3:::templates-botica',
    region: 'sa-east-1',
  },
  campaignAnalyticsTable: {
    tableName: '',
    region: 'sa-east-1',
  },
  ses: {
    region: 'sa-east-1',
    senderProfiles: [],
  },
  eventBridge: {
    enabled: false,
    region: 'sa-east-1',
    roleArn: '',
    targetLambdaArn: '',
    scheduleGroupName: 'botica-station',
  },
}

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return {
      s3Bucket: { ...DEFAULT_SETTINGS.s3Bucket, ...parsed.s3Bucket },
      campaignAnalyticsTable: {
        ...DEFAULT_SETTINGS.campaignAnalyticsTable,
        ...parsed.campaignAnalyticsTable,
      },
      ses: {
        ...DEFAULT_SETTINGS.ses,
        ...parsed.ses,
        senderProfiles: parsed.ses?.senderProfiles ?? [],
      },
      eventBridge: {
        ...DEFAULT_SETTINGS.eventBridge,
        ...parsed.eventBridge,
      },
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

/**
 * Extract bucket name from ARN or plain bucket name.
 * `arn:aws:s3:::my-bucket` → `my-bucket`
 * `my-bucket` → `my-bucket`
 */
export function extractBucketName(arnOrName: string): string {
  const trimmed = arnOrName.trim()
  if (trimmed.startsWith('arn:aws:s3:::')) {
    return trimmed.replace('arn:aws:s3:::', '')
  }
  return trimmed
}

interface SettingsState {
  settings: AppSettings
  updateS3Bucket: (config: S3BucketConfig) => void
  updateCampaignTable: (config: DynamoTableConfig) => void
  updateSesConfig: (config: Partial<SesConfig>) => void
  setDefaultConfigurationSet: (name: string | undefined) => void
  addSenderProfile: (profile: SenderProfile) => void
  updateSenderProfile: (id: string, data: Partial<SenderProfile>) => void
  removeSenderProfile: (id: string) => void
  updateEventBridge: (config: Partial<EventBridgeConfig>) => void
  resetToDefaults: () => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: loadSettings(),

  updateS3Bucket: (config: S3BucketConfig) => {
    set((state) => {
      const next = { ...state.settings, s3Bucket: config }
      saveSettings(next)
      return { settings: next }
    })
  },

  updateCampaignTable: (config: DynamoTableConfig) => {
    set((state) => {
      const next = { ...state.settings, campaignAnalyticsTable: config }
      saveSettings(next)
      return { settings: next }
    })
  },

  updateSesConfig: (config: Partial<SesConfig>) => {
    set((state) => {
      const next = {
        ...state.settings,
        ses: { ...state.settings.ses, ...config },
      }
      saveSettings(next)
      return { settings: next }
    })
  },

  setDefaultConfigurationSet: (name: string | undefined) => {
    set((state) => {
      const next = {
        ...state.settings,
        ses: { ...state.settings.ses, defaultConfigurationSet: name },
      }
      saveSettings(next)
      return { settings: next }
    })
  },

  addSenderProfile: (profile: SenderProfile) => {
    set((state) => {
      const profiles = [...state.settings.ses.senderProfiles, profile]
      const next = {
        ...state.settings,
        ses: { ...state.settings.ses, senderProfiles: profiles },
      }
      saveSettings(next)
      return { settings: next }
    })
  },

  updateSenderProfile: (id: string, data: Partial<SenderProfile>) => {
    set((state) => {
      const profiles = state.settings.ses.senderProfiles.map((p) =>
        p.id === id ? { ...p, ...data } : p,
      )
      const next = {
        ...state.settings,
        ses: { ...state.settings.ses, senderProfiles: profiles },
      }
      saveSettings(next)
      return { settings: next }
    })
  },

  removeSenderProfile: (id: string) => {
    set((state) => {
      const profiles = state.settings.ses.senderProfiles.filter((p) => p.id !== id)
      const next = {
        ...state.settings,
        ses: { ...state.settings.ses, senderProfiles: profiles },
      }
      saveSettings(next)
      return { settings: next }
    })
  },

  updateEventBridge: (config: Partial<EventBridgeConfig>) => {
    set((state) => {
      const next = {
        ...state.settings,
        eventBridge: { ...state.settings.eventBridge, ...config },
      }
      saveSettings(next)
      return { settings: next }
    })
  },

  resetToDefaults: () => {
    saveSettings(DEFAULT_SETTINGS)
    set({ settings: DEFAULT_SETTINGS })
  },
}))
