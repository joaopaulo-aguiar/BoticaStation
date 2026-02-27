/**
 * Dummy data for the dashboard.
 * Realistic pharmacy/wellness e-commerce data with email campaigns,
 * orders, revenue, average ticket and cashback analytics.
 */

// ─── Period helpers ─────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}

function isToday(d: Date): boolean {
  const now = new Date()
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  )
}

function isThisMonth(d: Date): boolean {
  const now = new Date()
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

function isLast7Days(d: Date): boolean {
  return d >= daysAgo(7)
}

function isLast30Days(d: Date): boolean {
  return d >= daysAgo(30)
}

// ─── Types ──────────────────────────────────────────────────────────────────

export type Period = 'today' | '7d' | 'month' | '30d'

export const periodLabels: Record<Period, string> = {
  today: 'Hoje',
  '7d': '7 dias',
  month: 'Este mês',
  '30d': '30 dias',
}

export interface KpiCard {
  label: string
  value: number
  previousValue: number
  format: 'number' | 'percent' | 'currency'
  color: string
  icon: string
}

export interface DailyVolume {
  date: string
  rawDate: Date
  enviados: number
  entregues: number
  aberturas: number
  cliques: number
  bounces: number
}

export interface DeliverySlice {
  name: string
  value: number
  color: string
}

export interface CampaignPerformance {
  name: string
  enviados: number
  aberturas: number
  cliques: number
  conversoes: number
}

export interface FunnelStep {
  name: string
  value: number
  fill: string
}

export interface ClientShare {
  name: string
  value: number
  color: string
}

export interface HeatmapCell {
  hour: number
  day: string
  value: number
}

export interface CampaignRow {
  id: string
  name: string
  sentAt: string
  status: 'completed' | 'sending' | 'scheduled' | 'draft'
  recipients: number
  delivered: number
  openRate: number
  clickRate: number
  bounceRate: number
  unsubscribeRate: number
}

// ─── Revenue & Orders types ─────────────────────────────────────────────────

export interface DailyRevenue {
  date: string
  rawDate: Date
  pedidos: number
  receita: number
  ticketMedio: number
  pedidosCashback: number
  receitaCashback: number
}

export interface RevenueKpi {
  label: string
  value: number
  previousValue: number
  format: 'number' | 'percent' | 'currency'
  color: string
  icon: string
}

// ─── Cashback types ─────────────────────────────────────────────────────────

export interface CashbackKpi {
  label: string
  value: number
  previousValue: number
  format: 'number' | 'percent' | 'currency'
  color: string
  icon: string
}

export interface CashbackUsageTrend {
  date: string
  rawDate: Date
  saldoDistribuido: number
  saldoUtilizado: number
  novosUsuarios: number
}

export interface CashbackSegment {
  name: string
  usuarios: number
  pedidos: number
  ticketMedio: number
  receitaTotal: number
  color: string
}

export interface CashbackRevenueCorrelation {
  month: string
  receitaSemCashback: number
  receitaComCashback: number
  percentualCrescimento: number
}

// ─── Generate daily volume (60 days) ────────────────────────────────────────

function generateDailyVolume(): DailyVolume[] {
  const data: DailyVolume[] = []
  const now = new Date()
  for (let i = 59; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    d.setHours(0, 0, 0, 0)
    const base = 1200 + Math.round(Math.sin(i * 0.15) * 300 + (60 - i) * 8)
    const dayOfWeek = d.getDay()
    const weekendMultiplier = dayOfWeek === 0 || dayOfWeek === 6 ? 0.4 : 1
    const enviados = Math.round(base * weekendMultiplier)
    const entregues = Math.round(enviados * (0.96 + (60 - i) * 0.0005))
    const aberturas = Math.round(entregues * (0.30 + (60 - i) * 0.002))
    const cliques = Math.round(aberturas * (0.20 + (60 - i) * 0.001))
    const bounces = enviados - entregues

    data.push({
      date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      rawDate: new Date(d),
      enviados,
      entregues,
      aberturas,
      cliques,
      bounces,
    })
  }
  return data
}

export const dailyVolume: DailyVolume[] = generateDailyVolume()

// ─── Generate revenue data (60 days) ────────────────────────────────────────

function generateDailyRevenue(): DailyRevenue[] {
  const data: DailyRevenue[] = []
  const now = new Date()
  for (let i = 59; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    d.setHours(0, 0, 0, 0)
    const dayOfWeek = d.getDay()
    const weekendMultiplier = dayOfWeek === 0 || dayOfWeek === 6 ? 0.65 : 1
    const basePedidos = Math.round((28 + (60 - i) * 0.6 + Math.sin(i * 0.3) * 5) * weekendMultiplier)
    const baseTicket = 127 + (60 - i) * 0.8 + Math.round(Math.sin(i * 0.2) * 15)
    const pedidos = Math.max(8, basePedidos)
    const ticketMedio = Math.round(baseTicket * 100) / 100
    const receita = Math.round(pedidos * ticketMedio * 100) / 100
    const cashbackRate = Math.min(0.45, 0.15 + (60 - i) * 0.005)
    const pedidosCashback = Math.round(pedidos * cashbackRate)
    const cashbackTicket = ticketMedio * 1.18
    const receitaCashback = Math.round(pedidosCashback * cashbackTicket * 100) / 100

    data.push({
      date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      rawDate: new Date(d),
      pedidos,
      receita,
      ticketMedio,
      pedidosCashback,
      receitaCashback,
    })
  }
  return data
}

export const dailyRevenue: DailyRevenue[] = generateDailyRevenue()

// ─── Generate cashback usage trend (60 days) ────────────────────────────────

function generateCashbackUsageTrend(): CashbackUsageTrend[] {
  const data: CashbackUsageTrend[] = []
  const now = new Date()
  for (let i = 59; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    d.setHours(0, 0, 0, 0)
    const distribuido = Math.round(850 + (60 - i) * 15 + Math.sin(i * 0.25) * 200)
    const utilizado = Math.round(distribuido * (0.35 + (60 - i) * 0.004 + Math.random() * 0.08))
    const novosUsuarios = Math.round(8 + (60 - i) * 0.3 + Math.random() * 4)

    data.push({
      date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      rawDate: new Date(d),
      saldoDistribuido: distribuido,
      saldoUtilizado: utilizado,
      novosUsuarios,
    })
  }
  return data
}

export const cashbackUsageTrend: CashbackUsageTrend[] = generateCashbackUsageTrend()

// ─── Aggregate helper ────────────────────────────────────────────────────────

function filterByPeriod<T extends { rawDate: Date }>(data: T[], period: Period): T[] {
  switch (period) {
    case 'today':
      return data.filter((d) => isToday(d.rawDate))
    case '7d':
      return data.filter((d) => isLast7Days(d.rawDate))
    case 'month':
      return data.filter((d) => isThisMonth(d.rawDate))
    case '30d':
      return data.filter((d) => isLast30Days(d.rawDate))
  }
}

function previousPeriodData<T extends { rawDate: Date }>(data: T[], period: Period): T[] {
  const now = new Date()
  switch (period) {
    case 'today': {
      const yesterday = daysAgo(1)
      return data.filter((d) =>
        d.rawDate.getDate() === yesterday.getDate() &&
        d.rawDate.getMonth() === yesterday.getMonth() &&
        d.rawDate.getFullYear() === yesterday.getFullYear(),
      )
    }
    case '7d': {
      const start = daysAgo(14)
      const end = daysAgo(7)
      return data.filter((d) => d.rawDate >= start && d.rawDate < end)
    }
    case 'month': {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      return data.filter(
        (d) => d.rawDate.getMonth() === prevMonth.getMonth() && d.rawDate.getFullYear() === prevMonth.getFullYear(),
      )
    }
    case '30d': {
      const start = daysAgo(60)
      const end = daysAgo(30)
      return data.filter((d) => d.rawDate >= start && d.rawDate < end)
    }
  }
}

// ─── Email KPIs by period ───────────────────────────────────────────────────

export function getEmailKpis(period: Period): KpiCard[] {
  const current = filterByPeriod(dailyVolume, period)
  const prev = previousPeriodData(dailyVolume, period)

  const sum = (arr: DailyVolume[], key: keyof DailyVolume) =>
    arr.reduce((acc, d) => acc + (d[key] as number), 0)

  const curSent = sum(current, 'enviados')
  const curDel = sum(current, 'entregues')
  const curOpen = sum(current, 'aberturas')
  const curClick = sum(current, 'cliques')
  const curBounce = sum(current, 'bounces')

  const prevSent = sum(prev, 'enviados')
  const prevDel = sum(prev, 'entregues')
  const prevOpen = sum(prev, 'aberturas')
  const prevClick = sum(prev, 'cliques')

  const openRate = curDel > 0 ? (curOpen / curDel) * 100 : 0
  const clickRate = curOpen > 0 ? (curClick / curOpen) * 100 : 0
  const prevOpenRate = prevDel > 0 ? (prevOpen / prevDel) * 100 : 0
  const prevClickRate = prevOpen > 0 ? (prevClick / prevOpen) * 100 : 0

  return [
    { label: 'E-mails Enviados', value: curSent, previousValue: prevSent, format: 'number', color: 'blue', icon: 'mail' },
    { label: 'Entregues', value: curDel, previousValue: prevDel, format: 'number', color: 'green', icon: 'check' },
    { label: 'Taxa de Abertura', value: Math.round(openRate * 10) / 10, previousValue: Math.round(prevOpenRate * 10) / 10, format: 'percent', color: 'violet', icon: 'eye' },
    { label: 'Taxa de Clique', value: Math.round(clickRate * 10) / 10, previousValue: Math.round(prevClickRate * 10) / 10, format: 'percent', color: 'amber', icon: 'click' },
    { label: 'Bounces', value: curBounce, previousValue: sum(prev, 'bounces'), format: 'number', color: 'orange', icon: 'alert' },
  ]
}

// ─── Revenue KPIs by period ─────────────────────────────────────────────────

export function getRevenueKpis(period: Period): RevenueKpi[] {
  const current = filterByPeriod(dailyRevenue, period)
  const prev = previousPeriodData(dailyRevenue, period)

  const curPedidos = current.reduce((a, d) => a + d.pedidos, 0)
  const curReceita = current.reduce((a, d) => a + d.receita, 0)
  const curTicket = curPedidos > 0 ? curReceita / curPedidos : 0
  const curPedCB = current.reduce((a, d) => a + d.pedidosCashback, 0)
  const curRecCB = current.reduce((a, d) => a + d.receitaCashback, 0)
  const conversionRate = current.length > 0
    ? (curPedidos / Math.max(1, filterByPeriod(dailyVolume, period).reduce((a, d) => a + d.cliques, 0))) * 100
    : 0

  const prevPedidos = prev.reduce((a, d) => a + d.pedidos, 0)
  const prevReceita = prev.reduce((a, d) => a + d.receita, 0)
  const prevTicket = prevPedidos > 0 ? prevReceita / prevPedidos : 0
  const prevPedCB = prev.reduce((a, d) => a + d.pedidosCashback, 0)
  const prevRecCB = prev.reduce((a, d) => a + d.receitaCashback, 0)

  return [
    { label: 'Pedidos Fechados', value: curPedidos, previousValue: prevPedidos, format: 'number', color: 'emerald', icon: 'package' },
    { label: 'Receita Total', value: Math.round(curReceita), previousValue: Math.round(prevReceita), format: 'currency', color: 'green', icon: 'dollar' },
    { label: 'Ticket Médio', value: Math.round(curTicket * 100) / 100, previousValue: Math.round(prevTicket * 100) / 100, format: 'currency', color: 'blue', icon: 'receipt' },
    { label: 'Conversão E-mail', value: Math.round(conversionRate * 10) / 10, previousValue: 0, format: 'percent', color: 'violet', icon: 'target' },
    { label: 'Pedidos c/ Cashback', value: curPedCB, previousValue: prevPedCB, format: 'number', color: 'amber', icon: 'coins' },
    { label: 'Receita Cashback', value: Math.round(curRecCB), previousValue: Math.round(prevRecCB), format: 'currency', color: 'orange', icon: 'trending' },
  ]
}

// ─── Cashback KPIs by period ────────────────────────────────────────────────

export function getCashbackKpis(period: Period): CashbackKpi[] {
  const current = filterByPeriod(cashbackUsageTrend, period)
  const prev = previousPeriodData(cashbackUsageTrend, period)
  const revCurrent = filterByPeriod(dailyRevenue, period)
  const revPrev = previousPeriodData(dailyRevenue, period)

  const curDist = current.reduce((a, d) => a + d.saldoDistribuido, 0)
  const curUsed = current.reduce((a, d) => a + d.saldoUtilizado, 0)
  const curNewUsers = current.reduce((a, d) => a + d.novosUsuarios, 0)
  const usageRate = curDist > 0 ? (curUsed / curDist) * 100 : 0

  const prevDist = prev.reduce((a, d) => a + d.saldoDistribuido, 0)
  const prevUsed = prev.reduce((a, d) => a + d.saldoUtilizado, 0)
  const prevNewUsers = prev.reduce((a, d) => a + d.novosUsuarios, 0)
  const prevUsageRate = prevDist > 0 ? (prevUsed / prevDist) * 100 : 0

  const totalUsersWithBalance = 2_847
  const totalPedidosCB = revCurrent.reduce((a, d) => a + d.pedidosCashback, 0)
  const totalPedidos = revCurrent.reduce((a, d) => a + d.pedidos, 0)
  const cbOrderShare = totalPedidos > 0 ? (totalPedidosCB / totalPedidos) * 100 : 0
  const prevTotalPedidosCB = revPrev.reduce((a, d) => a + d.pedidosCashback, 0)
  const prevTotalPedidos = revPrev.reduce((a, d) => a + d.pedidos, 0)
  const prevCbOrderShare = prevTotalPedidos > 0 ? (prevTotalPedidosCB / prevTotalPedidos) * 100 : 0

  return [
    { label: 'Usuários c/ Saldo', value: totalUsersWithBalance, previousValue: 2_540, format: 'number', color: 'violet', icon: 'users' },
    { label: 'Cashback Distribuído', value: Math.round(curDist), previousValue: Math.round(prevDist), format: 'currency', color: 'emerald', icon: 'gift' },
    { label: 'Cashback Utilizado', value: Math.round(curUsed), previousValue: Math.round(prevUsed), format: 'currency', color: 'green', icon: 'wallet' },
    { label: 'Taxa de Uso', value: Math.round(usageRate * 10) / 10, previousValue: Math.round(prevUsageRate * 10) / 10, format: 'percent', color: 'blue', icon: 'percent' },
    { label: 'Novos Usuários CB', value: curNewUsers, previousValue: prevNewUsers, format: 'number', color: 'amber', icon: 'userplus' },
    { label: '% Pedidos c/ CB', value: Math.round(cbOrderShare * 10) / 10, previousValue: Math.round(prevCbOrderShare * 10) / 10, format: 'percent', color: 'orange', icon: 'pie' },
  ]
}

// ─── Volume data filtered by period ─────────────────────────────────────────

export function getVolumeData(period: Period): DailyVolume[] {
  return filterByPeriod(dailyVolume, period)
}

export function getRevenueData(period: Period): DailyRevenue[] {
  return filterByPeriod(dailyRevenue, period)
}

export function getCashbackTrendData(period: Period): CashbackUsageTrend[] {
  return filterByPeriod(cashbackUsageTrend, period)
}

// ─── Delivery breakdown (donut) ─────────────────────────────────────────────

export const deliveryBreakdown: DeliverySlice[] = [
  { name: 'Entregues – Inbox', value: 42_397, color: '#16a34a' },
  { name: 'Entregues – Spam', value: 4_711, color: '#f59e0b' },
  { name: 'Soft Bounce', value: 987, color: '#f97316' },
  { name: 'Hard Bounce', value: 467, color: '#dc2626' },
]

// ─── Campaign performance ───────────────────────────────────────────────────

export const campaignPerformance: CampaignPerformance[] = [
  { name: 'Black Friday', enviados: 12_450, aberturas: 5_230, cliques: 1_870, conversoes: 412 },
  { name: 'Natal 2024', enviados: 9_800, aberturas: 4_120, cliques: 1_240, conversoes: 298 },
  { name: 'Dia das Mães', enviados: 8_670, aberturas: 3_580, cliques: 1_010, conversoes: 223 },
  { name: 'Cashback 10%', enviados: 7_232, aberturas: 4_890, cliques: 2_360, conversoes: 567 },
  { name: 'Reengajamento', enviados: 5_410, aberturas: 1_840, cliques: 430, conversoes: 89 },
  { name: 'Newsletter Jun', enviados: 5_000, aberturas: 2_100, cliques: 580, conversoes: 134 },
]

// ─── Engagement funnel ──────────────────────────────────────────────────────

export const engagementFunnel: FunnelStep[] = [
  { name: 'Enviados', value: 48_562, fill: '#3b82f6' },
  { name: 'Entregues', value: 47_108, fill: '#22c55e' },
  { name: 'Aberturas', value: 16_345, fill: '#8b5cf6' },
  { name: 'Cliques', value: 4_030, fill: '#f59e0b' },
  { name: 'Pedidos', value: 1_723, fill: '#ef4444' },
]

// ─── Client / Device breakdown ──────────────────────────────────────────────

export const emailClients: ClientShare[] = [
  { name: 'Gmail', value: 38, color: '#ea4335' },
  { name: 'Outlook', value: 24, color: '#0078d4' },
  { name: 'Apple Mail', value: 18, color: '#555555' },
  { name: 'Yahoo', value: 9, color: '#6001d2' },
  { name: 'Outros', value: 11, color: '#94a3b8' },
]

export const deviceBreakdown: ClientShare[] = [
  { name: 'Mobile', value: 58, color: '#3b82f6' },
  { name: 'Desktop', value: 34, color: '#8b5cf6' },
  { name: 'Tablet', value: 8, color: '#f59e0b' },
]

// ─── Hourly heatmap ─────────────────────────────────────────────────────────

const heatmapDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function generateHeatmap(): HeatmapCell[] {
  const cells: HeatmapCell[] = []
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      let base = 0
      if (h >= 8 && h <= 20 && d >= 1 && d <= 5) {
        base = 40 + Math.round(Math.random() * 60)
        if ((h >= 10 && h <= 11) || (h >= 14 && h <= 15)) base += 30
      } else if (h >= 8 && h <= 18 && (d === 0 || d === 6)) {
        base = 10 + Math.round(Math.random() * 25)
      } else {
        base = Math.round(Math.random() * 10)
      }
      cells.push({ hour: h, day: heatmapDays[d], value: base })
    }
  }
  return cells
}

export const heatmapData = generateHeatmap()

// ─── Cashback revenue correlation (monthly) ─────────────────────────────────

export const cashbackRevenueCorrelation: CashbackRevenueCorrelation[] = [
  { month: 'Jan', receitaSemCashback: 145_000, receitaComCashback: 23_000, percentualCrescimento: 15.9 },
  { month: 'Fev', receitaSemCashback: 138_000, receitaComCashback: 31_500, percentualCrescimento: 22.8 },
  { month: 'Mar', receitaSemCashback: 152_000, receitaComCashback: 42_800, percentualCrescimento: 28.2 },
  { month: 'Abr', receitaSemCashback: 148_000, receitaComCashback: 55_200, percentualCrescimento: 37.3 },
  { month: 'Mai', receitaSemCashback: 161_000, receitaComCashback: 72_400, percentualCrescimento: 44.9 },
  { month: 'Jun', receitaSemCashback: 159_000, receitaComCashback: 89_600, percentualCrescimento: 56.4 },
]

// ─── Cashback segments ──────────────────────────────────────────────────────

export const cashbackSegments: CashbackSegment[] = [
  { name: 'Sem cashback', usuarios: 4_120, pedidos: 6_890, ticketMedio: 98.50, receitaTotal: 678_765, color: '#94a3b8' },
  { name: 'Saldo ativo (não usou)', usuarios: 1_234, pedidos: 2_810, ticketMedio: 112.30, receitaTotal: 315_543, color: '#f59e0b' },
  { name: 'Usou cashback 1x', usuarios: 872, pedidos: 2_450, ticketMedio: 134.80, receitaTotal: 330_260, color: '#22c55e' },
  { name: 'Usou cashback 2+ vezes', usuarios: 741, pedidos: 3_120, ticketMedio: 158.40, receitaTotal: 494_208, color: '#16a34a' },
]

// ─── Top campaigns table ────────────────────────────────────────────────────

export const recentCampaigns: CampaignRow[] = [
  {
    id: '1',
    name: 'Black Friday 2024 – Oferta Relâmpago',
    sentAt: '2024-11-29T10:00:00Z',
    status: 'completed',
    recipients: 12_450,
    delivered: 12_180,
    openRate: 42.0,
    clickRate: 15.0,
    bounceRate: 2.2,
    unsubscribeRate: 0.3,
  },
  {
    id: '2',
    name: 'Natal – Promoção Especial',
    sentAt: '2024-12-20T09:00:00Z',
    status: 'completed',
    recipients: 9_800,
    delivered: 9_620,
    openRate: 42.0,
    clickRate: 12.7,
    bounceRate: 1.8,
    unsubscribeRate: 0.2,
  },
  {
    id: '3',
    name: 'Dia das Mães – Kit Presente',
    sentAt: '2025-05-08T08:00:00Z',
    status: 'completed',
    recipients: 8_670,
    delivered: 8_510,
    openRate: 41.3,
    clickRate: 11.7,
    bounceRate: 1.8,
    unsubscribeRate: 0.4,
  },
  {
    id: '4',
    name: 'Cashback 10% – Fluxo Automático',
    sentAt: '2025-06-01T07:00:00Z',
    status: 'sending',
    recipients: 7_232,
    delivered: 7_100,
    openRate: 67.6,
    clickRate: 32.6,
    bounceRate: 1.8,
    unsubscribeRate: 0.1,
  },
  {
    id: '5',
    name: 'Reengajamento – Clientes Inativos',
    sentAt: '2025-06-15T11:00:00Z',
    status: 'completed',
    recipients: 5_410,
    delivered: 5_150,
    openRate: 34.0,
    clickRate: 7.9,
    bounceRate: 4.8,
    unsubscribeRate: 1.2,
  },
  {
    id: '6',
    name: 'Cashback Duplo – Julho',
    sentAt: '2025-07-01T08:30:00Z',
    status: 'scheduled',
    recipients: 5_000,
    delivered: 0,
    openRate: 0,
    clickRate: 0,
    bounceRate: 0,
    unsubscribeRate: 0,
  },
  {
    id: '7',
    name: 'Campanha Inverno – Desconto Progressivo',
    sentAt: '',
    status: 'draft',
    recipients: 0,
    delivered: 0,
    openRate: 0,
    clickRate: 0,
    bounceRate: 0,
    unsubscribeRate: 0,
  },
]

// ─── Email → Pedido pipeline (for linking email to orders) ──────────────────

export interface EmailOrderPipeline {
  campaign: string
  enviados: number
  aberturas: number
  cliques: number
  pedidos: number
  receita: number
  ticketMedio: number
  roi: number
}

export const emailOrderPipeline: EmailOrderPipeline[] = [
  { campaign: 'Black Friday', enviados: 12_450, aberturas: 5_230, cliques: 1_870, pedidos: 412, receita: 58_704, ticketMedio: 142.48, roi: 2_935 },
  { campaign: 'Natal 2024', enviados: 9_800, aberturas: 4_120, cliques: 1_240, pedidos: 298, receita: 39_834, ticketMedio: 133.67, roi: 1_992 },
  { campaign: 'Dia das Mães', enviados: 8_670, aberturas: 3_580, cliques: 1_010, pedidos: 223, receita: 30_116, ticketMedio: 135.05, roi: 1_506 },
  { campaign: 'Cashback 10%', enviados: 7_232, aberturas: 4_890, cliques: 2_360, pedidos: 567, receita: 89_586, ticketMedio: 158.00, roi: 4_479 },
  { campaign: 'Reengajamento', enviados: 5_410, aberturas: 1_840, cliques: 430, pedidos: 89, receita: 9_074, ticketMedio: 101.95, roi: 454 },
]
