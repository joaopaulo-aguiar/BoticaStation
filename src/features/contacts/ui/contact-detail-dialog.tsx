import { useState, useMemo } from 'react'
import {
  X, Mail, Phone, Tag, Calendar, User, Shield, Wallet,
  Send, CheckCircle, Eye, MousePointerClick, AlertTriangle,
  AlertOctagon, XCircle, ChevronDown, RefreshCw, Clock,
  ExternalLink, MessageSquare, Gift, Globe, FileText,
  ShoppingCart, CheckSquare,
} from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { cn, formatPhone, decodeCampaignName } from '@/shared/lib/utils'
import { useContactEvents } from '../hooks/use-contacts'
import {
  LIFECYCLE_STAGES,
  CONTACT_STATUSES,
  CHANNEL_FILTERS,
  getEventConfig,
  SOURCE_LABELS,
} from '../types'
import type { Contact, ContactEvent, ContactStats, ContactEventFilterInput, EcommerceInfo } from '../types'

// ── Event Icons (channel-aware) ─────────────────────────────────────────────────────

const EVENT_ICONS: Record<string, Record<string, typeof Send>> = {
  email: {
    Send: Send, Delivery: CheckCircle, Open: Eye, Click: MousePointerClick,
    Bounce: AlertTriangle, Complaint: AlertOctagon, Reject: XCircle,
  },
  sms: { Send: MessageSquare, Delivery: CheckCircle },
  cashback: { Earned: Wallet, Redeemed: Gift, Expired: Clock },
  web: { PageView: Globe, FormSubmit: FileText },
}

function getEventIcon(channel: string, eventType: string) {
  return EVENT_ICONS[channel]?.[eventType] ?? Clock
}

// ── Time helpers ─────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'agora mesmo'
  if (mins < 60) return `${mins}min atrás`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h atrás`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d atrás`
  const months = Math.floor(days / 30)
  return `${months} mês${months > 1 ? 'es' : ''} atrás`
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

// ── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ stats }: { stats: ContactStats | null | undefined }) {
  const s = stats ?? { emailSends: 0, emailDeliveries: 0, emailOpens: 0, emailClicks: 0, emailBounces: 0, emailComplaints: 0, smsSends: 0, smsDeliveries: 0 }
  const items = [
    { key: 'emailSends', label: 'E-mails', value: s.emailSends, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { key: 'emailDeliveries', label: 'Entregas', value: s.emailDeliveries, color: 'text-green-600 bg-green-50 border-green-200' },
    { key: 'emailOpens', label: 'Aberturas', value: s.emailOpens, color: 'text-purple-600 bg-purple-50 border-purple-200' },
    { key: 'emailClicks', label: 'Cliques', value: s.emailClicks, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
    { key: 'emailBounces', label: 'Bounces', value: s.emailBounces, color: 'text-red-600 bg-red-50 border-red-200' },
    { key: 'smsSends', label: 'SMS', value: s.smsSends, color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
  ]

  return (
    <div className="flex gap-2">
      {items.map((item) => (
        <div key={item.key} className={cn('flex-1 rounded-lg border p-3 text-center', item.color)}>
          <div className="text-lg font-bold">{item.value.toLocaleString('pt-BR')}</div>
          <div className="text-[10px] font-medium opacity-70">{item.label}</div>
        </div>
      ))}
    </div>
  )
}

// ── Event Timeline Item ──────────────────────────────────────────────────────

function EventItem({ event }: { event: ContactEvent }) {
  const [showDetails, setShowDetails] = useState(false)
  const config = getEventConfig(event.channel, event.eventType)
  const Icon = getEventIcon(event.channel, event.eventType)

  return (
    <div className="flex gap-3 py-3 group">
      {/* Icon */}
      <div className="flex flex-col items-center">
        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center border-2 bg-white shrink-0', config.color, 'border-current/20')}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="w-px flex-1 bg-slate-200 mt-1" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-2">
        <div className="flex items-baseline gap-2">
          <span className={cn('text-sm font-semibold', config.color)}>{config.label}</span>
          <span className="text-[11px] text-slate-400">{timeAgo(event.createdAt)}</span>
        </div>

        {event.subject && (
          <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1">
            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate">{event.subject}</span>
          </p>
        )}

        {event.campaignName && (
          <p className="text-xs text-slate-500 mt-0.5">
            Campanha: <span className="font-medium text-slate-700">{decodeCampaignName(event.campaignName)}</span>
          </p>
        )}

        <p className="text-[10px] text-slate-400 mt-1">{formatDateTime(event.createdAt)}</p>

        {event.details && (
          <>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-[11px] text-blue-600 hover:text-blue-700 mt-1 flex items-center gap-0.5 cursor-pointer"
            >
              <ExternalLink className="w-3 h-3" />
              {showDetails ? 'Ocultar detalhes' : 'Detalhes'}
            </button>
            {showDetails && (
              <pre className="text-[10px] text-slate-500 bg-slate-50 rounded p-2 mt-1 overflow-x-auto whitespace-pre-wrap break-all max-h-32">
                {event.details}
              </pre>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Main Dialog ──────────────────────────────────────────────────────────────

interface ContactDetailDialogProps {
  contact: Contact
  open: boolean
  onClose: () => void
}

export function ContactDetailDialog({ contact, open, onClose }: ContactDetailDialogProps) {
  const [channelFilter, setChannelFilter] = useState<string | null>(null)

  const filter = useMemo<ContactEventFilterInput | null>(
    () => channelFilter ? { channel: channelFilter } : null,
    [channelFilter],
  )

  const {
    data: eventsData,
    isLoading: eventsLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refetch: refetchEvents,
    isRefetching: isRefetchingEvents,
  } = useContactEvents(contact.id, filter)

  const events = useMemo(
    () => eventsData?.pages.flatMap((p) => p.items) ?? [],
    [eventsData],
  )

  const totalEvents = events.length
  const lifecycle = LIFECYCLE_STAGES.find((l) => l.value === contact.lifecycleStage)
  const statusInfo = CONTACT_STATUSES.find((s) => s.value === contact.status)
  const cashback = contact.cashbackInfo?.currentBalance ?? 0

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100]" role="dialog">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-4xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-start gap-4 px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
          <div className="w-12 h-12 rounded-full bg-botica-100 text-botica-700 flex items-center justify-center text-lg font-bold shrink-0">
            {contact.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-slate-900 truncate">{contact.fullName}</h2>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-sm text-slate-500">{contact.email}</span>
              {contact.phone && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="text-sm text-slate-500">{formatPhone(contact.phone)}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {lifecycle && <Badge className={cn('text-[10px]', lifecycle.color)}>{lifecycle.label}</Badge>}
              {statusInfo && <Badge className={cn('text-[10px]', statusInfo.color)}>{statusInfo.label}</Badge>}
              {contact.tags.map((tag) => (
                <Badge key={tag} className="text-[10px] bg-slate-100 text-slate-600">
                  <Tag className="w-2.5 h-2.5 mr-0.5" />{tag}
                </Badge>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar: Contact Info */}
          <div className="w-72 shrink-0 border-r border-slate-200 overflow-y-auto bg-slate-50/50">
            <div className="p-4 space-y-4">
              {/* Contact details */}
              <section>
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Detalhes do Contato</h3>
                <div className="space-y-2.5">
                  <InfoRow icon={Mail} label="E-mail" value={contact.email} />
                  <InfoRow icon={Phone} label="Telefone" value={formatPhone(contact.phone)} />
                  <InfoRow icon={User} label="Estágio" value={lifecycle?.label ?? contact.lifecycleStage} />
                  <InfoRow icon={Shield} label="Status" value={statusInfo?.label ?? contact.status} />
                  <InfoRow icon={Calendar} label="Origem" value={SOURCE_LABELS[contact.source] ?? contact.source} />
                  <InfoRow icon={Calendar} label="Criado em" value={formatDate(contact.createdAt)} />
                  {contact.updatedAt && (
                    <InfoRow icon={Clock} label="Atualizado" value={formatDate(contact.updatedAt)} />
                  )}
                </div>
              </section>

              {/* Cashback */}
              <section className="rounded-lg border border-slate-200 bg-white p-3">
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5" /> Cashback
                </h3>
                <div className="text-lg font-bold text-botica-700">
                  R$ {cashback.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                {contact.cashbackInfo && (
                  <div className="text-[10px] text-slate-500 mt-1">
                    Acumulado: R$ {contact.cashbackInfo.lifetimeEarned.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    {contact.cashbackInfo.expiryDate && (
                      <span> · Expira: {formatDate(contact.cashbackInfo.expiryDate)}</span>
                    )}
                  </div>
                )}
              </section>

              {/* Tags */}
              <section>
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> Tags
                </h3>
                {contact.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {contact.tags.map((tag) => (
                      <Badge key={tag} className="text-[11px] bg-botica-50 text-botica-700 border border-botica-200">{tag}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Nenhuma tag</p>
                )}
              </section>

              {/* Data Protection */}
              <section className="rounded-lg border border-slate-200 bg-white p-3">
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> Proteção de dados
                </h3>
                <div className="space-y-1.5">
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">Base legal para comunicação</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {contact.legalBasis ? (
                      <><CheckSquare className="w-3.5 h-3.5 text-green-600" /><span className="text-xs font-medium text-green-700">Aceitou</span></>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Não informado</span>
                    )}
                  </div>
                </div>
              </section>

              {/* Ecommerce Activity */}
              <EcommerceSection ecommerce={contact.ecommerceInfo} />

              {/* Channel Health */}
              <section className="rounded-lg border border-slate-200 bg-white p-3">
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Saúde dos Canais</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">E-mail</span>
                    <ChannelBadge status={contact.emailStatus} />
                  </div>
                  {contact.emailFailReason && (
                    <p className="text-[10px] text-red-500">{contact.emailFailReason}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">Telefone</span>
                    <ChannelBadge status={contact.phoneStatus} />
                  </div>
                </div>
              </section>

              {/* Audit */}
              {(contact.createdBy || contact.updatedBy) && (
                <section>
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Auditoria</h3>
                  <div className="text-[10px] text-slate-500 space-y-1">
                    {contact.createdBy && <p>Criado por: {contact.createdBy}</p>}
                    {contact.updatedBy && <p>Atualizado por: {contact.updatedBy}</p>}
                  </div>
                </section>
              )}
            </div>
          </div>

          {/* Right content: Activity Timeline */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Stats */}
            <div className="px-5 pt-4 pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-botica-600" />
                  Atividade — {contact.fullName}
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchEvents()}
                  disabled={isRefetchingEvents}
                  className="h-7 text-xs"
                >
                  <RefreshCw className={cn('w-3 h-3 mr-1', isRefetchingEvents && 'animate-spin')} />
                  Atualizar
                </Button>
              </div>
              <StatsBar stats={contact.stats} />
            </div>

            {/* Channel filters */}
            <div className="px-5 py-2.5 border-b border-slate-100 flex items-center gap-1.5 flex-wrap">
              {CHANNEL_FILTERS.map(({ channel, label, icon }) => {
                const count = channel
                  ? events.filter((e) => e.channel === channel).length
                  : totalEvents
                return (
                  <button
                    key={channel ?? 'all'}
                    onClick={() => setChannelFilter(channel)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer border',
                      channelFilter === channel
                        ? 'bg-botica-600 text-white border-botica-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50',
                    )}
                  >
                    <span className="mr-1">{icon}</span>
                    {label}
                    {!eventsLoading && <span className="ml-1 opacity-70">({count})</span>}
                  </button>
                )
              })}
            </div>

            {/* Timeline */}
            <div className="flex-1 overflow-y-auto px-5 py-2">
              {eventsLoading ? (
                <div className="flex items-center justify-center py-12 text-sm text-slate-400">
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  Carregando atividades...
                </div>
              ) : events.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Mail className="w-10 h-10 text-slate-200 mb-3" />
                  <p className="text-sm text-slate-500">Nenhuma atividade registrada</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {channelFilter ? 'Tente remover os filtros para ver todas as atividades.' : 'As atividades aparecerão aqui conforme aconteçam.'}
                  </p>
                </div>
              ) : (
                <>
                  {events.map((event) => (
                    <EventItem key={event.eventId} event={event} />
                  ))}
                  {hasNextPage && (
                    <div className="text-center py-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                      >
                        {isFetchingNextPage ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 mr-1" />
                        )}
                        Carregar mais
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Ecommerce Section ────────────────────────────────────────────────────────

function EcommerceSection({ ecommerce }: { ecommerce: EcommerceInfo | null | undefined }) {
  const e = ecommerce ?? { paidOrders: 0, revenue: 0, avgTicket: 0, lastPurchaseAt: null, abandonedCarts: 0, abandonedCartValue: 0 }
  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3">
      <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <ShoppingCart className="w-3.5 h-3.5" /> Atividade no ecommerce
      </h3>
      <div className="space-y-2">
        <EcommerceRow label="Pedidos pagos" value={String(e.paidOrders)} />
        <EcommerceRow label="Receita" value={fmt(e.revenue)} />
        <EcommerceRow label="Ticket médio" value={fmt(e.avgTicket)} />
        <EcommerceRow label="Data da última compra" value={e.lastPurchaseAt ? formatDate(e.lastPurchaseAt) : '—'} />
        <EcommerceRow label="Carrinhos abandonados" value={String(e.abandonedCarts)} />
        <EcommerceRow label="Valor total abandonado" value={fmt(e.abandonedCartValue)} />
      </div>
    </section>
  )
}

function EcommerceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
      <span className="text-[11px] text-slate-500">{label}</span>
      <span className="text-xs font-semibold text-slate-700">{value}</span>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value, mono }: { icon: typeof Mail; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</p>
        <p className={cn('text-xs text-slate-700 truncate', mono && 'font-mono')}>{value}</p>
      </div>
    </div>
  )
}

function ChannelBadge({ status }: { status: string | null }) {
  const cfg: Record<string, { label: string; color: string }> = {
    active: { label: 'Ativo', color: 'bg-green-100 text-green-700' },
    bounced: { label: 'Bounce', color: 'bg-red-100 text-red-700' },
    complained: { label: 'Complaint', color: 'bg-red-100 text-red-700' },
    unsubscribed: { label: 'Descadastrado', color: 'bg-slate-100 text-slate-600' },
    invalid: { label: 'Inválido', color: 'bg-red-100 text-red-700' },
  }
  const info = cfg[status ?? 'active'] ?? { label: status ?? '—', color: 'bg-slate-100 text-slate-500' }
  return <Badge className={cn('text-[10px]', info.color)}>{info.label}</Badge>
}
