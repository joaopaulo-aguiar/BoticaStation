/**
 * Dummy data for the dashboard.
 * Modeled after real AWS SES / Pinpoint analytics shape so the
 * transition to live data is seamless.
 */

// ─── KPI summary ────────────────────────────────────────────────────────────

export interface KpiCard {
  label: string
  value: number
  previousValue: number
  format: 'number' | 'percent' | 'currency'
  color: string
}

export const kpiCards: KpiCard[] = [
  {
    label: 'E-mails Enviados',
    value: 48_562,
    previousValue: 41_230,
    format: 'number',
    color: 'blue',
  },
  {
    label: 'Entregues',
    value: 47_108,
    previousValue: 39_960,
    format: 'number',
    color: 'green',
  },
  {
    label: 'Taxa de Abertura',
    value: 34.7,
    previousValue: 31.2,
    format: 'percent',
    color: 'violet',
  },
  {
    label: 'Taxa de Clique',
    value: 8.3,
    previousValue: 7.1,
    format: 'percent',
    color: 'amber',
  },
  {
    label: 'Bounces',
    value: 1_454,
    previousValue: 1_270,
    format: 'number',
    color: 'orange',
  },
  {
    label: 'Reclamações',
    value: 23,
    previousValue: 31,
    format: 'number',
    color: 'red',
  },
]

// ─── Daily volume (30 days) ─────────────────────────────────────────────────

export interface DailyVolume {
  date: string
  enviados: number
  entregues: number
  aberturas: number
  cliques: number
  bounces: number
}

function generateDailyVolume(): DailyVolume[] {
  const data: DailyVolume[] = []
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const base = 1200 + Math.round(Math.random() * 800)
    const dayOfWeek = d.getDay()
    const weekendMultiplier = dayOfWeek === 0 || dayOfWeek === 6 ? 0.4 : 1
    const enviados = Math.round(base * weekendMultiplier)
    const entregues = Math.round(enviados * (0.95 + Math.random() * 0.04))
    const aberturas = Math.round(entregues * (0.28 + Math.random() * 0.14))
    const cliques = Math.round(aberturas * (0.18 + Math.random() * 0.12))
    const bounces = enviados - entregues

    data.push({
      date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
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

// ─── Delivery breakdown (donut) ─────────────────────────────────────────────

export interface DeliverySlice {
  name: string
  value: number
  color: string
}

export const deliveryBreakdown: DeliverySlice[] = [
  { name: 'Entregues – Inbox', value: 42_397, color: '#16a34a' },
  { name: 'Entregues – Spam', value: 4_711, color: '#f59e0b' },
  { name: 'Soft Bounce', value: 987, color: '#f97316' },
  { name: 'Hard Bounce', value: 467, color: '#dc2626' },
]

// ─── Campaign performance ───────────────────────────────────────────────────

export interface CampaignPerformance {
  name: string
  enviados: number
  aberturas: number
  cliques: number
  conversoes: number
}

export const campaignPerformance: CampaignPerformance[] = [
  { name: 'Black Friday', enviados: 12_450, aberturas: 5_230, cliques: 1_870, conversoes: 412 },
  { name: 'Natal 2024', enviados: 9_800, aberturas: 4_120, cliques: 1_240, conversoes: 298 },
  { name: 'Dia das Mães', enviados: 8_670, aberturas: 3_580, cliques: 1_010, conversoes: 223 },
  { name: 'Boas Vindas', enviados: 7_232, aberturas: 4_890, cliques: 2_360, conversoes: 567 },
  { name: 'Reengajamento', enviados: 5_410, aberturas: 1_840, cliques: 430, conversoes: 89 },
  { name: 'Newsletter Jun', enviados: 5_000, aberturas: 2_100, cliques: 580, conversoes: 134 },
]

// ─── Engagement funnel ──────────────────────────────────────────────────────

export interface FunnelStep {
  name: string
  value: number
  fill: string
}

export const engagementFunnel: FunnelStep[] = [
  { name: 'Enviados', value: 48_562, fill: '#3b82f6' },
  { name: 'Entregues', value: 47_108, fill: '#22c55e' },
  { name: 'Aberturas', value: 16_345, fill: '#8b5cf6' },
  { name: 'Cliques', value: 4_030, fill: '#f59e0b' },
  { name: 'Conversões', value: 1_723, fill: '#ef4444' },
]

// ─── Client / Device breakdown ──────────────────────────────────────────────

export interface ClientShare {
  name: string
  value: number
  color: string
}

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

// ─── Hourly heatmap (sends by hour × day of week) ──────────────────────────

export interface HeatmapCell {
  hour: number
  day: string
  value: number
}

const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function generateHeatmap(): HeatmapCell[] {
  const cells: HeatmapCell[] = []
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      let base = 0
      // Business hours have higher opens
      if (h >= 8 && h <= 20 && d >= 1 && d <= 5) {
        base = 40 + Math.round(Math.random() * 60)
        // Peak at 10-11am and 2-3pm
        if ((h >= 10 && h <= 11) || (h >= 14 && h <= 15)) {
          base += 30
        }
      } else if (h >= 8 && h <= 18 && (d === 0 || d === 6)) {
        base = 10 + Math.round(Math.random() * 25)
      } else {
        base = Math.round(Math.random() * 10)
      }
      cells.push({ hour: h, day: days[d], value: base })
    }
  }
  return cells
}

export const heatmapData = generateHeatmap()

// ─── Top campaigns table ────────────────────────────────────────────────────

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
    name: 'Boas Vindas – Fluxo Automático',
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
    name: 'Newsletter Junho – Novidades',
    sentAt: '2025-06-25T08:30:00Z',
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
