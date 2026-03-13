import { useState } from 'react'
import {
  LayoutDashboard, Mail, Send, Eye, MousePointerClick, AlertTriangle,
  TrendingUp, DollarSign, Wallet,
  Users, Megaphone, Workflow, ArrowDown, ArrowUp, Minus,
  RefreshCw, BarChart3, Target, ShoppingBag, XCircle,
  Timer,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { cn } from '@/shared/lib/utils'
import { useContactCounters } from '@/features/contacts/hooks/use-contacts'
import { useDashboardMetrics } from '../hooks/use-dashboard'
import { DASHBOARD_PERIODS } from '../types'
import type { DashboardPeriod, DashboardMetrics } from '../types'

// ── Auto-reload options ──────────────────────────────────────────────────────

const AUTO_RELOAD_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '5 min', value: 5 * 60_000 },
  { label: '10 min', value: 10 * 60_000 },
  { label: '60 min', value: 60 * 60_000 },
] as const

// ── Formatters ───────────────────────────────────────────────────────────────

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtNum = (v: number) => v.toLocaleString('pt-BR')
const fmtPct = (v: number) => `${v.toFixed(1).replace('.', ',')}%`
const fmtDate = (d: string) => {
  const [, m, day] = d.split('-')
  return `${day}/${m}`
}

// ── Mini Spark Indicator ─────────────────────────────────────────────────────

function TrendBadge({ value, invert }: { value: number; invert?: boolean }) {
  const positive = invert ? value < 0 : value > 0
  const zero = value === 0
  const Icon = zero ? Minus : positive ? ArrowUp : ArrowDown
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-[10px] font-bold rounded-full px-1.5 py-0.5',
      zero ? 'text-slate-400 bg-slate-50' :
      positive ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50',
    )}>
      <Icon className="w-2.5 h-2.5" />{Math.abs(value).toFixed(1)}%
    </span>
  )
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: typeof Mail
  label: string
  value: string
  subValue?: string
  trend?: number
  trendInvert?: boolean
  iconColor: string
  iconBg: string
}

function KpiCard({ icon: Icon, label, value, subValue, trend, trendInvert, iconColor, iconBg }: KpiCardProps) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 px-3 py-2.5 shadow-[var(--shadow-card)] hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2.5">
        <div className={cn('w-7 h-7 rounded-md flex items-center justify-center shrink-0', iconBg)}>
          <Icon className={cn('w-3.5 h-3.5', iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-lg font-extrabold text-slate-900 leading-tight">{value}</div>
          <div className="text-[10px] text-slate-500 font-medium truncate">{label}</div>
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          {trend != null && <TrendBadge value={trend} invert={trendInvert} />}
          {subValue && <div className="text-[9px] text-slate-400 whitespace-nowrap">{subValue}</div>}
        </div>
      </div>
    </div>
  )
}

// ── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, color }: { icon: typeof Mail; title: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <div className={cn('w-5 h-5 rounded flex items-center justify-center', color)}>
        <Icon className="w-3 h-3 text-white" />
      </div>
      <h2 className="text-xs font-bold text-slate-800">{title}</h2>
    </div>
  )
}

// ── Email Funnel ─────────────────────────────────────────────────────────────

function EmailFunnel({ data }: { data: DashboardMetrics['email'] }) {
  const deliveryRate = data.sent > 0 ? (data.delivered / data.sent) * 100 : 0
  const openRate = data.delivered > 0 ? (data.opened / data.delivered) * 100 : 0
  const clickRate = data.delivered > 0 ? (data.clicked / data.delivered) * 100 : 0
  const bounceRate = data.sent > 0 ? (data.bounced / data.sent) * 100 : 0

  const steps = [
    { label: 'Enviados', value: data.sent, rate: null, color: 'bg-blue-500', width: 100 },
    { label: 'Entregues', value: data.delivered, rate: deliveryRate, color: 'bg-emerald-500', width: Math.max(deliveryRate, 15) },
    { label: 'Abertos', value: data.opened, rate: openRate, color: 'bg-purple-500', width: Math.max(openRate, 10) },
    { label: 'Clicados', value: data.clicked, rate: clickRate, color: 'bg-indigo-500', width: Math.max(clickRate, 5) },
  ]

  return (
    <div className="space-y-1.5">
      {steps.map((step) => (
        <div key={step.label}>
          <div className="flex items-center justify-between text-[11px] mb-0.5">
            <span className="text-slate-600 font-medium">{step.label}</span>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-800">{fmtNum(step.value)}</span>
              {step.rate != null && (
                <span className={cn('text-[9px] font-semibold', step.rate >= 30 ? 'text-emerald-600' : step.rate >= 15 ? 'text-blue-600' : 'text-amber-600')}>
                  {fmtPct(step.rate)}
                </span>
              )}
            </div>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full transition-all', step.color)} style={{ width: `${step.width}%` }} />
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100 mt-1">
        <div className="flex items-center gap-1 text-[10px] text-red-500">
          <AlertTriangle className="w-2.5 h-2.5" />
          <span>Bounces: {fmtNum(data.bounced)} ({fmtPct(bounceRate)})</span>
        </div>
        <div className="text-[10px] text-amber-500">
          Complaints: {fmtNum(data.complained)}
        </div>
      </div>
    </div>
  )
}

// ── Cashback Donut ───────────────────────────────────────────────────────────

function CashbackDonut({ data }: { data: DashboardMetrics['cashback'] }) {
  const chartData = [
    { name: 'Emitido', value: data.amountIssued, color: '#10b981' },
    { name: 'Resgatado', value: data.amountRedeemed, color: '#f59e0b' },
    { name: 'Expirado', value: data.amountExpired, color: '#ef4444' },
  ]

  return (
    <div className="flex items-center gap-3">
      <div className="w-24 h-24 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} dataKey="value" cx="50%" cy="50%" innerRadius={26} outerRadius={42} strokeWidth={2} stroke="#fff">
              {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 space-y-1.5">
        {chartData.map((item) => (
          <div key={item.name} className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-[11px] text-slate-600">{item.name}</span>
            </div>
            <span className="text-[11px] font-bold text-slate-800">{fmtBRL(item.value)}</span>
          </div>
        ))}
        <div className="pt-1 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[10px] font-medium text-slate-500">Saldo ativo</span>
          <span className="text-xs font-extrabold text-emerald-700">{fmtBRL(data.activeBalance)}</span>
        </div>
      </div>
    </div>
  )
}

// ── Revenue Chart ────────────────────────────────────────────────────────────

function RevenueChart({ series }: { series: DashboardMetrics['dailySeries'] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={series} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
        <defs>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          formatter={(value: number) => [fmtBRL(value), 'Receita']}
          labelFormatter={(label: string) => fmtDate(label)}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
        />
        <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#revGrad)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ── Email Activity Chart ─────────────────────────────────────────────────────

function EmailActivityChart({ series }: { series: DashboardMetrics['dailySeries'] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={series} margin={{ top: 5, right: 5, left: -15, bottom: 0 }} barGap={0}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(value: number, name: string) => [fmtNum(value), name === 'emailsSent' ? 'Enviados' : name === 'emailsOpened' ? 'Abertos' : 'Clicados']}
          labelFormatter={(label: string) => fmtDate(label)}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
        />
        <Bar dataKey="emailsSent" fill="#93c5fd" radius={[2, 2, 0, 0]} barSize={8} name="emailsSent" />
        <Bar dataKey="emailsOpened" fill="#a78bfa" radius={[2, 2, 0, 0]} barSize={8} name="emailsOpened" />
        <Bar dataKey="emailsClicked" fill="#818cf8" radius={[2, 2, 0, 0]} barSize={8} name="emailsClicked" />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Main Dashboard Page ──────────────────────────────────────────────────────

export function DashboardPage() {
  const [period, setPeriod] = useState<DashboardPeriod>('THIS_MONTH')
  const [autoReload, setAutoReload] = useState(0)
  const { data: metrics, isLoading, refetch, isRefetching } = useDashboardMetrics(period, autoReload || undefined)
  const { data: contactCounters } = useContactCounters()

  const m = metrics

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-botica-100 text-botica-700">
            <LayoutDashboard className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">Dashboard</h1>
            <p className="text-[10px] text-slate-500">Visão geral de resultados</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex bg-white border border-slate-200 rounded-lg p-0.5">
            {DASHBOARD_PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  'px-2.5 py-1 text-[11px] font-medium rounded-md transition-all cursor-pointer',
                  period === p.value
                    ? 'bg-botica-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          {/* Auto-reload selector */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
            <Timer className="w-3 h-3 text-slate-400" />
            <select
              value={autoReload}
              onChange={(e) => setAutoReload(Number(e.target.value))}
              className="text-[11px] text-slate-600 bg-transparent border-none outline-none cursor-pointer pr-1"
            >
              {AUTO_RELOAD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          {/* Refresh */}
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isRefetching && 'animate-spin')} />
          </button>
        </div>
      </div>

      {isLoading || !m ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 text-botica-400 animate-spin" />
        </div>
      ) : (
        <>
          {/* KPI Row — 5 columns */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
            <KpiCard
              icon={DollarSign} label="Receita Ecommerce" value={fmtBRL(m.ecommerce.revenue)}
              subValue={`${fmtNum(m.ecommerce.orders)} pedidos`}
              trend={8.2} iconColor="text-emerald-700" iconBg="bg-emerald-100"
            />
            <KpiCard
              icon={Megaphone} label="Receita de Campanhas" value={fmtBRL(m.campaigns.revenue)}
              subValue={`${m.campaigns.totalSent} enviadas`}
              trend={12.5} iconColor="text-blue-700" iconBg="bg-blue-100"
            />
            <KpiCard
              icon={Wallet} label="Cashback Ativo" value={fmtBRL(m.cashback.activeBalance)}
              subValue={`${fmtNum(m.cashback.totalIssued)} emissões`}
              trend={5.3} iconColor="text-amber-700" iconBg="bg-amber-100"
            />
            <KpiCard
              icon={Users} label="Total de Contatos" value={fmtNum(contactCounters?.total ?? 0)}
              subValue={`${fmtNum(contactCounters?.byLifecycle?.lead ?? 0)}L · ${fmtNum(contactCounters?.byLifecycle?.customer ?? 0)}C`}
              trend={3.1} iconColor="text-violet-700" iconBg="bg-violet-100"
            />
            <KpiCard
              icon={ShoppingBag} label="Ticket Médio" value={fmtBRL(m.ecommerce.avgTicket)}
              subValue={`${fmtPct(m.ecommerce.conversionRate)} conv.`}
              trend={-1.2} iconColor="text-teal-700" iconBg="bg-teal-100"
            />
          </div>

          {/* Metrics Row — 6 compact KPIs */}
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
            <KpiCard icon={Send} label="E-mails Enviados" value={fmtNum(m.email.sent)} trend={6.4} iconColor="text-blue-600" iconBg="bg-blue-50" />
            <KpiCard
              icon={Eye} label="Taxa Abertura" value={fmtPct(m.email.delivered > 0 ? (m.email.opened / m.email.delivered) * 100 : 0)}
              iconColor="text-purple-600" iconBg="bg-purple-50" trend={2.1}
            />
            <KpiCard
              icon={MousePointerClick} label="Taxa Cliques" value={fmtPct(m.email.delivered > 0 ? (m.email.clicked / m.email.delivered) * 100 : 0)}
              iconColor="text-indigo-600" iconBg="bg-indigo-50" trend={1.8}
            />
            <KpiCard icon={Workflow} label="Automações Ativas" value={fmtNum(m.automations.totalActive)} subValue={`${fmtNum(m.automations.totalExecutions)} exec.`} iconColor="text-violet-600" iconBg="bg-violet-50" />
            <KpiCard icon={Target} label="Conversões" value={fmtNum(m.automations.conversions)} subValue="via automações" trend={14.2} iconColor="text-rose-600" iconBg="bg-rose-50" />
            <KpiCard icon={XCircle} label="Carrinhos Abandonados" value={fmtNum(m.ecommerce.abandonedCarts)} subValue={fmtBRL(m.ecommerce.abandonedValue)} trendInvert iconColor="text-red-600" iconBg="bg-red-50" />
          </div>

          {/* Charts Row — 2 charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="bg-white rounded-lg border border-slate-200 shadow-[var(--shadow-card)] p-3">
              <SectionHeader icon={TrendingUp} title="Receita Ecommerce" color="bg-emerald-500" />
              <RevenueChart series={m.dailySeries} />
            </div>
            <div className="bg-white rounded-lg border border-slate-200 shadow-[var(--shadow-card)] p-3">
              <SectionHeader icon={Mail} title="Atividade de E-mail" color="bg-blue-500" />
              <div className="flex items-center gap-3 mb-1">
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-300" /><span className="text-[9px] text-slate-500">Enviados</span></div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-violet-400" /><span className="text-[9px] text-slate-500">Abertos</span></div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-indigo-400" /><span className="text-[9px] text-slate-500">Clicados</span></div>
              </div>
              <EmailActivityChart series={m.dailySeries} />
            </div>
          </div>

          {/* Bottom Row — Funnel + Cashback + Lifecycle (same row) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Email Funnel */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-[var(--shadow-card)] p-3">
              <SectionHeader icon={BarChart3} title="Funil de E-mail" color="bg-purple-500" />
              <EmailFunnel data={m.email} />
            </div>

            {/* Cashback Overview */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-[var(--shadow-card)] p-3">
              <SectionHeader icon={Wallet} title="Cashback" color="bg-amber-500" />
              <CashbackDonut data={m.cashback} />
              <div className="grid grid-cols-3 gap-1 mt-2 pt-2 border-t border-slate-100">
                <div className="text-center">
                  <div className="text-sm font-extrabold text-emerald-600">{fmtNum(m.cashback.totalIssued)}</div>
                  <div className="text-[9px] text-slate-400">Emissões</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-extrabold text-amber-600">{fmtNum(m.cashback.totalRedeemed)}</div>
                  <div className="text-[9px] text-slate-400">Resgates</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-extrabold text-red-500">{fmtNum(m.cashback.totalExpired)}</div>
                  <div className="text-[9px] text-slate-400">Expirados</div>
                </div>
              </div>
            </div>

            {/* Lifecycle distribution */}
            {contactCounters ? (
              <div className="bg-white rounded-lg border border-slate-200 shadow-[var(--shadow-card)] p-3">
                <SectionHeader icon={Users} title="Contatos por Estágio" color="bg-slate-600" />
                <div className="space-y-2">
                  <LifecycleBar label="Leads" count={contactCounters.byLifecycle.lead} total={contactCounters.total} color="bg-amber-400" />
                  <LifecycleBar label="Subscribers" count={contactCounters.byLifecycle.subscriber} total={contactCounters.total} color="bg-blue-400" />
                  <LifecycleBar label="Customers" count={contactCounters.byLifecycle.customer} total={contactCounters.total} color="bg-emerald-400" />
                </div>
                {/* Quick automation + ecommerce stats */}
                <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-slate-100">
                  <MiniStat label="Automações" value={fmtNum(m.automations.totalActive)} icon={Workflow} color="text-violet-600" />
                  <MiniStat label="E-mails Auto." value={fmtNum(m.automations.emailsSentByAutomation)} icon={Mail} color="text-sky-600" />
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-slate-200 shadow-[var(--shadow-card)] p-3">
                <SectionHeader icon={Users} title="Contatos por Estágio" color="bg-slate-600" />
                <div className="text-xs text-slate-400 text-center py-4">Carregando...</div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Mini Stat ────────────────────────────────────────────────────────────────

function MiniStat({ label, value, icon: Icon, color }: { label: string; value: string; icon: typeof Mail; color: string }) {
  return (
    <div className="flex items-center gap-1.5 p-1.5 rounded-md bg-slate-50">
      <Icon className={cn('w-3.5 h-3.5 shrink-0', color)} />
      <div className="min-w-0">
        <div className="text-xs font-bold text-slate-800 truncate">{value}</div>
        <div className="text-[9px] text-slate-400 truncate">{label}</div>
      </div>
    </div>
  )
}

// ── Lifecycle Bar ────────────────────────────────────────────────────────────

function LifecycleBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-medium text-slate-600">{label}</span>
        <span className="text-xs font-extrabold text-slate-800">{fmtNum(count)} <span className="font-normal text-slate-400">({fmtPct(pct)})</span></span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
