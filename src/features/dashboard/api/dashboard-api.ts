import type { DashboardMetrics, DashboardPeriod, DailyDataPoint } from '../types'

// ── Fake data generator (replaces real API while backend is not ready) ──────

function generateDailySeries(days: number, scale: number): DailyDataPoint[] {
  const series: DailyDataPoint[] = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const dayOfWeek = d.getDay()
    const weekendFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 0.6 : 1
    const noiseFactor = 0.7 + Math.random() * 0.6

    const sent = Math.round(400 * scale * weekendFactor * noiseFactor)
    const opened = Math.round(sent * (0.42 + Math.random() * 0.12))
    const clicked = Math.round(opened * (0.22 + Math.random() * 0.08))
    const revenue = Math.round(sent * (7.5 + Math.random() * 5) * 100) / 100
    const orders = Math.round(sent * (0.028 + Math.random() * 0.015))
    const cashbackIssued = Math.round(orders * (25 + Math.random() * 15) * 100) / 100

    series.push({ date: dateStr, emailsSent: sent, emailsOpened: opened, emailsClicked: clicked, revenue, orders, cashbackIssued })
  }
  return series
}

const FAKE_DATA: Record<DashboardPeriod, DashboardMetrics> = {
  TODAY: {
    email: { sent: 830, delivered: 818, opened: 412, clicked: 108, bounced: 9, complained: 3, unsubscribed: 5 },
    campaigns: { totalSent: 2, totalScheduled: 1, totalDraft: 3, revenue: 6250.0 },
    cashback: { totalIssued: 38, totalRedeemed: 22, totalExpired: 2, amountIssued: 1140.0, amountRedeemed: 660.0, amountExpired: 60.0, activeBalance: 89450.5 },
    ecommerce: { orders: 28, revenue: 7000.0, avgTicket: 250.0, abandonedCarts: 9, abandonedValue: 2250.0, conversionRate: 3.4 },
    automations: { totalActive: 5, totalExecutions: 186, emailsSentByAutomation: 372, conversions: 18 },
    dailySeries: generateDailySeries(1, 1),
  },
  THIS_MONTH: {
    email: { sent: 12480, delivered: 12231, opened: 5870, clicked: 1620, bounced: 187, complained: 62, unsubscribed: 94 },
    campaigns: { totalSent: 18, totalScheduled: 4, totalDraft: 7, revenue: 47850.0 },
    cashback: { totalIssued: 580, totalRedeemed: 312, totalExpired: 45, amountIssued: 17400.0, amountRedeemed: 9360.0, amountExpired: 1350.0, activeBalance: 89450.5 },
    ecommerce: { orders: 423, revenue: 105750.0, avgTicket: 250.0, abandonedCarts: 156, abandonedValue: 39000.0, conversionRate: 3.8 },
    automations: { totalActive: 5, totalExecutions: 2840, emailsSentByAutomation: 5680, conversions: 284 },
    dailySeries: generateDailySeries(13, 1),
  },
  LAST_MONTH: {
    email: { sent: 28650, delivered: 28078, opened: 12635, clicked: 3721, bounced: 430, complained: 142, unsubscribed: 215 },
    campaigns: { totalSent: 32, totalScheduled: 0, totalDraft: 0, revenue: 96480.0 },
    cashback: { totalIssued: 1240, totalRedeemed: 680, totalExpired: 98, amountIssued: 37200.0, amountRedeemed: 20400.0, amountExpired: 2940.0, activeBalance: 82650.0 },
    ecommerce: { orders: 912, revenue: 228000.0, avgTicket: 250.0, abandonedCarts: 340, abandonedValue: 85000.0, conversionRate: 3.5 },
    automations: { totalActive: 4, totalExecutions: 5620, emailsSentByAutomation: 11240, conversions: 562 },
    dailySeries: generateDailySeries(28, 1),
  },
  LAST_30_DAYS: {
    email: { sent: 29800, delivered: 29204, opened: 13142, clicked: 3870, bounced: 447, complained: 149, unsubscribed: 224 },
    campaigns: { totalSent: 35, totalScheduled: 4, totalDraft: 7, revenue: 102350.0 },
    cashback: { totalIssued: 1320, totalRedeemed: 720, totalExpired: 102, amountIssued: 39600.0, amountRedeemed: 21600.0, amountExpired: 3060.0, activeBalance: 89450.5 },
    ecommerce: { orders: 982, revenue: 245500.0, avgTicket: 250.0, abandonedCarts: 365, abandonedValue: 91250.0, conversionRate: 3.6 },
    automations: { totalActive: 5, totalExecutions: 6120, emailsSentByAutomation: 12240, conversions: 612 },
    dailySeries: generateDailySeries(30, 1),
  },
  THIS_YEAR: {
    email: { sent: 82400, delivered: 80752, opened: 36338, clicked: 10712, bounced: 1236, complained: 412, unsubscribed: 618 },
    campaigns: { totalSent: 92, totalScheduled: 4, totalDraft: 7, revenue: 312480.0 },
    cashback: { totalIssued: 3640, totalRedeemed: 1980, totalExpired: 280, amountIssued: 109200.0, amountRedeemed: 59400.0, amountExpired: 8400.0, activeBalance: 89450.5 },
    ecommerce: { orders: 2845, revenue: 711250.0, avgTicket: 250.0, abandonedCarts: 1042, abandonedValue: 260500.0, conversionRate: 3.6 },
    automations: { totalActive: 5, totalExecutions: 16850, emailsSentByAutomation: 33700, conversions: 1685 },
    dailySeries: generateDailySeries(73, 0.85),
  },
}

export async function getDashboardMetrics(period: DashboardPeriod): Promise<DashboardMetrics> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300))
  return FAKE_DATA[period]
}
