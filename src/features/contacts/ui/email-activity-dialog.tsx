/**
 * Email Activity Dialog — shows all email events for a contact.
 *
 * Replicates a "subscriber activity" view with:
 * - Stats cards (Envios, Entregas, Aberturas, Cliques, Bounces, Reclamações)
 * - Filter tabs (Todos, Aberto, Clique, Entregue, Enviado, Erro)
 * - Chronological event list with expandable details
 */
import { useState, useMemo } from 'react'
import {
  X,
  Send,
  CheckCircle2,
  Eye,
  MousePointerClick,
  AlertTriangle,
  ShieldAlert,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Globe,
  Link2,
  Mail,
  Clock,
  RefreshCw,
} from 'lucide-react'
import { useEmailActivity } from '@/features/contacts/hooks/use-email-events'
import type { EmailEvent, EmailEventType, EmailEventStats } from '@/features/contacts/api/email-events-api'

// ─── Types ───────────────────────────────────────────────────────────────────

type EventFilter = 'all' | EmailEventType

interface EmailActivityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  email: string | null
  contactName?: string
}

// ─── Event type config ───────────────────────────────────────────────────────

const EVENT_CONFIG: Record<EmailEventType, {
  label: string
  icon: React.ElementType
  color: string
  bgColor: string
  borderColor: string
}> = {
  Send: {
    label: 'Enviado',
    icon: Send,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
  },
  Delivery: {
    label: 'Entregue',
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300',
  },
  Open: {
    label: 'Aberto',
    icon: Eye,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-300',
  },
  Click: {
    label: 'Clique',
    icon: MousePointerClick,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    borderColor: 'border-indigo-300',
  },
  Bounce: {
    label: 'Bounce',
    icon: AlertTriangle,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-300',
  },
  Complaint: {
    label: 'Reclamação',
    icon: ShieldAlert,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
  },
  Reject: {
    label: 'Rejeitado',
    icon: AlertCircle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300',
  },
  RenderingFailure: {
    label: 'Erro de Renderização',
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
  },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeTime(isoString: string): string {
  const now = new Date()
  const date = new Date(isoString)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'agora'
  if (diffMins < 60) return `${diffMins}m atrás`
  if (diffHours < 24) return `${diffHours}h atrás`
  if (diffDays < 7) return `${diffDays}d atrás`
  return date.toLocaleDateString('pt-BR')
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }) + ', ' + date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

// ─── Component ───────────────────────────────────────────────────────────────

export function EmailActivityDialog({ open, onOpenChange, email, contactName }: EmailActivityDialogProps) {
  const [filter, setFilter] = useState<EventFilter>('all')
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null)

  const { data, isLoading, error, refetch } = useEmailActivity(email)

  const filteredEvents = useMemo(() => {
    if (!data?.events) return []
    if (filter === 'all') return data.events
    return data.events.filter((e) => e.eventType === filter)
  }, [data?.events, filter])

  const stats = data?.stats
  const totalEvents = data?.events.length ?? 0

  if (!open) return null

  const FILTER_TABS: { key: EventFilter; label: string; count: number }[] = [
    { key: 'all', label: 'Todos', count: totalEvents },
    { key: 'Open', label: 'Aberto', count: stats?.opens ?? 0 },
    { key: 'Click', label: 'Clique', count: stats?.clicks ?? 0 },
    { key: 'Delivery', label: 'Entregue', count: stats?.deliveries ?? 0 },
    { key: 'Send', label: 'Enviado', count: stats?.sends ?? 0 },
    { key: 'RenderingFailure', label: 'Erro de Renderização', count: stats?.renderingFailures ?? 0 },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog */}
      <div className="relative z-50 w-full max-w-2xl mx-4 bg-white rounded-xl shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-100 text-blue-600">
            <Mail className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">
              Atividade de E-mail — {email}
            </h2>
            {contactName && (
              <p className="text-xs text-slate-500">{contactName}</p>
            )}
          </div>
          <button
            onClick={() => refetch()}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-400 cursor-pointer"
            title="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-400 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Loading / Error */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-botica-600" />
            <span className="ml-2 text-sm text-slate-500">Carregando atividades...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 px-6 py-4 bg-red-50">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-600">
              {error instanceof Error ? error.message : 'Erro ao carregar eventos'}
            </span>
          </div>
        )}

        {!isLoading && !error && stats && (
          <>
            {/* Stats Cards */}
            <div className="px-6 py-4 border-b border-slate-100">
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                <StatCard label="Envios" value={stats.sends} color="blue" />
                <StatCard label="Entregas" value={stats.deliveries} color="green" />
                <StatCard label="Aberturas" value={stats.opens} color="purple" />
                <StatCard label="Cliques" value={stats.clicks} color="indigo" />
                <StatCard label="Bounces" value={stats.bounces} color="amber" />
                <StatCard label="Reclam." value={stats.complaints} color="red" />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 px-6 py-2.5 border-b border-slate-100 overflow-x-auto">
              <div className="flex items-center gap-1 text-slate-400 mr-1">
                <Globe className="w-3.5 h-3.5" />
              </div>
              {FILTER_TABS.filter(t => t.count > 0 || t.key === 'all').map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    filter === tab.key
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            {/* Events List */}
            <div className="flex-1 overflow-y-auto px-6 py-3 min-h-0">
              {filteredEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Nenhum evento encontrado.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredEvents.map((event) => (
                    <EventItem
                      key={event.eventTypeTimestamp}
                      event={event}
                      isExpanded={expandedEvent === event.eventTypeTimestamp}
                      onToggle={() =>
                        setExpandedEvent(
                          expandedEvent === event.eventTypeTimestamp ? null : event.eventTypeTimestamp,
                        )
                      }
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-2 border-t border-slate-100 text-xs text-slate-400">
              {filteredEvents.length} resultado{filteredEvents.length !== 1 ? 's' : ''}
              {filter !== 'all' && ` • ${data?.events.length} total`}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: 'blue' | 'green' | 'purple' | 'indigo' | 'amber' | 'red'
}) {
  const colorMap = {
    blue: 'text-blue-600 border-blue-200 bg-blue-50',
    green: 'text-green-600 border-green-200 bg-green-50',
    purple: 'text-purple-600 border-purple-200 bg-purple-50',
    indigo: 'text-indigo-600 border-indigo-200 bg-indigo-50',
    amber: 'text-amber-600 border-amber-200 bg-amber-50',
    red: 'text-red-600 border-red-200 bg-red-50',
  }

  return (
    <div className={`rounded-lg border p-2.5 text-center ${colorMap[color]}`}>
      <p className="text-lg font-bold">{value.toLocaleString('pt-BR')}</p>
      <p className="text-[10px] font-medium opacity-70 mt-0.5">{label}</p>
    </div>
  )
}

function EventItem({
  event,
  isExpanded,
  onToggle,
}: {
  event: EmailEvent
  isExpanded: boolean
  onToggle: () => void
}) {
  const config = EVENT_CONFIG[event.eventType]
  const Icon = config.icon
  const hasDetails = !!event.additionalInfo

  return (
    <div className="border-b border-slate-50 last:border-b-0">
      <div
        className="flex items-start gap-3 py-2.5 cursor-pointer hover:bg-slate-50 rounded-md px-2 -mx-2 transition-colors"
        onClick={onToggle}
      >
        {/* Event icon */}
        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${config.bgColor} ${config.color} mt-0.5 flex-shrink-0`}>
          <Icon className="w-4 h-4" />
        </div>

        {/* Event content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
            <span className="text-xs text-slate-400">{formatRelativeTime(event.timestamp)}</span>
          </div>
          <p className="text-xs text-slate-600 truncate mt-0.5">
            {event.subject ? (
              <>
                <span className="text-slate-400">📧</span> {event.subject}
              </>
            ) : (
              <span className="text-slate-400 italic">Sem assunto</span>
            )}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDateTime(event.timestamp)}
          </p>
        </div>

        {/* Expand indicator */}
        {hasDetails && (
          <button className="p-0.5 text-slate-400 flex-shrink-0">
            {isExpanded ? (
              <>
                <span className="text-[10px] text-botica-600 mr-1">Detalhes</span>
                <ChevronUp className="w-3.5 h-3.5 inline" />
              </>
            ) : (
              <>
                <span className="text-[10px] mr-1">Detalhes</span>
                <ChevronDown className="w-3.5 h-3.5 inline" />
              </>
            )}
          </button>
        )}
      </div>

      {/* Expanded details */}
      {isExpanded && hasDetails && (
        <div className="ml-11 mb-2 px-3 py-2 bg-slate-50 rounded-md border border-slate-100">
          {event.eventType === 'Click' && event.additionalInfo.startsWith('http') ? (
            <div className="flex items-start gap-2">
              <Link2 className="w-3.5 h-3.5 text-indigo-500 mt-0.5 flex-shrink-0" />
              <a
                href={event.additionalInfo}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-600 hover:underline break-all"
              >
                {event.additionalInfo}
              </a>
            </div>
          ) : event.eventType === 'Open' ? (
            <div className="flex items-start gap-2">
              <Globe className="w-3.5 h-3.5 text-purple-500 mt-0.5 flex-shrink-0" />
              <span className="text-xs text-slate-600 break-all font-mono">
                {event.additionalInfo}
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-600 break-all font-mono">
              {event.additionalInfo}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
