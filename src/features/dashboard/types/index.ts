// ── Dashboard types ──────────────────────────────────────────────────────────

export type DashboardPeriod = 'TODAY' | 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_30_DAYS' | 'THIS_YEAR'

export interface EmailMetrics {
  sent: number
  delivered: number
  opened: number
  clicked: number
  bounced: number
  complained: number
  unsubscribed: number
}

export interface CampaignMetricsSummary {
  totalSent: number
  totalScheduled: number
  totalDraft: number
  revenue: number
}

export interface CashbackMetrics {
  totalIssued: number
  totalRedeemed: number
  totalExpired: number
  amountIssued: number
  amountRedeemed: number
  amountExpired: number
  activeBalance: number
}

export interface EcommerceMetrics {
  orders: number
  revenue: number
  avgTicket: number
  abandonedCarts: number
  abandonedValue: number
  conversionRate: number
}

export interface AutomationMetrics {
  totalActive: number
  totalExecutions: number
  emailsSentByAutomation: number
  conversions: number
}

export interface DailyDataPoint {
  date: string
  emailsSent: number
  emailsOpened: number
  emailsClicked: number
  revenue: number
  orders: number
  cashbackIssued: number
}

export interface DashboardMetrics {
  email: EmailMetrics
  campaigns: CampaignMetricsSummary
  cashback: CashbackMetrics
  ecommerce: EcommerceMetrics
  automations: AutomationMetrics
  dailySeries: DailyDataPoint[]
}

export const DASHBOARD_PERIODS: { value: DashboardPeriod; label: string }[] = [
  { value: 'TODAY', label: 'Hoje' },
  { value: 'THIS_MONTH', label: 'Este mês' },
  { value: 'LAST_MONTH', label: 'Mês passado' },
  { value: 'LAST_30_DAYS', label: 'Últimos 30 dias' },
  { value: 'THIS_YEAR', label: 'Este ano' },
]
