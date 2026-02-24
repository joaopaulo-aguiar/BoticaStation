/**
 * Settings store – persisted in localStorage.
 * Manages S3 bucket config for template backups and
 * DynamoDB table config for campaign analytics.
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

export interface AppSettings {
  s3Bucket: S3BucketConfig
  campaignAnalyticsTable: DynamoTableConfig
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

  resetToDefaults: () => {
    saveSettings(DEFAULT_SETTINGS)
    set({ settings: DEFAULT_SETTINGS })
  },
}))
