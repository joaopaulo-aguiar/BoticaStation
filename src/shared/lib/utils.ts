import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 13 && cleaned.startsWith('55')) {
    const ddd = cleaned.slice(2, 4)
    const part1 = cleaned.slice(4, 9)
    const part2 = cleaned.slice(9)
    return `+55 (${ddd}) ${part1}-${part2}`
  }
  if (cleaned.length === 11) {
    const ddd = cleaned.slice(0, 2)
    const part1 = cleaned.slice(2, 7)
    const part2 = cleaned.slice(7)
    return `(${ddd}) ${part1}-${part2}`
  }
  return phone
}

export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11) {
    return `+55${cleaned}`
  }
  if (cleaned.length === 13 && cleaned.startsWith('55')) {
    return `+${cleaned}`
  }
  return `+55${cleaned}`
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
