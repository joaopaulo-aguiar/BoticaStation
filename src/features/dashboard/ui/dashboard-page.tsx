/**
 * Dashboard page – presentation-ready analytics dashboard.
 *
 * Three main sections:
 *   1. Revenue & Orders (from email communications)
 *   2. Email Performance (campaigns & engagement)
 *   3. Cashback Analytics (usage, correlation, revenue impact)
 *
 * Period filters: Hoje, 7 dias, Este mês, 30 dias
 */
import { useState, useMemo } from 'react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line,
} from 'recharts'
import {
  Mail,
  CheckCircle2,
  Eye,
  MousePointerClick,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Calendar,
  BarChart3,
  Activity,
  Monitor,
  Smartphone,
  Tablet,
  Clock,
  Filter,
  Package,
  DollarSign,
  Receipt,
  Target,
  Coins,
  Wallet,
  Users,
  Gift,
  Percent,
  UserPlus,
  PieChart as PieIcon,
  ShoppingCart,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui'

import type {
  Period,
  KpiCard,
  CampaignRow,
  HeatmapCell,
  CashbackRevenueCorrelation,
} from '../data/dummy-data'

import {
  periodLabels,
  getEmailKpis,
  getRevenueKpis,
  getCashbackKpis,
  getVolumeData,
  getRevenueData,
  getCashbackTrendData,
  deliveryBreakdown,
  campaignPerformance,
  engagementFunnel,
  emailClients,
  deviceBreakdown,
  heatmapData,
  recentCampaigns,
  cashbackRevenueCorrelation,
  cashbackSegments,
  emailOrderPipeline,
} from '../data/dummy-data'

// ─── Format helpers ─────────────────────────────────────────────────────────

function fmt(value: number, format: 'number' | 'percent' | 'currency'): string {
  if (format === 'currency') {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }
  if (format === 'percent') return `${value.toFixed(1)}%`
  return value.toLocaleString('pt-BR')
}

function delta(current: number, previous: number): { value: string; positive: boolean } | null {
  if (previous === 0) return null
  const diff = ((current - previous) / previous) * 100
  return { value: `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`, positive: diff >= 0 }
}

// ─── Icon map ───────────────────────────────────────────────────────────────

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  mail: Mail,
  check: CheckCircle2,
  eye: Eye,
  click: MousePointerClick,
  alert: AlertTriangle,
  package: Package,
  dollar: DollarSign,
  receipt: Receipt,
  target: Target,
  coins: Coins,
  trending: TrendingUp,
  users: Users,
  gift: Gift,
  wallet: Wallet,
  percent: Percent,
  userplus: UserPlus,
  pie: PieIcon,
}

// ─── Color map ──────────────────────────────────────────────────────────────

const colorMap: Record<string, { bg: string; text: string; icon: string }> = {
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    icon: 'text-blue-500' },
  green:   { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'text-emerald-500' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'text-emerald-500' },
  violet:  { bg: 'bg-violet-50',  text: 'text-violet-700',  icon: 'text-violet-500' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   icon: 'text-amber-500' },
  orange:  { bg: 'bg-orange-50',  text: 'text-orange-700',  icon: 'text-orange-500' },
  red:     { bg: 'bg-red-50',     text: 'text-red-700',     icon: 'text-red-500' },
}

// ─── Reusable components ────────────────────────────────────────────────────

function KpiCardComponent({ card }: { card: KpiCard }) {
  const d = delta(card.value, card.previousValue)
  const colors = colorMap[card.color] ?? colorMap.blue
  const Icon = iconMap[card.icon] ?? Mail

  return (
    <div className="rounded-xl bg-white border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className={cn('rounded-lg p-2', colors.bg)}>
          <Icon className={cn('h-4 w-4', colors.icon)} />
        </div>
        {d && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-xs font-semibold rounded-full px-2 py-0.5',
              d.positive
                ? 'text-emerald-700 bg-emerald-50'
                : 'text-red-700 bg-red-50',
            )}
          >
            {d.positive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {d.value}
          </span>
        )}
      </div>
      <p className={cn('text-2xl font-bold tracking-tight', colors.text)}>
        {fmt(card.value, card.format)}
      </p>
      <p className="text-xs text-slate-500 mt-1">{card.label}</p>
    </div>
  )
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  subtitle: string
}) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="rounded-lg bg-slate-100 p-2">
        <Icon className="h-4 w-4 text-slate-600" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>
    </div>
  )
}

function ChartCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl bg-white border border-slate-100 p-5 shadow-sm',
        className,
      )}
    >
      {children}
    </div>
  )
}

function SectionDivider({ title, icon: Icon }: { title: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center gap-3 mt-2">
      <div className="rounded-lg bg-gradient-to-br from-botica-500 to-botica-700 p-2.5 shadow-sm">
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      </div>
      <div className="flex-1 h-px bg-slate-200 ml-2" />
    </div>
  )
}

// ─── Custom tooltips ────────────────────────────────────────────────────────

function VolumeTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg bg-white border border-slate-200 shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 py-0.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-500 flex-1">{entry.name}</span>
          <span className="font-semibold text-slate-800">
            {entry.value.toLocaleString('pt-BR')}
          </span>
        </div>
      ))}
    </div>
  )
}

function CurrencyTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg bg-white border border-slate-200 shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 py-0.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-500 flex-1">{entry.name}</span>
          <span className="font-semibold text-slate-800">
            {entry.name.includes('Ticket') || entry.name.includes('Receita') || entry.name.includes('receita') || entry.name.includes('Cashback')
              ? entry.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
              : entry.value.toLocaleString('pt-BR')}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Status badge ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: CampaignRow['status'] }) {
  const map: Record<CampaignRow['status'], { label: string; variant: 'active' | 'warning' | 'default' | 'inactive' }> = {
    completed: { label: 'Concluída', variant: 'active' },
    sending: { label: 'Enviando', variant: 'warning' },
    scheduled: { label: 'Agendada', variant: 'default' },
    draft: { label: 'Rascunho', variant: 'inactive' },
  }
  const m = map[status]
  return <Badge variant={m.variant}>{m.label}</Badge>
}

// ─── Heatmap component ──────────────────────────────────────────────────────

const heatDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const hours = Array.from({ length: 24 }, (_, i) => i)

function Heatmap() {
  const maxVal = useMemo(() => Math.max(...heatmapData.map((c: HeatmapCell) => c.value)), [])

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-[640px]">
        <div className="flex ml-10">
          {hours.map((h) => (
            <div key={h} className="flex-1 text-center text-[10px] text-slate-400 font-medium">
              {h.toString().padStart(2, '0')}
            </div>
          ))}
        </div>
        {heatDays.map((day) => (
          <div key={day} className="flex items-center gap-1 mb-0.5">
            <span className="w-9 text-right text-[11px] text-slate-500 font-medium shrink-0">{day}</span>
            <div className="flex flex-1 gap-[2px]">
              {hours.map((h) => {
                const cell = heatmapData.find((c: HeatmapCell) => c.day === day && c.hour === h)
                const intensity = cell ? cell.value / maxVal : 0
                return (
                  <div
                    key={h}
                    title={`${day} ${h.toString().padStart(2, '0')}h — ${cell?.value ?? 0} aberturas`}
                    className="flex-1 aspect-square rounded-[3px] transition-colors"
                    style={{
                      backgroundColor:
                        intensity === 0 ? '#f1f5f9' : `rgba(22, 163, 74, ${0.15 + intensity * 0.85})`,
                    }}
                  />
                )
              })}
            </div>
          </div>
        ))}
        <div className="flex items-center justify-end gap-1.5 mt-2 mr-1">
          <span className="text-[10px] text-slate-400">Menos</span>
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <div
              key={v}
              className="h-3 w-3 rounded-[2px]"
              style={{ backgroundColor: v === 0 ? '#f1f5f9' : `rgba(22, 163, 74, ${0.15 + v * 0.85})` }}
            />
          ))}
          <span className="text-[10px] text-slate-400">Mais</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────

export function DashboardPage() {
  const [period, setPeriod] = useState<Period>('30d')

  // Compute KPIs
  const emailKpis = useMemo(() => getEmailKpis(period), [period])
  const revenueKpis = useMemo(() => getRevenueKpis(period), [period])
  const cashbackKpis = useMemo(() => getCashbackKpis(period), [period])

  // Chart data
  const volumeData = useMemo(() => getVolumeData(period), [period])
  const revenueData = useMemo(() => getRevenueData(period), [period])
  const cashbackTrend = useMemo(() => getCashbackTrendData(period), [period])

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      {/* ═══ Header ═══ */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Visão geral de vendas, campanhas e cashback
            <span className="ml-2 inline-flex items-center gap-1 text-amber-600">
              <Sparkles className="h-3 w-3" />
              Dados de demonstração
            </span>
          </p>
        </div>

        {/* Period filter */}
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          <Filter className="h-4 w-4 text-slate-400 ml-2" />
          {(Object.keys(periodLabels) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
                period === p
                  ? 'bg-botica-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50',
              )}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 1: Revenue & Orders from Email Communications                  */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <SectionDivider title="Pedidos & Receita das Comunicações" icon={ShoppingCart} />

      {/* Revenue KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {revenueKpis.map((card) => (
          <KpiCardComponent key={card.label} card={card} />
        ))}
      </div>

      {/* Revenue trend + Order/Revenue chart */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue & Orders area chart – 2/3 */}
        <ChartCard className="lg:col-span-2">
          <SectionHeader
            icon={DollarSign}
            title="Receita & Pedidos Diários"
            subtitle="Evolução de vendas originadas por e-mail"
          />
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={revenueData}>
              <defs>
                <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradRecCB" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={60}
                tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<CurrencyTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Area yAxisId="left" type="monotone" dataKey="receita" name="Receita" stroke="#16a34a" strokeWidth={2} fill="url(#gradReceita)" />
              <Area yAxisId="left" type="monotone" dataKey="receitaCashback" name="Receita Cashback" stroke="#f59e0b" strokeWidth={2} fill="url(#gradRecCB)" />
              <Line yAxisId="right" type="monotone" dataKey="pedidos" name="Pedidos" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Email → Order Pipeline – 1/3 */}
        <ChartCard>
          <SectionHeader
            icon={Target}
            title="Pipeline E-mail → Pedido"
            subtitle="Conversão por campanha"
          />
          <div className="space-y-3">
            {emailOrderPipeline.map((row) => {
              const convRate = row.cliques > 0 ? ((row.pedidos / row.cliques) * 100).toFixed(1) : '0'
              return (
                <div key={row.campaign} className="border border-slate-100 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-slate-800">{row.campaign}</span>
                    <span className="text-xs font-bold text-emerald-600">
                      {row.receita.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <span>{row.enviados.toLocaleString('pt-BR')} env</span>
                    <ArrowUpRight className="h-2.5 w-2.5" />
                    <span>{row.aberturas.toLocaleString('pt-BR')} ab</span>
                    <ArrowUpRight className="h-2.5 w-2.5" />
                    <span>{row.cliques.toLocaleString('pt-BR')} cl</span>
                    <ArrowUpRight className="h-2.5 w-2.5" />
                    <span className="font-semibold text-emerald-600">{row.pedidos} ped</span>
                  </div>
                  <div className="flex items-center justify-between mt-1.5 text-[10px]">
                    <span className="text-slate-400">Conv: <span className="font-semibold text-violet-600">{convRate}%</span></span>
                    <span className="text-slate-400">Ticket: <span className="font-semibold text-blue-600">
                      {row.ticketMedio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span></span>
                    <span className="text-slate-400">ROI: <span className="font-semibold text-amber-600">{row.roi}%</span></span>
                  </div>
                </div>
              )
            })}
          </div>
        </ChartCard>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 2: Email Performance                                           */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <SectionDivider title="Performance de E-mail" icon={Mail} />

      {/* Email KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {emailKpis.map((card) => (
          <KpiCardComponent key={card.label} card={card} />
        ))}
      </div>

      {/* Volume trend + Delivery breakdown */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard className="lg:col-span-2">
          <SectionHeader icon={Activity} title="Volume Diário" subtitle="Envios, entregas e engajamento" />
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={volumeData}>
              <defs>
                <linearGradient id="gradEnviados" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradEntregues" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradAberturas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={45} />
              <Tooltip content={<VolumeTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Area type="monotone" dataKey="enviados" name="Enviados" stroke="#3b82f6" strokeWidth={2} fill="url(#gradEnviados)" />
              <Area type="monotone" dataKey="entregues" name="Entregues" stroke="#22c55e" strokeWidth={2} fill="url(#gradEntregues)" />
              <Area type="monotone" dataKey="aberturas" name="Aberturas" stroke="#8b5cf6" strokeWidth={2} fill="url(#gradAberturas)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard>
          <SectionHeader icon={CheckCircle2} title="Breakdown de Entrega" subtitle="Distribuição de resultados" />
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={deliveryBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={3} dataKey="value" strokeWidth={0}>
                {deliveryBreakdown.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR')} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-1">
            {deliveryBreakdown.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                <span className="text-slate-600 flex-1">{entry.name}</span>
                <span className="font-semibold text-slate-800">{entry.value.toLocaleString('pt-BR')}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Campaign performance + Engagement funnel */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard>
          <SectionHeader icon={BarChart3} title="Performance por Campanha" subtitle="Comparação de envios e engajamento" />
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={campaignPerformance} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={100} />
              <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR')} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="enviados" name="Enviados" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12} />
              <Bar dataKey="aberturas" name="Aberturas" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={12} />
              <Bar dataKey="cliques" name="Cliques" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard>
          <SectionHeader icon={ArrowUpRight} title="Funil de Engajamento" subtitle="E-mail → Abertura → Clique → Pedido" />
          <div className="space-y-3 mt-2">
            {engagementFunnel.map((step, i) => {
              const maxVal = engagementFunnel[0].value
              const widthPercent = (step.value / maxVal) * 100
              const prevStep = i > 0 ? engagementFunnel[i - 1] : null
              const convRate = prevStep ? ((step.value / prevStep.value) * 100).toFixed(1) : null
              return (
                <div key={step.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700">{step.name}</span>
                    <div className="flex items-center gap-2">
                      {convRate && (
                        <span className="text-slate-400">{convRate}%</span>
                      )}
                      <span className="font-bold text-slate-900">{step.value.toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                  <div className="h-8 rounded-lg bg-slate-50 overflow-hidden">
                    <div
                      className="h-full rounded-lg transition-all duration-700 flex items-center justify-end pr-2"
                      style={{ width: `${widthPercent}%`, backgroundColor: step.fill }}
                    >
                      {widthPercent > 15 && (
                        <span className="text-[10px] font-semibold text-white">{step.value.toLocaleString('pt-BR')}</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </ChartCard>
      </div>

      {/* Heatmap + Devices */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard className="lg:col-span-2">
          <SectionHeader icon={Clock} title="Mapa de Calor de Aberturas" subtitle="Melhor horário para envio (hora × dia da semana)" />
          <Heatmap />
        </ChartCard>

        <ChartCard>
          <SectionHeader icon={Monitor} title="Dispositivos & Clientes" subtitle="Onde os e-mails são abertos" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Dispositivo</p>
          <div className="space-y-2 mb-5">
            {deviceBreakdown.map((d) => {
              const Icon = d.name === 'Mobile' ? Smartphone : d.name === 'Tablet' ? Tablet : Monitor
              return (
                <div key={d.name}>
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="flex items-center gap-1.5 text-slate-600"><Icon className="h-3.5 w-3.5" />{d.name}</span>
                    <span className="font-semibold text-slate-800">{d.value}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${d.value}%`, backgroundColor: d.color }} />
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Cliente de E-mail</p>
          <div className="space-y-2">
            {emailClients.map((c) => (
              <div key={c.name}>
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                    {c.name}
                  </span>
                  <span className="font-semibold text-slate-800">{c.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${c.value}%`, backgroundColor: c.color }} />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 3: Cashback Analytics                                          */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <SectionDivider title="Cashback Analytics" icon={Wallet} />

      {/* Cashback KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {cashbackKpis.map((card) => (
          <KpiCardComponent key={card.label} card={card} />
        ))}
      </div>

      {/* Cashback usage trend + Segment comparison */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Cashback distribution vs usage – 2/3 */}
        <ChartCard className="lg:col-span-2">
          <SectionHeader icon={Coins} title="Cashback: Distribuição vs Uso" subtitle="Evolução diária de saldo distribuído e utilizado" />
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={cashbackTrend}>
              <defs>
                <linearGradient id="gradDist" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradUsed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={50}
                tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={30} />
              <Tooltip content={<CurrencyTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Area yAxisId="left" type="monotone" dataKey="saldoDistribuido" name="Distribuído" stroke="#8b5cf6" strokeWidth={2} fill="url(#gradDist)" />
              <Area yAxisId="left" type="monotone" dataKey="saldoUtilizado" name="Utilizado" stroke="#16a34a" strokeWidth={2} fill="url(#gradUsed)" />
              <Line yAxisId="right" type="monotone" dataKey="novosUsuarios" name="Novos Usuários" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="5 5" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Cashback user segments – 1/3 */}
        <ChartCard>
          <SectionHeader icon={Users} title="Segmentos de Cashback" subtitle="Comportamento por perfil de uso" />
          <div className="space-y-3">
            {cashbackSegments.map((seg) => (
              <div key={seg.name} className="border border-slate-100 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                  <span className="text-sm font-semibold text-slate-800">{seg.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400">Usuários</span>
                    <p className="font-bold text-slate-700">{seg.usuarios.toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Pedidos</span>
                    <p className="font-bold text-slate-700">{seg.pedidos.toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Ticket Médio</span>
                    <p className="font-bold text-blue-600">
                      {seg.ticketMedio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Receita</span>
                    <p className="font-bold text-emerald-600">
                      {seg.receitaTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Cashback impact on revenue (monthly correlation) */}
      <ChartCard>
        <SectionHeader icon={TrendingUp} title="Impacto do Cashback no Faturamento" subtitle="Receita mensal: sem cashback vs com cashback — crescimento progressivo" />
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={cashbackRevenueCorrelation}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={60}
              tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40}
              tickFormatter={(v: number) => `${v}%`} />
            <Tooltip content={<RevenueCorrelationTooltip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Bar yAxisId="left" dataKey="receitaSemCashback" name="Receita Base" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={32} />
            <Bar yAxisId="left" dataKey="receitaComCashback" name="Receita Cashback" fill="#16a34a" radius={[4, 4, 0, 0]} barSize={32} />
            <Line yAxisId="right" type="monotone" dataKey="percentualCrescimento" name="Crescimento %" stroke="#f59e0b" strokeWidth={3} dot={{ fill: '#f59e0b', r: 5 }} />
          </ComposedChart>
        </ResponsiveContainer>
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
          <div className="text-center">
            <p className="text-xs text-slate-400">Receita adicional (6 meses)</p>
            <p className="text-xl font-bold text-emerald-600">
              {(cashbackRevenueCorrelation.reduce((a, d) => a + d.receitaComCashback, 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400">Crescimento médio</p>
            <p className="text-xl font-bold text-amber-600">
              {(cashbackRevenueCorrelation.reduce((a, d) => a + d.percentualCrescimento, 0) / cashbackRevenueCorrelation.length).toFixed(1)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400">Crescimento último mês</p>
            <p className="text-xl font-bold text-violet-600">
              {cashbackRevenueCorrelation[cashbackRevenueCorrelation.length - 1].percentualCrescimento}%
            </p>
          </div>
        </div>
      </ChartCard>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 4: Recent Campaigns Table                                      */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <ChartCard>
        <SectionHeader icon={Calendar} title="Campanhas Recentes" subtitle="Últimas campanhas enviadas e agendadas" />
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Campanha</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-3">Status</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-3">Dest.</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-3">Entregues</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-3">Abertura</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-3">Cliques</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-3">Bounce</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Unsub</th>
              </tr>
            </thead>
            <tbody>
              {recentCampaigns.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-800 truncate max-w-[260px]">{c.name}</p>
                    {c.sentAt && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(c.sentAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-3 py-3 text-right font-medium text-slate-700">{c.recipients.toLocaleString('pt-BR')}</td>
                  <td className="px-3 py-3 text-right font-medium text-slate-700">{c.delivered.toLocaleString('pt-BR')}</td>
                  <td className="px-3 py-3 text-right">
                    <span className={cn('font-semibold', c.openRate >= 40 ? 'text-emerald-600' : c.openRate >= 20 ? 'text-amber-600' : 'text-slate-500')}>
                      {c.openRate > 0 ? `${c.openRate}%` : '—'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className={cn('font-semibold', c.clickRate >= 10 ? 'text-emerald-600' : c.clickRate >= 5 ? 'text-amber-600' : 'text-slate-500')}>
                      {c.clickRate > 0 ? `${c.clickRate}%` : '—'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className={cn('font-semibold', c.bounceRate >= 3 ? 'text-red-600' : c.bounceRate >= 1 ? 'text-amber-600' : 'text-emerald-600')}>
                      {c.bounceRate > 0 ? `${c.bounceRate}%` : '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-slate-500">
                    {c.unsubscribeRate > 0 ? `${c.unsubscribeRate}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* Demo banner */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Dados de demonstração</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Este dashboard exibe dados fictícios para fins de apresentação. Os dados reais serão alimentados
            automaticamente quando o sistema estiver conectado ao DynamoDB com eventos de e-mail e dados de pedidos.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Revenue correlation tooltip ────────────────────────────────────────────

function RevenueCorrelationTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg bg-white border border-slate-200 shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 py-0.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-500 flex-1">{entry.name}</span>
          <span className="font-semibold text-slate-800">
            {entry.name.includes('%')
              ? `${entry.value}%`
              : entry.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>
      ))}
    </div>
  )
}
