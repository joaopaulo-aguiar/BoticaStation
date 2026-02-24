/**
 * Dashboard page – state-of-the-art campaign analytics visualisation.
 *
 * Uses dummy data for now.  When a DynamoDB analytics table is configured
 * in Settings the data layer can be swapped transparently.
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
  FunnelChart,
  Funnel,
  LabelList,
} from 'recharts'
import {
  Mail,
  CheckCircle2,
  Eye,
  MousePointerClick,
  AlertTriangle,
  ShieldAlert,
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
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui'
import {
  kpiCards,
  dailyVolume,
  deliveryBreakdown,
  campaignPerformance,
  engagementFunnel,
  emailClients,
  deviceBreakdown,
  heatmapData,
  recentCampaigns,
  type KpiCard,
  type CampaignRow,
} from '../data/dummy-data'

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(value: number, format: 'number' | 'percent' | 'currency'): string {
  if (format === 'percent') return `${value.toFixed(1)}%`
  if (format === 'currency')
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  return value.toLocaleString('pt-BR')
}

function delta(current: number, previous: number): { pct: number; up: boolean } {
  if (previous === 0) return { pct: 0, up: true }
  const pct = ((current - previous) / previous) * 100
  return { pct: Math.abs(pct), up: pct >= 0 }
}

const kpiIcons: Record<string, React.ElementType> = {
  'E-mails Enviados': Mail,
  Entregues: CheckCircle2,
  'Taxa de Abertura': Eye,
  'Taxa de Clique': MousePointerClick,
  Bounces: AlertTriangle,
  Reclamações: ShieldAlert,
}

const kpiBg: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-emerald-50 text-emerald-600',
  violet: 'bg-violet-50 text-violet-600',
  amber: 'bg-amber-50 text-amber-600',
  orange: 'bg-orange-50 text-orange-600',
  red: 'bg-red-50 text-red-600',
}

// Period filter options
type Period = '7d' | '15d' | '30d'
const periodLabels: Record<Period, string> = {
  '7d': '7 dias',
  '15d': '15 dias',
  '30d': '30 dias',
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function KpiCardComponent({ card }: { card: KpiCard }) {
  const Icon = kpiIcons[card.label] ?? Mail
  const d = delta(card.value, card.previousValue)
  const isNegativeGood = card.label === 'Bounces' || card.label === 'Reclamações'
  const isPositive = isNegativeGood ? !d.up : d.up

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card hover:shadow-card-hover transition-shadow">
      <div className="flex items-start justify-between">
        <div className={cn('rounded-lg p-2.5', kpiBg[card.color])}>
          <Icon className="h-5 w-5" />
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold',
            isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700',
          )}
        >
          {d.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {d.pct.toFixed(1)}%
        </span>
      </div>
      <p className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
        {fmt(card.value, card.format)}
      </p>
      <p className="mt-0.5 text-sm text-slate-500">{card.label}</p>
    </div>
  )
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ElementType
  title: string
  subtitle?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-slate-400" />
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {children}
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
        'rounded-xl border border-slate-200 bg-white p-5 shadow-card',
        className,
      )}
    >
      {children}
    </div>
  )
}

// Custom tooltip for area chart
function VolumeTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-lg">
      <p className="text-xs font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-slate-500">{entry.name}:</span>
          <span className="font-semibold text-slate-800">
            {Number(entry.value).toLocaleString('pt-BR')}
          </span>
        </div>
      ))}
    </div>
  )
}

// Status badge helper
function StatusBadge({ status }: { status: CampaignRow['status'] }) {
  const map: Record<
    CampaignRow['status'],
    { label: string; variant: 'active' | 'warning' | 'default' | 'inactive' }
  > = {
    completed: { label: 'Concluída', variant: 'active' },
    sending: { label: 'Enviando', variant: 'warning' },
    scheduled: { label: 'Agendada', variant: 'default' },
    draft: { label: 'Rascunho', variant: 'inactive' },
  }
  const m = map[status]
  return <Badge variant={m.variant}>{m.label}</Badge>
}

// ─── Heatmap component ──────────────────────────────────────────────────────

const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const hours = Array.from({ length: 24 }, (_, i) => i)

function Heatmap() {
  const maxVal = useMemo(
    () => Math.max(...heatmapData.map((c) => c.value)),
    [],
  )

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-[640px]">
        {/* Hour labels */}
        <div className="flex ml-10">
          {hours.map((h) => (
            <div
              key={h}
              className="flex-1 text-center text-[10px] text-slate-400 font-medium"
            >
              {h.toString().padStart(2, '0')}
            </div>
          ))}
        </div>

        {/* Rows */}
        {days.map((day) => (
          <div key={day} className="flex items-center gap-1 mb-0.5">
            <span className="w-9 text-right text-[11px] text-slate-500 font-medium shrink-0">
              {day}
            </span>
            <div className="flex flex-1 gap-[2px]">
              {hours.map((h) => {
                const cell = heatmapData.find(
                  (c) => c.day === day && c.hour === h,
                )
                const intensity = cell ? cell.value / maxVal : 0
                return (
                  <div
                    key={h}
                    title={`${day} ${h.toString().padStart(2, '0')}h — ${cell?.value ?? 0} aberturas`}
                    className="flex-1 aspect-square rounded-[3px] transition-colors"
                    style={{
                      backgroundColor:
                        intensity === 0
                          ? '#f1f5f9'
                          : `rgba(22, 163, 74, ${0.15 + intensity * 0.85})`,
                    }}
                  />
                )
              })}
            </div>
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center justify-end gap-1.5 mt-2 mr-1">
          <span className="text-[10px] text-slate-400">Menos</span>
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <div
              key={v}
              className="h-3 w-3 rounded-[2px]"
              style={{
                backgroundColor:
                  v === 0 ? '#f1f5f9' : `rgba(22, 163, 74, ${0.15 + v * 0.85})`,
              }}
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

  // Slice daily volume based on period
  const volumeData = useMemo(() => {
    const days = period === '7d' ? 7 : period === '15d' ? 15 : 30
    return dailyVolume.slice(-days)
  }, [period])

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Dashboard
          </h1>
          <p className="text-sm text-slate-500">
            Visão geral das campanhas e engajamento de e-mail
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {kpiCards.map((card) => (
          <KpiCardComponent key={card.label} card={card} />
        ))}
      </div>

      {/* Row 1: Volume trend + Delivery breakdown */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Area chart – 2/3 */}
        <ChartCard className="lg:col-span-2">
          <SectionHeader
            icon={Activity}
            title="Volume Diário"
            subtitle="Envios, entregas e engajamento"
          />
          <ResponsiveContainer width="100%" height={320}>
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
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                width={45}
              />
              <Tooltip content={<VolumeTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
              <Area
                type="monotone"
                dataKey="enviados"
                name="Enviados"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#gradEnviados)"
              />
              <Area
                type="monotone"
                dataKey="entregues"
                name="Entregues"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#gradEntregues)"
              />
              <Area
                type="monotone"
                dataKey="aberturas"
                name="Aberturas"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="url(#gradAberturas)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Donut – 1/3 */}
        <ChartCard>
          <SectionHeader
            icon={CheckCircle2}
            title="Breakdown de Entrega"
            subtitle="Distribuição de resultados"
          />
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={deliveryBreakdown}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={95}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {deliveryBreakdown.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => value.toLocaleString('pt-BR')}
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Custom legend */}
          <div className="space-y-1.5 mt-1">
            {deliveryBreakdown.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2 text-xs">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-slate-600 flex-1">{entry.name}</span>
                <span className="font-semibold text-slate-800">
                  {entry.value.toLocaleString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Row 2: Campaign performance bar chart + Engagement funnel */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Campaign bar chart */}
        <ChartCard>
          <SectionHeader
            icon={BarChart3}
            title="Performance por Campanha"
            subtitle="Comparação de envios e engajamento"
          />
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={campaignPerformance}
              layout="vertical"
              margin={{ left: 10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e2e8f0"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                width={110}
              />
              <Tooltip
                formatter={(value: number) => value.toLocaleString('pt-BR')}
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  fontSize: 12,
                }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
              <Bar
                dataKey="enviados"
                name="Enviados"
                fill="#3b82f6"
                radius={[0, 4, 4, 0]}
                barSize={14}
              />
              <Bar
                dataKey="aberturas"
                name="Aberturas"
                fill="#8b5cf6"
                radius={[0, 4, 4, 0]}
                barSize={14}
              />
              <Bar
                dataKey="cliques"
                name="Cliques"
                fill="#f59e0b"
                radius={[0, 4, 4, 0]}
                barSize={14}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Funnel */}
        <ChartCard>
          <SectionHeader
            icon={ArrowUpRight}
            title="Funil de Engajamento"
            subtitle="Conversão por etapa do funil"
          />
          <ResponsiveContainer width="100%" height={320}>
            <FunnelChart>
              <Tooltip
                formatter={(value: number) => value.toLocaleString('pt-BR')}
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  fontSize: 12,
                }}
              />
              <Funnel dataKey="value" data={engagementFunnel} isAnimationActive>
                <LabelList
                  position="right"
                  fill="#334155"
                  fontSize={12}
                  fontWeight={600}
                  formatter={(value: number) => value.toLocaleString('pt-BR')}
                />
                <LabelList
                  position="center"
                  fill="#ffffff"
                  fontSize={12}
                  fontWeight={500}
                  dataKey="name"
                />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>

          {/* Conversion rates between steps */}
          <div className="flex items-center justify-between mt-2 px-2">
            {engagementFunnel.slice(0, -1).map((step, i) => {
              const next = engagementFunnel[i + 1]
              const rate = ((next.value / step.value) * 100).toFixed(1)
              return (
                <div key={step.name} className="text-center">
                  <p className="text-xs text-slate-400">
                    {step.name.slice(0, 3)} → {next.name.slice(0, 3)}
                  </p>
                  <p className="text-sm font-bold text-slate-700">{rate}%</p>
                </div>
              )
            })}
          </div>
        </ChartCard>
      </div>

      {/* Row 3: Heatmap + Device/Client breakdown */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Heatmap – 2/3 */}
        <ChartCard className="lg:col-span-2">
          <SectionHeader
            icon={Clock}
            title="Mapa de Calor de Aberturas"
            subtitle="Melhor horário para envio (hora × dia da semana)"
          />
          <Heatmap />
        </ChartCard>

        {/* Device + Client – 1/3 */}
        <ChartCard>
          <SectionHeader
            icon={Monitor}
            title="Dispositivos & Clientes"
            subtitle="Onde os e-mails são abertos"
          />

          {/* Device breakdown */}
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Dispositivo
          </p>
          <div className="space-y-2 mb-5">
            {deviceBreakdown.map((d) => {
              const Icon =
                d.name === 'Mobile'
                  ? Smartphone
                  : d.name === 'Tablet'
                    ? Tablet
                    : Monitor
              return (
                <div key={d.name}>
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <Icon className="h-3.5 w-3.5" />
                      {d.name}
                    </span>
                    <span className="font-semibold text-slate-800">{d.value}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${d.value}%`,
                        backgroundColor: d.color,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Client breakdown */}
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Cliente de E-mail
          </p>
          <div className="space-y-2">
            {emailClients.map((c) => (
              <div key={c.name}>
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: c.color }}
                    />
                    {c.name}
                  </span>
                  <span className="font-semibold text-slate-800">{c.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${c.value}%`,
                      backgroundColor: c.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Row 4: Recent campaigns table */}
      <ChartCard>
        <SectionHeader
          icon={Calendar}
          title="Campanhas Recentes"
          subtitle="Últimas campanhas enviadas e agendadas"
        />
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">
                  Campanha
                </th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-3">
                  Status
                </th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-3">
                  Destinatários
                </th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-3">
                  Entregues
                </th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-3">
                  Abertura
                </th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-3">
                  Cliques
                </th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-3">
                  Bounce
                </th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">
                  Unsub
                </th>
              </tr>
            </thead>
            <tbody>
              {recentCampaigns.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
                >
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-800 truncate max-w-[260px]">
                      {c.name}
                    </p>
                    {c.sentAt && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(c.sentAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-3 py-3 text-right font-medium text-slate-700">
                    {c.recipients.toLocaleString('pt-BR')}
                  </td>
                  <td className="px-3 py-3 text-right font-medium text-slate-700">
                    {c.delivered.toLocaleString('pt-BR')}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span
                      className={cn(
                        'font-semibold',
                        c.openRate >= 40
                          ? 'text-emerald-600'
                          : c.openRate >= 20
                            ? 'text-amber-600'
                            : 'text-slate-500',
                      )}
                    >
                      {c.openRate > 0 ? `${c.openRate}%` : '—'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span
                      className={cn(
                        'font-semibold',
                        c.clickRate >= 10
                          ? 'text-emerald-600'
                          : c.clickRate >= 5
                            ? 'text-amber-600'
                            : 'text-slate-500',
                      )}
                    >
                      {c.clickRate > 0 ? `${c.clickRate}%` : '—'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span
                      className={cn(
                        'font-semibold',
                        c.bounceRate >= 3
                          ? 'text-red-600'
                          : c.bounceRate >= 1
                            ? 'text-amber-600'
                            : 'text-emerald-600',
                      )}
                    >
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

      {/* Info banner */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">
            Dados de demonstração
          </p>
          <p className="text-xs text-amber-700 mt-0.5">
            Este dashboard exibe dados fictícios para visualização.
            Configure a tabela DynamoDB em{' '}
            <span className="font-semibold">Configurações</span> para conectar
            dados reais do AWS SES e Pinpoint.
          </p>
        </div>
      </div>
    </div>
  )
}
