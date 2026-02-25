/**
 * Campaign Statistics Detail View
 *
 * Modeled after RD Station's campaign statistics page:
 * - Summary KPI cards (sent, delivered, opened, clicked)
 * - Engagement bar chart
 * - Detailed breakdown tables
 */
import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import {
  ArrowLeft,
  Mail,
  CheckCircle2,
  Eye,
  MousePointerClick,
  AlertTriangle,
  ShieldAlert,
  UserMinus,
} from 'lucide-react'
import { Button } from '@/shared/ui'
import type { Campaign } from '../types'

interface CampaignStatsProps {
  campaign: Campaign
  onBack: () => void
}

export function CampaignStatsView({ campaign, onBack }: CampaignStatsProps) {
  const { stats } = campaign
  const total = stats.selected || 1 // avoid division by zero

  const pctSent = ((stats.sent / total) * 100).toFixed(2)
  const pctDelivered = stats.sent ? ((stats.delivered / stats.sent) * 100).toFixed(2) : '0,00'
  const pctOpened = stats.sent ? ((stats.opened / stats.sent) * 100).toFixed(2) : '0,00'
  const pctClicked = stats.sent ? ((stats.clicked / stats.sent) * 100).toFixed(2) : '0,00'
  const pctBounced = stats.sent ? ((stats.bounced / stats.sent) * 100).toFixed(2) : '0,00'
  const pctComplained = stats.sent ? ((stats.complained / stats.sent) * 100).toFixed(2) : '0,00'
  const pctUnsubscribed = stats.sent ? ((stats.unsubscribed / stats.sent) * 100).toFixed(2) : '0,00'

  // Engagement classification (similar to RD Station)
  const engagados = stats.opened + stats.clicked
  const indeterminados = stats.delivered - stats.opened - stats.bounced
  const invalidos = stats.bounced + stats.complained

  const engagadosPct = stats.selected ? ((engagados / stats.selected) * 100).toFixed(2) : '0,00'
  const indeterminadosPct = stats.selected
    ? ((Math.max(0, indeterminados) / stats.selected) * 100).toFixed(2)
    : '0,00'
  const invalidosPct = stats.selected ? ((invalidos / stats.selected) * 100).toFixed(2) : '0,00'

  const engagementData = useMemo(
    () => [
      { name: 'Engajados', value: Number(engagadosPct), total: engagados, color: '#8b5cf6' },
      {
        name: 'Indeterminados',
        value: Number(indeterminadosPct),
        total: Math.max(0, indeterminados),
        color: '#8b5cf6',
      },
      { name: 'Inválidos', value: Number(invalidosPct), total: invalidos, color: '#8b5cf6' },
    ],
    [engagadosPct, indeterminadosPct, invalidosPct, engagados, indeterminados, invalidos],
  )

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <p className="text-xs text-slate-400 mb-1">Email Marketing</p>
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-slate-900">{campaign.name}</h1>
        </div>
        <div className="mt-2 space-y-1 text-sm text-slate-600">
          <p>
            <span className="text-slate-400">Assunto</span>{' '}
            <strong>{campaign.subject}</strong>
          </p>
          {campaign.sentAt && (
            <p>
              <span className="text-slate-400">Enviado em</span>{' '}
              <strong>
                {new Date(campaign.sentAt).toLocaleDateString('pt-BR')}{' '}
                {new Date(campaign.sentAt).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </strong>{' '}
              <span className="text-slate-400">Remetente</span>{' '}
              <strong>
                {campaign.senderName
                  ? `${campaign.senderName} <${campaign.senderEmail}>`
                  : campaign.senderEmail}
              </strong>
            </p>
          )}
          {campaign.recipientTags.length > 0 && (
            <p>
              <span className="text-slate-400">Enviado para</span>{' '}
              <span className="text-blue-600 font-medium">
                {campaign.recipientTags.join(', ')}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="EMAILS ENVIADOS"
          pct={pctSent}
          count={stats.sent}
          accent="bg-cyan-400"
          textColor="text-cyan-900"
        />
        <KpiCard
          label="EMAILS ENTREGUES"
          pct={pctDelivered}
          count={stats.delivered}
          accent="bg-white border border-slate-200"
          textColor="text-slate-900"
        />
        <KpiCard
          label="TAXA DE ABERTURA"
          pct={pctOpened}
          count={stats.opened}
          accent="bg-white border border-slate-200"
          textColor="text-slate-900"
        />
        <KpiCard
          label="TAXA DE CLIQUES ÚNICOS"
          pct={pctClicked}
          count={stats.clicked}
          accent="bg-white border border-slate-200"
          textColor="text-slate-900"
        />
      </div>

      {/* Engagement Chart */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={engagementData} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} domain={[0, 'auto']} />
            <Tooltip
              formatter={(value: number) => [`${value.toFixed(2)}%`, 'Percentual']}
              contentStyle={{ fontSize: 12 }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={120}>
              {engagementData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Engagement Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Engajamento
              </th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Leads
              </th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Porcentagem
              </th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-50">
              <td className="px-5 py-3 font-medium text-slate-700">Leads Engajados</td>
              <td className="px-5 py-3 text-center text-slate-400">–</td>
              <td className="px-5 py-3 text-center text-slate-700">{engagadosPct}%</td>
              <td className="px-5 py-3 text-right font-medium text-slate-700">
                {engagados.toLocaleString('pt-BR')}
              </td>
            </tr>
            <tr className="border-b border-slate-50">
              <td className="px-5 py-3 font-medium text-slate-700">Leads Indeterminados</td>
              <td className="px-5 py-3 text-center text-slate-400">–</td>
              <td className="px-5 py-3 text-center text-slate-700">{indeterminadosPct}%</td>
              <td className="px-5 py-3 text-right font-medium text-slate-700">
                {Math.max(0, indeterminados).toLocaleString('pt-BR')}
              </td>
            </tr>
            <tr>
              <td className="px-5 py-3 font-medium text-slate-700">Leads Inválidos</td>
              <td className="px-5 py-3 text-center text-slate-400">–</td>
              <td className="px-5 py-3 text-center text-slate-700">{invalidosPct}%</td>
              <td className="px-5 py-3 text-right font-medium text-slate-700">
                {invalidos.toLocaleString('pt-BR')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Send Details Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Envio
              </th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Leads
              </th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Porcentagem
              </th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-50">
              <td className="px-5 py-3 font-medium text-slate-700">Total de Leads enviados</td>
              <td className="px-5 py-3 text-center text-slate-400">–</td>
              <td className="px-5 py-3 text-center text-slate-700">{pctSent}%</td>
              <td className="px-5 py-3 text-right font-medium text-slate-700">
                {stats.sent.toLocaleString('pt-BR')}
              </td>
            </tr>
            <tr className="border-b border-slate-50">
              <td className="px-5 py-3 font-medium text-slate-700">Total de Leads selecionados</td>
              <td className="px-5 py-3 text-center text-slate-400">–</td>
              <td className="px-5 py-3 text-center text-slate-700">100,00%</td>
              <td className="px-5 py-3 text-right font-medium text-slate-700">
                {stats.selected.toLocaleString('pt-BR')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Detailed Metrics */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">Métricas Detalhadas</h3>
        </div>
        <table className="w-full text-sm">
          <tbody>
            <MetricRow
              icon={<Mail className="w-4 h-4 text-blue-500" />}
              label="Enviados"
              value={stats.sent}
              pct={pctSent}
            />
            <MetricRow
              icon={<CheckCircle2 className="w-4 h-4 text-green-500" />}
              label="Entregues"
              value={stats.delivered}
              pct={pctDelivered}
            />
            <MetricRow
              icon={<Eye className="w-4 h-4 text-indigo-500" />}
              label="Aberturas"
              value={stats.opened}
              pct={pctOpened}
            />
            <MetricRow
              icon={<MousePointerClick className="w-4 h-4 text-cyan-500" />}
              label="Cliques"
              value={stats.clicked}
              pct={pctClicked}
            />
            <MetricRow
              icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
              label="Bounces"
              value={stats.bounced}
              pct={pctBounced}
            />
            <MetricRow
              icon={<ShieldAlert className="w-4 h-4 text-red-500" />}
              label="Spam"
              value={stats.complained}
              pct={pctComplained}
            />
            <MetricRow
              icon={<UserMinus className="w-4 h-4 text-orange-500" />}
              label="Descadastros"
              value={stats.unsubscribed}
              pct={pctUnsubscribed}
              last
            />
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function KpiCard({
  label,
  pct,
  count,
  accent,
  textColor,
}: {
  label: string
  pct: string
  count: number
  accent: string
  textColor: string
}) {
  return (
    <div className={`rounded-lg p-5 text-center ${accent} shadow-sm`}>
      <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${textColor} opacity-70`}>
        {label}
      </p>
      <p className={`text-3xl font-bold ${textColor}`}>
        {pct.replace('.', ',')}%
      </p>
      <p className={`text-sm mt-1 ${textColor} opacity-60`}>
        {count.toLocaleString('pt-BR')}
      </p>
    </div>
  )
}

function MetricRow({
  icon,
  label,
  value,
  pct,
  last,
}: {
  icon: React.ReactNode
  label: string
  value: number
  pct: string
  last?: boolean
}) {
  return (
    <tr className={last ? '' : 'border-b border-slate-50'}>
      <td className="px-5 py-3">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-slate-700">{label}</span>
        </div>
      </td>
      <td className="px-5 py-3 text-right text-slate-600">
        {value.toLocaleString('pt-BR')}
      </td>
      <td className="px-5 py-3 text-right text-slate-500 w-24">
        {pct.replace('.', ',')}%
      </td>
    </tr>
  )
}
