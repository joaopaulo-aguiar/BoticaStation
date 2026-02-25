/**
 * Local store for campaign drafts (persisted in localStorage).
 * Drafts are saved locally before being committed to DynamoDB.
 */
import { create } from 'zustand'
import type { CampaignFormData } from '../types'

const DRAFTS_KEY = 'botica_campaign_drafts'

export interface DraftCampaign extends CampaignFormData {
  localId: string
  createdAt: string
  updatedAt: string
}

interface CampaignDraftsState {
  drafts: DraftCampaign[]
  saveDraft: (draft: DraftCampaign) => void
  removeDraft: (localId: string) => void
  getDraft: (localId: string) => DraftCampaign | undefined
  clearDrafts: () => void
}

function loadDrafts(): DraftCampaign[] {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function persistDrafts(drafts: DraftCampaign[]) {
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts))
}

export const useCampaignDraftsStore = create<CampaignDraftsState>((set, get) => ({
  drafts: loadDrafts(),

  saveDraft: (draft) => {
    const existing = get().drafts
    const idx = existing.findIndex((d) => d.localId === draft.localId)
    let next: DraftCampaign[]
    if (idx >= 0) {
      next = [...existing]
      next[idx] = { ...draft, updatedAt: new Date().toISOString() }
    } else {
      next = [draft, ...existing]
    }
    persistDrafts(next)
    set({ drafts: next })
  },

  removeDraft: (localId) => {
    const next = get().drafts.filter((d) => d.localId !== localId)
    persistDrafts(next)
    set({ drafts: next })
  },

  getDraft: (localId) => get().drafts.find((d) => d.localId === localId),

  clearDrafts: () => {
    localStorage.removeItem(DRAFTS_KEY)
    set({ drafts: [] })
  },
}))
