import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Megaphone, Plus, Search, Trash2, Pencil, Copy, Send, RefreshCw,
  AlertCircle, Check, Calendar, Pause, Play, X as XIcon,
  MoreVertical, ChevronLeft, ChevronRight, Mail,
  Link2, Save, Clock, Zap, AlertTriangle, Users,
} from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/shared/ui/dialog'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/shared/ui/table'
import { cn } from '@/shared/lib/utils'
import {
  useCampaignsList,
  useCreateCampaign,
  useUpdateCampaign,
  useDeleteCampaign,
  useSendCampaign,
  usePauseCampaign,
  useCancelCampaign,
  useScheduleCampaign,
  useResumeCampaign,
  useDuplicateCampaign,
  useCampaignSettings,
  useUpdateCampaignSettings,
} from '../hooks/use-campaigns'
import { useTemplatesList, useTemplateDetail } from '@/features/templates/hooks/use-templates'
import { useSenderProfiles, useDefaultConfigurationSet } from '@/features/settings/hooks/use-settings'
import { useSegmentsList } from '@/features/segmentation/hooks/use-segments'
import { useContactCounters } from '@/features/contacts/hooks/use-contacts'
import { TemplatesPage } from '@/features/templates'
import {
  CAMPAIGN_STATUSES,
  RECIPIENT_TYPE_OPTIONS,
  LIFECYCLE_FILTER_OPTIONS,
} from '../types'
import type {
  Campaign,
  CampaignStatus,
  RecipientType,
  CreateCampaignInput,
  UtmParams,
} from '../types'

// ── Helpers ──────────────────────────────────────────────────────────────────

function FormatDateBold({ iso }: { iso: string | null }) {
  if (!iso) return <span>—</span>
  const d = new Date(iso)
  const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return <span>{date} - <strong>{time}</strong></span>
}

function getStatusConfig(status: CampaignStatus) {
  return CAMPAIGN_STATUSES.find((s) => s.value === status) ?? CAMPAIGN_STATUSES[0]
}

// ── Campaign Calendar Component ──────────────────────────────────────────────

interface CalendarProps {
  selectedDate: Date | null
  onSelectDate: (date: Date) => void
  selectedTime: string
  onSelectTime: (time: string) => void
  campaigns: Campaign[]
}

function CampaignCalendar({ selectedDate, onSelectDate, selectedTime, onSelectTime, campaigns }: CalendarProps) {
  const today = new Date()
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [viewYear, setViewYear] = useState(today.getFullYear())

  const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1
  const nextMonthYear = viewMonth === 11 ? viewYear + 1 : viewYear

  function getDaysInMonth(month: number, year: number) {
    return new Date(year, month + 1, 0).getDate()
  }
  function getFirstDayOfWeek(month: number, year: number) {
    return new Date(year, month, 1).getDay()
  }

  const campaignsByDate = useMemo(() => {
    const map: Record<string, Campaign[]> = {}
    campaigns.forEach((c) => {
      const dateStr = c.scheduledAt ?? c.sentAt
      if (!dateStr) return
      const key = dateStr.slice(0, 10)
      if (!map[key]) map[key] = []
      map[key].push(c)
    })
    return map
  }, [campaigns])

  function renderMonth(month: number, year: number) {
    const daysInMonth = getDaysInMonth(month, year)
    const firstDay = getFirstDayOfWeek(month, year)
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

    const cells: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)

    const isToday = (day: number) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
    const isSelected = (day: number) => selectedDate && day === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear()
    const isPast = (day: number) => {
      const d = new Date(year, month, day)
      d.setHours(23, 59, 59, 999)
      return d < new Date(today.getFullYear(), today.getMonth(), today.getDate())
    }

    return (
      <div className="flex-1 min-w-0">
        <div className="text-center text-sm font-semibold text-slate-700 mb-2">
          {monthNames[month]} {year}
        </div>
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {dayNames.map((d) => (
            <div key={d} className="text-[10px] font-medium text-slate-400 text-center py-0.5">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, i) => {
            if (!day) return <div key={`e-${i}`} />
            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const dayCampaigns = campaignsByDate[dateKey] ?? []
            const past = isPast(day)
            return (
              <button
                key={day}
                disabled={past}
                onClick={() => onSelectDate(new Date(year, month, day))}
                className={cn(
                  'relative flex flex-col items-center justify-center h-9 rounded-md text-xs transition-all cursor-pointer',
                  isSelected(day)
                    ? 'bg-botica-600 text-white font-bold shadow-sm'
                    : isToday(day)
                      ? 'bg-botica-50 text-botica-700 font-semibold ring-1 ring-botica-300'
                      : past
                        ? 'text-slate-300 cursor-not-allowed'
                        : 'text-slate-700 hover:bg-slate-100',
                )}
                title={dayCampaigns.length ? dayCampaigns.map((c) => `${c.name} — ${c.scheduledAt ? new Date(c.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'enviada'}`).join('\n') : undefined}
              >
                {day}
                {dayCampaigns.length > 0 && (
                  <div className="flex gap-0.5 absolute -bottom-0.5">
                    {dayCampaigns.slice(0, 3).map((c, idx) => (
                      <span
                        key={idx}
                        className={cn(
                          'w-1 h-1 rounded-full',
                          c.status === 'sent' ? 'bg-green-500' :
                          c.status === 'scheduled' ? 'bg-blue-500' :
                          c.status === 'sending' ? 'bg-amber-500' : 'bg-slate-400',
                        )}
                      />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const hours = Array.from({ length: 16 }, (_, i) => i + 7)
  const minutes = ['00', '15', '30', '45']

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1) }
            else setViewMonth(viewMonth - 1)
          }}
          className="p-1 rounded hover:bg-slate-100 text-slate-500 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1) }
            else setViewMonth(viewMonth + 1)
          }}
          className="p-1 rounded hover:bg-slate-100 text-slate-500 cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-4">
        {renderMonth(viewMonth, viewYear)}
        {renderMonth(nextMonth, nextMonthYear)}
      </div>

      <div className="pt-2 border-t border-slate-100">
        <Label className="text-xs text-slate-500 mb-1 block">Horário de Envio</Label>
        <div className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedTime.split(':')[0] ?? '09'}
            onChange={(e) => onSelectTime(`${e.target.value}:${selectedTime.split(':')[1] ?? '00'}`)}
            className="h-7 w-14 rounded border-0 bg-transparent px-1 text-sm font-medium text-slate-700 focus:outline-none focus:ring-0 text-center appearance-none cursor-pointer"
          >
            {hours.map((h) => (
              <option key={h} value={String(h).padStart(2, '0')}>
                {String(h).padStart(2, '0')}
              </option>
            ))}
          </select>
          <span className="text-slate-400 font-bold text-sm">:</span>
          <select
            value={selectedTime.split(':')[1] ?? '00'}
            onChange={(e) => onSelectTime(`${selectedTime.split(':')[0] ?? '09'}:${e.target.value}`)}
            className="h-7 w-14 rounded border-0 bg-transparent px-1 text-sm font-medium text-slate-700 focus:outline-none focus:ring-0 text-center appearance-none cursor-pointer"
          >
            {minutes.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedDate && (() => {
        const key = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
        const dayCampaigns = campaignsByDate[key] ?? []
        if (!dayCampaigns.length) return null
        const visible = dayCampaigns.slice(0, 3)
        const remaining = dayCampaigns.length - visible.length
        return (
          <div className="pt-2 border-t border-slate-100">
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
              {dayCampaigns.length} campanha{dayCampaigns.length > 1 ? 's' : ''} neste dia
            </span>
            <div className="mt-1 flex flex-wrap gap-1">
              {visible.map((c) => {
                const st = getStatusConfig(c.status)
                return (
                  <span key={c.id} className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium', st.color)}>
                    {c.scheduledAt ? new Date(c.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + ' ' : ''}
                    {c.name.length > 20 ? c.name.slice(0, 20) + '…' : c.name}
                  </span>
                )
              })}
              {remaining > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
                  +{remaining}
                </span>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ── UTM Parameters Section ───────────────────────────────────────────────────

interface UtmSectionProps {
  utm: UtmParams
  onChange: (utm: UtmParams) => void
  campaignName: string
  defaultSource?: string | null
  defaultMedium?: string | null
}

function UtmSection({ utm, onChange, campaignName, defaultSource, defaultMedium }: UtmSectionProps) {
  const autoUtmCampaign = campaignName
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  // Pre-fill defaults on first render
  const didInit = useRef(false)
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    const needsFill = !utm.utmSource && !utm.utmMedium
    if (needsFill && (defaultSource || defaultMedium)) {
      onChange({
        ...utm,
        utmSource: defaultSource || '',
        utmMedium: defaultMedium || 'email',
      })
    }
  }, [defaultSource, defaultMedium]) // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveCampaign = autoUtmCampaign || 'nome-da-campanha'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 mb-1">
        <Link2 className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-xs font-semibold text-slate-700">Parâmetros UTM</span>
      </div>

      <div className="flex gap-2 items-end">
        <div className="w-28 shrink-0">
          <Label className="text-[10px] text-slate-500">utm_source</Label>
          <Input
            value={utm.utmSource ?? ''}
            onChange={(e) => onChange({ ...utm, utmSource: e.target.value })}
            placeholder={defaultSource || 'botica'}
            className="h-7 text-xs mt-0.5"
          />
        </div>
        <div className="w-28 shrink-0">
          <Label className="text-[10px] text-slate-500">utm_medium</Label>
          <Input
            value={utm.utmMedium ?? ''}
            onChange={(e) => onChange({ ...utm, utmMedium: e.target.value })}
            placeholder={defaultMedium || 'email'}
            className="h-7 text-xs mt-0.5"
          />
        </div>
        <div className="flex-1 min-w-0">
          <Label className="text-[10px] text-slate-500">utm_campaign</Label>
          <div className="mt-0.5 h-7 flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-500 truncate">
            {effectiveCampaign}
          </div>
        </div>
        <div className="w-28 shrink-0">
          <Label className="text-[10px] text-slate-500">utm_content</Label>
          <Input
            value={utm.utmContent ?? ''}
            onChange={(e) => onChange({ ...utm, utmContent: e.target.value })}
            placeholder="header-cta"
            className="h-7 text-xs mt-0.5"
          />
        </div>
      </div>
    </div>
  )
}

// ── UTM Defaults Tab ─────────────────────────────────────────────────────────

function UtmDefaultsTab({ showToast }: { showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const { data: settings, isLoading } = useCampaignSettings()
  const updateSettings = useUpdateCampaignSettings()

  const [utmSource, setUtmSource] = useState('')
  const [utmMedium, setUtmMedium] = useState('')
  const [dirty, setDirty] = useState(false)

  // Sync when data loads
  if (settings && !dirty && utmSource === '' && utmMedium === '') {
    setUtmSource(settings.defaultUtmSource ?? '')
    setUtmMedium(settings.defaultUtmMedium ?? 'email')
  }

  const handleSave = useCallback(async () => {
    try {
      await updateSettings.mutateAsync({
        timezone: settings?.timezone || 'America/Sao_Paulo',
        scheduleGroupName: settings?.scheduleGroupName || 'marketing-campaigns',
        defaultUtmSource: utmSource || null,
        defaultUtmMedium: utmMedium || null,
      })
      setDirty(false)
      showToast('Configurações UTM salvas')
    } catch {
      showToast('Erro ao salvar configurações UTM', 'error')
    }
  }, [utmSource, utmMedium, updateSettings, settings, showToast])

  const markDirty = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v)
    setDirty(true)
  }

  if (isLoading) {
    return (
      <div className="p-12 text-center text-sm text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
        Carregando...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-botica-600" />
            <div>
              <h2 className="text-sm font-semibold text-slate-700">Parâmetros UTM Padrão</h2>
              <p className="text-xs text-slate-500">Valores pré-preenchidos ao criar novas campanhas</p>
            </div>
          </div>
          <Button size="sm" onClick={handleSave} disabled={!dirty || updateSettings.isPending}>
            <Save className="w-3.5 h-3.5 mr-1" />
            {updateSettings.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="utm-source-default">utm_source Padrão</Label>
              <Input
                id="utm-source-default"
                value={utmSource}
                onChange={(e) => markDirty(setUtmSource)(e.target.value)}
                placeholder="botica"
                className="mt-1"
              />
              <p className="text-xs text-slate-400 mt-1">
                Identifica a origem do tráfego (ex: botica, newsletter, parceiro)
              </p>
            </div>
            <div>
              <Label htmlFor="utm-medium-default">utm_medium Padrão</Label>
              <Input
                id="utm-medium-default"
                value={utmMedium}
                onChange={(e) => markDirty(setUtmMedium)(e.target.value)}
                placeholder="email"
                className="mt-1"
              />
              <p className="text-xs text-slate-400 mt-1">
                Identifica o canal de marketing (ex: email, sms, social)
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Estes valores serão pré-preenchidos ao criar novas campanhas. Podem ser personalizados individualmente em cada campanha.
          </p>
        </div>
      </div>


    </div>
  )
}

// ── Estimated Recipients Indicator ────────────────────────────────────────────

interface EstimatedRecipientsProps {
  recipientType: RecipientType
  recipientFilter: string
  segmentId: string
  contactCounters: { total: number; byLifecycle: { lead: number; subscriber: number; customer: number } } | undefined
  segments: { id: string; name: string; contactCount: number | null }[]
}

function EstimatedRecipients({ recipientType, recipientFilter, segmentId, contactCounters, segments }: EstimatedRecipientsProps) {
  let count: number | null = null
  let label = ''

  if (recipientType === 'all') {
    count = contactCounters?.total ?? null
    label = 'todos os contatos ativos'
  } else if (recipientType === 'lifecycleStage' && recipientFilter) {
    count = contactCounters?.byLifecycle?.[recipientFilter as 'lead' | 'subscriber' | 'customer'] ?? null
    label = `contatos ${recipientFilter}`
  } else if (recipientType === 'segment' && segmentId) {
    const seg = segments.find((s) => s.id === segmentId)
    count = seg?.contactCount ?? null
    label = seg ? `segmento "${seg.name}"` : 'segmento'
  }

  if (count === null && !contactCounters) return null

  return (
    <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 mt-1">
      <Users className="w-4 h-4 text-blue-600 shrink-0" />
      <div className="text-xs text-blue-800">
        <span className="font-bold text-base text-blue-700">{count != null ? count.toLocaleString('pt-BR') : '—'}</span>{' '}
        <span>contatos estimados</span>
        {label && <span className="text-blue-500"> · {label}</span>}
      </div>
    </div>
  )
}

// ── Campaign Create/Edit Dialog ──────────────────────────────────────────────

interface CampaignFormState {
  templateName: string
  name: string
  subject: string
  senderProfileId: string
  recipientType: RecipientType
  recipientFilter: string
  segmentId: string
  sendMode: 'schedule' | 'now'
  scheduledDate: Date | null
  scheduledTime: string
  utm: UtmParams
}

function getInitialFormState(): CampaignFormState {
  return {
    templateName: '',
    name: '',
    subject: '',
    senderProfileId: '',
    recipientType: 'all',
    recipientFilter: '',
    segmentId: '',
    sendMode: 'schedule',
    scheduledDate: null,
    scheduledTime: '09:00',
    utm: {},
  }
}

function campaignToFormState(c: Campaign): CampaignFormState {
  const parsed: UtmParams = c.utmParams ? JSON.parse(c.utmParams) : {}
  return {
    templateName: c.templateName,
    name: c.name,
    subject: c.subject,
    senderProfileId: c.senderProfileId,
    recipientType: c.recipientType,
    recipientFilter: c.recipientFilter ?? '',
    segmentId: c.segmentId ?? '',
    sendMode: c.scheduledAt ? 'schedule' : 'now',
    scheduledDate: c.scheduledAt ? new Date(c.scheduledAt) : null,
    scheduledTime: c.scheduledAt
      ? `${String(new Date(c.scheduledAt).getHours()).padStart(2, '0')}:${String(new Date(c.scheduledAt).getMinutes()).padStart(2, '0')}`
      : '09:00',
    utm: parsed,
  }
}

/** Validates that the chosen schedule date+time is at least 15 min from now */
function getScheduleError(date: Date | null, time: string): string | null {
  if (!date) return 'Selecione uma data'
  const [h, m] = time.split(':').map(Number)
  const target = new Date(date)
  target.setHours(h, m, 0, 0)
  const minTime = new Date(Date.now() + 15 * 60 * 1000)
  if (target < minTime) {
    return 'O agendamento deve ser para pelo menos 15 minutos a partir de agora'
  }
  return null
}

interface CampaignFormDialogProps {
  open: boolean
  onClose: () => void
  editCampaign: Campaign | null
  campaigns: Campaign[]
  showToast: (msg: string, type?: 'success' | 'error') => void
}

function CampaignFormDialog({ open, onClose, editCampaign, campaigns, showToast }: CampaignFormDialogProps) {
  const [form, setForm] = useState<CampaignFormState>(getInitialFormState)
  const [confirmSendNow, setConfirmSendNow] = useState(false)
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'done'>('idle')

  const { data: templates = [] } = useTemplatesList()
  const { data: templateDetail } = useTemplateDetail(form.templateName || null)
  const { data: senderProfiles = [] } = useSenderProfiles()
  const { data: segments = [] } = useSegmentsList()
  const { data: contactCounters } = useContactCounters()
  const { data: campaignSettings } = useCampaignSettings()
  const { data: defaultConfigSet } = useDefaultConfigurationSet()

  const createCampaign = useCreateCampaign()
  const updateCampaign = useUpdateCampaign()
  const scheduleCampaign = useScheduleCampaign()

  // Reset form when dialog opens
  const prevOpen = useRef(false)
  useEffect(() => {
    if (open && !prevOpen.current) {
      if (editCampaign) {
        setForm(campaignToFormState(editCampaign))
      } else {
        setForm(getInitialFormState())
      }
      setConfirmSendNow(false)
      setSavingState('idle')
    }
    prevOpen.current = open
  }, [open, editCampaign])

  const updateField = <K extends keyof CampaignFormState>(key: K, value: CampaignFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // When template changes, sync subject from template
  const handleTemplateChange = (templateName: string) => {
    updateField('templateName', templateName)
    const tmpl = templates.find((t) => t.name === templateName)
    if (tmpl) {
      if (!form.name) updateField('name', tmpl.displayName)
      updateField('subject', tmpl.displayName) // subject mirrors template
    }
  }

  // When template detail loads, apply UTM defaults from template as fallback
  const didApplyTemplateUtm = useRef<string | null>(null)
  useEffect(() => {
    if (!templateDetail?.utmDefaults || !form.templateName) return
    if (didApplyTemplateUtm.current === form.templateName) return
    if (editCampaign) return // Don't override on edit
    didApplyTemplateUtm.current = form.templateName
    const td = templateDetail.utmDefaults
    const needsFill = !form.utm.utmSource && !form.utm.utmMedium
    if (needsFill && (td.utmSource || td.utmMedium)) {
      setForm((prev) => ({
        ...prev,
        utm: {
          ...prev.utm,
          utmSource: prev.utm.utmSource || td.utmSource || '',
          utmMedium: prev.utm.utmMedium || td.utmMedium || 'email',
        },
      }))
    }
  }, [templateDetail, form.templateName, editCampaign]) // eslint-disable-line react-hooks/exhaustive-deps

  const buildUtmJson = (): string | null => {
    const u = form.utm
    const hasAny = u.utmSource || u.utmMedium || u.utmCampaign || u.utmTerm || u.utmContent
    if (!hasAny && !campaignSettings?.defaultUtmSource) return null
    return JSON.stringify({
      utmSource: u.utmSource || campaignSettings?.defaultUtmSource || 'botica',
      utmMedium: u.utmMedium || campaignSettings?.defaultUtmMedium || 'email',
      utmCampaign: form.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      utmTerm: u.utmTerm || undefined,
      utmContent: u.utmContent || undefined,
    })
  }

  const doSave = useCallback(async () => {
    try {
      setSavingState('saving')
      const utmJson = buildUtmJson()
      const base = {
        name: form.name.trim(),
        subject: form.subject.trim(),
        templateName: form.templateName,
        senderProfileId: form.senderProfileId,
        recipientType: form.recipientType,
        recipientFilter: form.recipientType === 'lifecycleStage' ? form.recipientFilter || null : null,
        segmentId: form.recipientType === 'segment' ? form.segmentId || null : null,
        utmParams: utmJson,
        configurationSet: defaultConfigSet || null,
      }

      let toastMsg: string
      if (editCampaign) {
        await updateCampaign.mutateAsync({ id: editCampaign.id, input: base })
        toastMsg = 'Campanha atualizada'
      } else {
        const created = await createCampaign.mutateAsync(base as CreateCampaignInput)
        if (form.sendMode === 'schedule' && form.scheduledDate) {
          const d = new Date(form.scheduledDate)
          const [h, m] = form.scheduledTime.split(':').map(Number)
          d.setHours(h, m, 0, 0)
          await scheduleCampaign.mutateAsync({ id: created.id, scheduledAt: d.toISOString() })
          toastMsg = 'Campanha criada e agendada'
        } else {
          toastMsg = 'Campanha criada como rascunho'
        }
      }
      setSavingState('done')
      setTimeout(() => {
        onClose()
        showToast(toastMsg)
        setSavingState('idle')
      }, 800)
    } catch {
      setSavingState('idle')
      showToast('Erro ao salvar campanha', 'error')
    }
  }, [form, editCampaign, createCampaign, updateCampaign, scheduleCampaign, onClose, showToast, buildUtmJson, campaignSettings])

  const handleSubmit = useCallback(() => {
    // If "Enviar Agora" and creating new — require double confirmation
    if (!editCampaign && form.sendMode === 'now' && !confirmSendNow) {
      setConfirmSendNow(true)
      return
    }
    doSave()
  }, [editCampaign, form.sendMode, confirmSendNow, doSave])

  const selectedTemplate = templates.find((t) => t.name === form.templateName)
  const scheduleError = form.sendMode === 'schedule'
    ? getScheduleError(form.scheduledDate, form.scheduledTime)
    : null
  const isValid = form.templateName && form.name.trim() && form.senderProfileId
    && (form.sendMode === 'now' || !scheduleError)
  const isSaving = savingState !== 'idle'

  return (
    <Dialog open={open} onOpenChange={isSaving ? () => {} : onClose} maxWidth="max-w-5xl">
      <DialogContent onClose={isSaving ? undefined : onClose} className="!p-0 !max-h-[90vh] relative">
        {/* Loading / success overlay */}
        {isSaving && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm rounded-lg">
            {savingState === 'saving' ? (
              <>
                <div className="w-10 h-10 border-4 border-botica-200 border-t-botica-600 rounded-full animate-spin" />
                <p className="mt-3 text-sm font-medium text-slate-600">
                  {editCampaign ? 'Salvando campanha...' : 'Criando campanha...'}
                </p>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                <p className="mt-3 text-sm font-medium text-green-700">
                  {editCampaign ? 'Campanha salva!' : 'Campanha criada!'}
                </p>
              </>
            )}
          </div>
        )}
        {/* Header */}
        <div className="px-6 pt-5 pb-3 border-b border-slate-100">
          <DialogHeader className="!mb-0">
            <DialogTitle className="text-base">{editCampaign ? 'Editar Campanha' : 'Nova Campanha'}</DialogTitle>
            <DialogDescription className="text-xs">
              {editCampaign ? 'Atualize os dados da campanha' : 'Configure os dados e o agendamento da campanha'}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Two-column layout — 50/50 */}
        <div className="flex divide-x divide-slate-100 min-h-0">
          {/* LEFT: Campaign data */}
          <div className="w-1/2 px-6 py-4 space-y-3">
            {/* Template */}
            <div>
              <Label className="text-xs font-medium text-slate-600">Template de E-mail</Label>
              <select
                value={form.templateName}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full mt-1 h-9 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-botica-500"
              >
                <option value="">Selecione um template...</option>
                {templates.map((t) => (
                  <option key={t.name} value={t.name}>{t.displayName}</option>
                ))}
              </select>
            </div>

            {/* Campaign name */}
            <div>
              <Label className="text-xs font-medium text-slate-600">Nome da Campanha</Label>
              <Input
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Nome para identificar a campanha"
                className="mt-1"
              />
            </div>

            {/* Subject — read only from template */}
            {selectedTemplate && (
              <div>
                <Label className="text-xs font-medium text-slate-600">Assunto do E-mail</Label>
                <div className="mt-1 flex items-center h-9 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">
                  <Mail className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                  {form.subject || selectedTemplate.displayName}
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">O assunto vem do template selecionado</p>
              </div>
            )}

            {/* Sender — pill buttons */}
            <div>
              <Label className="text-xs font-medium text-slate-600">Remetente</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {senderProfiles.map((sp) => (
                  <button
                    key={sp.id}
                    type="button"
                    onClick={() => updateField('senderProfileId', sp.id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all cursor-pointer',
                      form.senderProfileId === sp.id
                        ? 'border-botica-500 bg-botica-50 text-botica-700 ring-1 ring-botica-200'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                    )}
                  >
                    <div className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                      form.senderProfileId === sp.id
                        ? 'bg-botica-600 text-white'
                        : 'bg-slate-200 text-slate-500',
                    )}>
                      {sp.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <div className="font-medium leading-tight">{sp.name}</div>
                      <div className="text-[10px] text-slate-400 leading-tight">{sp.email}</div>
                    </div>
                    {form.senderProfileId === sp.id && <Check className="w-3.5 h-3.5 text-botica-600 ml-1" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Recipients */}
            <div>
              <Label className="text-xs font-medium text-slate-600">Destinatários</Label>
              <div className="flex gap-2 mt-1.5">
                {RECIPIENT_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateField('recipientType', opt.value)}
                    className={cn(
                      'flex-1 py-2 px-2 text-xs rounded-md border transition-all cursor-pointer text-center',
                      form.recipientType === opt.value
                        ? 'border-botica-500 bg-botica-50 text-botica-700 font-medium'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {form.recipientType === 'lifecycleStage' && (
              <div>
                <Label className="text-xs">Estágio do Ciclo</Label>
                <select
                  value={form.recipientFilter}
                  onChange={(e) => updateField('recipientFilter', e.target.value)}
                  className="w-full mt-1 h-9 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-botica-500"
                >
                  <option value="">Selecione...</option>
                  {LIFECYCLE_FILTER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}
            {form.recipientType === 'segment' && (
              <div>
                <Label className="text-xs">Segmento</Label>
                <select
                  value={form.segmentId}
                  onChange={(e) => updateField('segmentId', e.target.value)}
                  className="w-full mt-1 h-9 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-botica-500"
                >
                  <option value="">Selecione um segmento...</option>
                  {segments.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}{s.contactCount != null ? ` (${s.contactCount.toLocaleString('pt-BR')} contatos)` : ''}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Estimated Recipients */}
            <EstimatedRecipients
              recipientType={form.recipientType}
              recipientFilter={form.recipientFilter}
              segmentId={form.segmentId}
              contactCounters={contactCounters}
              segments={segments}
            />

          </div>

          {/* RIGHT: Schedule + UTM */}
          <div className="w-1/2 shrink-0 px-5 py-4 space-y-4">
            {/* Send mode */}
            <div>
              <Label className="text-xs font-medium text-slate-600">Modo de Envio</Label>
              <div className="flex gap-1.5 mt-1.5">
                <button
                  type="button"
                  onClick={() => { updateField('sendMode', 'schedule'); setConfirmSendNow(false) }}
                  className={cn(
                    'flex items-center justify-center gap-1.5 flex-1 py-2 text-xs rounded-md border transition-all cursor-pointer',
                    form.sendMode === 'schedule'
                      ? 'border-botica-500 bg-botica-50 text-botica-700 font-medium'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300',
                  )}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Agendar
                </button>
                <button
                  type="button"
                  onClick={() => { updateField('sendMode', 'now'); setConfirmSendNow(false) }}
                  className={cn(
                    'flex items-center justify-center gap-1.5 flex-1 py-2 text-xs rounded-md border transition-all cursor-pointer',
                    form.sendMode === 'now'
                      ? 'border-amber-500 bg-amber-50 text-amber-700 font-medium'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300',
                  )}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Enviar Agora
                </button>
              </div>
            </div>

            {/* Schedule calendar */}
            {form.sendMode === 'schedule' && (
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <CampaignCalendar
                  selectedDate={form.scheduledDate}
                  onSelectDate={(d) => updateField('scheduledDate', d)}
                  selectedTime={form.scheduledTime}
                  onSelectTime={(t) => updateField('scheduledTime', t)}
                  campaigns={campaigns}
                />
                {scheduleError && (
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] text-red-600 bg-red-50 rounded px-2 py-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    {scheduleError}
                  </div>
                )}
              </div>
            )}

            {/* Send Now warning */}
            {form.sendMode === 'now' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Zap className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-amber-800">Envio imediato</p>
                    <p className="text-[11px] text-amber-600 mt-0.5">
                      A campanha será enviada para todos os destinatários imediatamente ao concluir.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* UTM — full-width bottom section */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/30">
            <UtmSection
              utm={form.utm}
              onChange={(u) => updateField('utm', u)}
              campaignName={form.name}
              defaultSource={campaignSettings?.defaultUtmSource}
              defaultMedium={campaignSettings?.defaultUtmMedium}
            />
            {templateDetail?.utmDefaults && (templateDetail.utmDefaults.utmSource || templateDetail.utmDefaults.utmMedium) && (
              <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-400">
                <Link2 className="w-3 h-3" />
                <span>
                  Fallback do template: utm_source=<strong>{templateDetail.utmDefaults.utmSource || '—'}</strong>,
                  utm_medium=<strong>{templateDetail.utmDefaults.utmMedium || '—'}</strong>
                  {templateDetail.utmDefaults.utmCampaign && <>, utm_campaign=<strong>{templateDetail.utmDefaults.utmCampaign}</strong></>}
                </span>
              </div>
            )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50/50">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <div className="flex items-center gap-2">
            {/* Double-confirm warning for send now */}
            {confirmSendNow && (
              <div className="flex items-center gap-2 mr-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>A campanha será enviada <strong>agora</strong>. Confirmar?</span>
              </div>
            )}
            <Button
              onClick={handleSubmit}
              disabled={!isValid || isSaving}
              className={cn(confirmSendNow && 'bg-amber-600 hover:bg-amber-700')}
            >
              {isSaving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : editCampaign ? (
                <Check className="w-3.5 h-3.5" />
              ) : confirmSendNow ? (
                <AlertTriangle className="w-3.5 h-3.5" />
              ) : form.sendMode === 'schedule' ? (
                <Calendar className="w-3.5 h-3.5" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              {editCampaign
                ? 'Salvar'
                : confirmSendNow
                  ? 'Sim, Enviar Agora'
                  : form.sendMode === 'schedule'
                    ? 'Criar & Agendar'
                    : 'Enviar Agora'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Action Menu ──────────────────────────────────────────────────────────────

interface ActionMenuProps {
  campaign: Campaign
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
  onSend: () => void
  onPause: () => void
  onResume: () => void
  onCancel: () => void
}

function ActionMenu({ campaign, onEdit, onDuplicate, onDelete, onSend, onPause, onResume, onCancel }: ActionMenuProps) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  const items: { label: string; icon: typeof Send; onClick: () => void; danger?: boolean; show: boolean }[] = [
    { label: 'Editar', icon: Pencil, onClick: onEdit, show: campaign.status === 'draft' },
    { label: 'Enviar Agora', icon: Send, onClick: onSend, show: campaign.status === 'draft' },
    { label: 'Pausar', icon: Pause, onClick: onPause, show: campaign.status === 'scheduled' },
    { label: 'Retomar', icon: Play, onClick: onResume, show: campaign.status === 'paused' },
    { label: 'Cancelar', icon: XIcon, onClick: onCancel, show: ['scheduled', 'paused'].includes(campaign.status), danger: true },
    { label: 'Duplicar', icon: Copy, onClick: onDuplicate, show: true },
    { label: 'Excluir', icon: Trash2, onClick: onDelete, show: ['draft', 'cancelled'].includes(campaign.status), danger: true },
  ]

  const visibleItems = items.filter((i) => i.show)

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, left: rect.right - 160 })
    }
    setOpen(!open)
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={handleToggle}
        className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && createPortal(
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[101] bg-white rounded-lg border border-slate-200 shadow-lg py-1 min-w-[160px]"
            style={{ top: pos.top, left: Math.max(8, pos.left) }}
          >
            {visibleItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.label}
                  onClick={() => { setOpen(false); item.onClick() }}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left transition-colors cursor-pointer',
                    item.danger
                      ? 'text-red-600 hover:bg-red-50'
                      : 'text-slate-700 hover:bg-slate-50',
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </button>
              )
            })}
          </div>
        </>,
        document.body,
      )}
    </div>
  )
}

// ── Campaign List View ───────────────────────────────────────────────────────

function CampaignListView({ showToast }: { showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const { data: campaigns = [], isLoading, refetch } = useCampaignsList()
  const { data: segments = [] } = useSegmentsList()
  const deleteCampaign = useDeleteCampaign()
  const sendCampaign = useSendCampaign()
  const pauseCampaign = usePauseCampaign()
  const cancelCampaign = useCancelCampaign()
  const resumeCampaign = useResumeCampaign()
  const duplicateCampaign = useDuplicateCampaign()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [formDialog, setFormDialog] = useState(false)
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<Campaign | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const getRecipientLabel = useCallback((c: Campaign) => {
    if (c.recipientType === 'segment' && c.segmentId) {
      const seg = segments.find((s) => s.id === c.segmentId)
      return seg ? seg.name : 'Segmento'
    }
    if (c.recipientType === 'lifecycleStage' && c.recipientFilter) {
      const opt = LIFECYCLE_FILTER_OPTIONS.find((o) => o.value === c.recipientFilter)
      return opt ? opt.label : c.recipientFilter
    }
    return 'Todos os Contatos'
  }, [segments])

  const filteredCampaigns = useMemo(() => {
    let result = campaigns
    if (statusFilter !== 'all') {
      result = result.filter((c) => c.status === statusFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        c.subject.toLowerCase().includes(q) ||
        c.templateName.toLowerCase().includes(q)
      )
    }
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [campaigns, statusFilter, search])

  const handleEdit = (c: Campaign) => {
    setEditCampaign(c)
    setFormDialog(true)
  }
  const handleNew = () => {
    setEditCampaign(null)
    setFormDialog(true)
  }
  const handleDelete = async () => {
    if (!deleteDialog) return
    try {
      await deleteCampaign.mutateAsync(deleteDialog.id)
      setDeleteDialog(null)
      showToast('Campanha excluída')
    } catch {
      showToast('Erro ao excluir', 'error')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar campanha..."
              className="pl-8 h-8 text-xs"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-botica-500"
          >
            <option value="all">Todos Status</option>
            {CAMPAIGN_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
          </Button>
          <Button size="sm" onClick={handleNew}>
            <Plus className="w-3.5 h-3.5" /> Nova Campanha
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-sm text-slate-400">Carregando campanhas...</div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="text-center py-16">
          <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-medium">Nenhuma campanha encontrada</p>
          <p className="text-xs text-slate-400 mt-1">{search || statusFilter !== 'all' ? 'Tente ajustar os filtros' : 'Crie sua primeira campanha de e-mail marketing'}</p>
          {!search && statusFilter === 'all' && (
            <Button size="sm" className="mt-4" onClick={handleNew}>
              <Plus className="w-3.5 h-3.5" /> Criar Campanha
            </Button>
          )}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Criada em</TableHead>
              <TableHead className="max-w-[200px]">Campanha</TableHead>
              <TableHead className="w-36">Agendamento</TableHead>
              <TableHead className="w-20 text-right">Destinatários</TableHead>
              <TableHead className="w-20 text-right">Entregues</TableHead>
              <TableHead className="w-20 text-right">Abertura</TableHead>
              <TableHead className="w-20 text-right">Cliques</TableHead>
              <TableHead className="w-20 text-right">Bounce</TableHead>
              <TableHead className="w-20 text-right">Descadastro</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCampaigns.map((c) => {
              const st = getStatusConfig(c.status)
              const m = c.metrics
              const openRate = m && m.delivered > 0 ? ((m.opened / m.delivered) * 100) : null
              const clickRate = m && m.delivered > 0 ? ((m.clicked / m.delivered) * 100) : null
              const bounceRate = m && m.sent > 0 ? ((m.bounced / m.sent) * 100) : null
              const unsubRate = m && m.delivered > 0 ? ((m.unsubscribed / m.delivered) * 100) : null
              return (
                <TableRow key={c.id} className={cn(actionLoading === c.id && 'opacity-50 pointer-events-none')}>
                  <TableCell>
                    <span className="text-[11px] text-slate-500 whitespace-nowrap"><FormatDateBold iso={c.createdAt} /></span>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-botica-700 text-sm hover:underline cursor-pointer truncate">{c.name}</span>
                          <span className={cn('inline-flex items-center px-1.5 py-px rounded-full text-[9px] font-medium shrink-0', st.color)}>
                            {st.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {c.scheduledAt ? (
                      <div className="text-xs text-slate-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <FormatDateBold iso={c.scheduledAt} />
                        </div>
                      </div>
                    ) : c.sentAt ? (
                      <div className="text-xs text-green-600">
                        <div className="flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <FormatDateBold iso={c.sentAt} />
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div>
                      <span className="text-lg font-bold text-slate-800">{m ? m.sent.toLocaleString('pt-BR') : '—'}</span>
                      <span className="block text-[10px] text-slate-400 mt-0.5 truncate max-w-[120px] ml-auto">{getRecipientLabel(c)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {m ? (
                      <span className={cn(
                        'text-lg font-bold',
                        m.delivered === m.sent ? 'text-green-600' : 'text-amber-600',
                      )}>
                        {m.delivered.toLocaleString('pt-BR')}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {openRate !== null ? (
                      <div>
                        <span className={cn(
                          'text-sm font-semibold',
                          openRate >= 30 ? 'text-green-600' : openRate >= 15 ? 'text-blue-600' : 'text-amber-600',
                        )}>
                          {openRate.toFixed(2).replace('.', ',')}%
                        </span>
                        <span className="block text-xs font-medium text-slate-500 mt-0.5">{m!.opened.toLocaleString('pt-BR')}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {clickRate !== null ? (
                      <div>
                        <span className={cn(
                          'text-sm font-semibold',
                          clickRate >= 5 ? 'text-green-600' : clickRate >= 2 ? 'text-blue-600' : 'text-slate-600',
                        )}>
                          {clickRate.toFixed(2).replace('.', ',')}%
                        </span>
                        <span className="block text-xs font-medium text-slate-500 mt-0.5">{m!.clicked.toLocaleString('pt-BR')}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {bounceRate !== null ? (
                      <div>
                        <span className={cn(
                          'text-sm font-semibold',
                          bounceRate > 5 ? 'text-red-600' : bounceRate > 2 ? 'text-amber-600' : 'text-slate-600',
                        )}>
                          {bounceRate.toFixed(2).replace('.', ',')}%
                        </span>
                        <span className="block text-xs font-medium text-slate-500 mt-0.5">{m!.bounced.toLocaleString('pt-BR')}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {unsubRate !== null ? (
                      <div>
                        <span className={cn(
                          'text-sm font-semibold',
                          unsubRate > 1 ? 'text-red-600' : unsubRate > 0.3 ? 'text-amber-600' : 'text-slate-600',
                        )}>
                          {unsubRate.toFixed(2).replace('.', ',')}%
                        </span>
                        <span className="block text-xs font-medium text-slate-500 mt-0.5">{m!.unsubscribed.toLocaleString('pt-BR')}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <ActionMenu
                      campaign={c}
                      onEdit={() => handleEdit(c)}
                      onDuplicate={async () => {
                        setActionLoading(c.id)
                        try {
                          await duplicateCampaign.mutateAsync(c.id)
                          showToast('Campanha duplicada')
                        } catch { showToast('Erro ao duplicar', 'error') }
                        finally { setActionLoading(null) }
                      }}
                      onDelete={() => setDeleteDialog(c)}
                      onSend={async () => {
                        setActionLoading(c.id)
                        try {
                          await sendCampaign.mutateAsync(c.id)
                          showToast('Campanha enviada')
                        } catch { showToast('Erro ao enviar', 'error') }
                        finally { setActionLoading(null) }
                      }}
                      onPause={async () => {
                        setActionLoading(c.id)
                        try {
                          await pauseCampaign.mutateAsync(c.id)
                          showToast('Campanha pausada')
                        } catch { showToast('Erro ao pausar', 'error') }
                        finally { setActionLoading(null) }
                      }}
                      onResume={async () => {
                        setActionLoading(c.id)
                        try {
                          await resumeCampaign.mutateAsync(c.id)
                          showToast('Campanha retomada')
                        } catch { showToast('Erro ao retomar', 'error') }
                        finally { setActionLoading(null) }
                      }}
                      onCancel={async () => {
                        setActionLoading(c.id)
                        try {
                          await cancelCampaign.mutateAsync(c.id)
                          showToast('Campanha cancelada')
                        } catch { showToast('Erro ao cancelar', 'error') }
                        finally { setActionLoading(null) }
                      }}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      {/* Form Dialog */}
      <CampaignFormDialog
        open={formDialog}
        onClose={() => setFormDialog(false)}
        editCampaign={editCampaign}
        campaigns={campaigns}
        showToast={showToast}
      />

      {/* Delete Confirm */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent onClose={() => setDeleteDialog(null)}>
          <DialogHeader>
            <DialogTitle>Excluir Campanha</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir <strong>{deleteDialog?.name}</strong>? Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteCampaign.isPending}>
              {deleteCampaign.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Main Page (Default: Campaign List + Tabs: E-mails | Tags | UTM) ─────────

type CampaignsTab = 'list' | 'emails' | 'utm'

export function CampaignsPage() {
  const [tab, setTab] = useState<CampaignsTab>('list')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  const tabs: { key: CampaignsTab; label: string; icon: typeof Mail }[] = [
    { key: 'emails', label: 'E-mails', icon: Mail },
    { key: 'utm', label: 'UTM', icon: Link2 },
  ]

  return (
    <div className={cn('flex flex-col', (tab === 'emails' || tab === 'utm') ? 'h-[calc(100vh-4rem-2.25rem)] -m-4 lg:-m-6' : 'space-y-4')}>
      {/* Tabs — always visible */}
      <div className={cn(
        'flex items-center gap-1 border-b border-slate-200 pb-px shrink-0',
        (tab === 'emails' || tab === 'utm') ? 'px-4 lg:px-6 pt-4 lg:pt-6' : '-mt-1',
      )}>
        {/* "Campanhas" title acts as home/list button */}
        <button
          onClick={() => setTab('list')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer',
            tab === 'list'
              ? 'border-botica-600 text-botica-700'
              : 'border-transparent text-slate-500 hover:text-slate-700',
          )}
        >
          <Megaphone className="w-4 h-4" />
          Campanhas
        </button>
        <div className="w-px h-5 bg-slate-200 mx-1" />
        {tabs.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer',
                tab === t.key
                  ? 'border-botica-600 text-botica-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700',
              )}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {tab === 'list' && (
        <div>
          <CampaignListView showToast={showToast} />
        </div>
      )}
      {tab === 'emails' && (
        <div className="flex-1 overflow-hidden">
          <TemplatesPage embedded />
        </div>
      )}
      {tab === 'utm' && (
        <div className="flex-1 overflow-auto px-4 lg:px-6 py-4">
          <UtmDefaultsTab showToast={showToast} />
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={cn(
            'fixed bottom-4 right-4 z-[200] flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium',
            toast.type === 'success' ? 'bg-botica-600 text-white' : 'bg-red-600 text-white',
          )}
        >
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}
    </div>
  )
}
