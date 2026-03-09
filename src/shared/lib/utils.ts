import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Phone formatting ─────────────────────────────────────────────────────────

const COUNTRY_FLAGS: Record<string, string> = {
  '55': '🇧🇷',
  '1': '🇺🇸',
  '351': '🇵🇹',
  '54': '🇦🇷',
  '598': '🇺🇾',
  '595': '🇵🇾',
}

/**
 * Format a phone number stored as E.164 (+5541996779333) into a human-readable
 * string with country flag: 🇧🇷 (41) 99677-9333
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '—'

  // Only format E.164 numbers starting with +
  if (!phone.startsWith('+')) return phone

  const digits = phone.slice(1) // remove '+'

  // Brazilian numbers: +55 DD XXXXX-XXXX (mobile) or +55 DD XXXX-XXXX (landline)
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    const ddd = digits.slice(2, 4)
    const number = digits.slice(4)
    const formatted = number.length === 9
      ? `${number.slice(0, 5)}-${number.slice(5)}`
      : `${number.slice(0, 4)}-${number.slice(4)}`
    return `🇧🇷 (${ddd}) ${formatted}`
  }

  // Other known countries — show flag + raw digits
  for (const [code, flag] of Object.entries(COUNTRY_FLAGS)) {
    if (digits.startsWith(code)) {
      return `${flag} +${digits}`
    }
  }

  // Unknown — show as-is
  return phone
}

// ── Base64url decoding (campaign names from SES tags) ────────────────────────

export function decodeCampaignName(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
    return decodeURIComponent(escape(atob(base64)))
  } catch {
    return value
  }
}
