import { useState, useCallback, useMemo, useEffect } from 'react'
import {
  Megaphone, FileText, Plus, Search, Trash2, RefreshCw, Send,
  AlertCircle, Check, Calendar, Pause, XCircle,
  Pencil, Play, BarChart3, Mail, MessageSquare, Phone, ChevronRight,
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
import { TemplatesPage } from '@/features/templates'
import { useTemplatesList, useTemplateDetail } from '@/features/templates/hooks/use-templates'
import { useSenderProfiles, useDefaultConfigurationSet, useConfigurationSets } from '@/features/settings/hooks/use-settings'
import {
  useCampaignsList,
  useCreateCampaign,
  useUpdateCampaign,
  useDeleteCampaign,
  useSendCampaign,
  usePauseCampaign,
  useCancelCampaign,
} from '../hooks/use-campaigns'
import { CAMPAIGN_STATUSES } from '../types'
import type { Campaign, CreateCampaignInput, CampaignStatus } from '../types'

// ── Main Page ────────────────────────────────────────────────────────────────

type CampaignTab = 'emails' | 'campaigns'

export function CampaignsPage() {
  const [tab, setTab] = useState<CampaignTab>('campaigns')

  if (tab === 'emails') {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem-2.25rem)] -m-4 lg:-m-6">
        <div className="px-4 lg:px-6 pt-4 lg:pt-6">
          <TabHeader tab={tab} onTabChange={setTab} />
        </div>
        <div className="flex-1 min-h-0">
          <TemplatesPage embedded />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <TabHeader tab={tab} onTabChange={setTab} />
      <CampaignsTab />
    </div>
  )
}

// ── Tab Header ───────────────────────────────────────────────────────────────

function TabHeader({ tab, onTabChange }: { tab: CampaignTab; onTabChange: (t: CampaignTab) => void }) {
  return (
    <div className="flex items-center gap-1 mb-4 border-b border-slate-200 pb-px">
      <button
        onClick={() => onTabChange('campaigns')}
        className={cn(
          'flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer',
          tab === 'campaigns'
            ? 'border-botica-600 text-botica-700'
            : 'border-transparent text-slate-500 hover:text-slate-700',
        )}
      >
        <Megaphone className="w-4 h-4" />
        Campanhas
      </button>
      <button
        onClick={() => onTabChange('emails')}
        className={cn(
          'flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer',
          tab === 'emails'
            ? 'border-botica-600 text-botica-700'
            : 'border-transparent text-slate-500 hover:text-slate-700',
        )}
      >
        <FileText className="w-4 h-4" />
        E-mails
      </button>
    </div>
  )
}

// ── Status helpers ───────────────────────────────────────────────────────────

const statusIcon: Record<CampaignStatus, typeof Send> = {
  draft: Pencil,
  scheduled: Calendar,
  sending: Send,
  sent: Check,
  paused: Pause,
  cancelled: XCircle,
}

function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const cfg = CAMPAIGN_STATUSES.find((s) => s.value === status) ?? CAMPAIGN_STATUSES[0]
  const Icon = statusIcon[status] ?? Pencil
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', cfg.color)}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  )
}

// ── Channel type ─────────────────────────────────────────────────────────────

type CampaignChannel = 'email' | 'sms' | 'whatsapp'

const CHANNELS: { value: CampaignChannel; label: string; icon: typeof Mail; enabled: boolean; desc: string }[] = [
  { value: 'email', label: 'E-mail', icon: Mail, enabled: true, desc: 'Envie e-mails em massa usando templates SES' },
  { value: 'sms', label: 'SMS', icon: Phone, enabled: false, desc: 'Envie mensagens SMS — em breve' },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, enabled: false, desc: 'Envie via WhatsApp Business — em breve' },
]

// ── Campaigns Tab ────────────────────────────────────────────────────────────

function CampaignsTab() {
  const { data: campaigns = [], isLoading, refetch } = useCampaignsList()
  const { data: templates = [] } = useTemplatesList()
  const { data: senderProfiles = [] } = useSenderProfiles()
  const { data: defaultConfigSet } = useDefaultConfigurationSet()
  const { data: configSets = [] } = useConfigurationSets()
  const createCampaign = useCreateCampaign()
  const updateCampaign = useUpdateCampaign()
  const deleteCampaign = useDeleteCampaign()
  const sendCampaignMut = useSendCampaign()
  const pauseCampaignMut = usePauseCampaign()
  const cancelCampaignMut = useCancelCampaign()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [createDialog, setCreateDialog] = useState(false)
  const [editDialog, setEditDialog] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [detailDialog, setDetailDialog] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)

  // Create form
  const [formChannel, setFormChannel] = useState<CampaignChannel | null>(null)
  const [formName, setFormName] = useState('')
  const [formSubject, setFormSubject] = useState('')
  const [formTemplate, setFormTemplate] = useState('')
  const [formSender, setFormSender] = useState('')
  const [formRecipients, setFormRecipients] = useState('all')
  const [formScheduledAt, setFormScheduledAt] = useState('')
  const [formConfigSet, setFormConfigSet] = useState('')

  // Fetch subject from selected template
  const { data: selectedTemplateDetail } = useTemplateDetail(formTemplate || null)

  // Auto-fill subject when template is selected
  useEffect(() => {
    if (selectedTemplateDetail?.subject) {
      setFormSubject(selectedTemplateDetail.subject)
    }
  }, [selectedTemplateDetail?.subject])

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const filtered = useMemo(() => {
    return campaigns.filter((c) => {
      const q = search.toLowerCase()
      const matchesSearch = !q || c.name.toLowerCase().includes(q) || c.subject.toLowerCase().includes(q)
      const matchesStatus = !statusFilter || c.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [campaigns, search, statusFilter])

  const resetForm = useCallback(() => {
    setFormChannel(null)
    setFormName('')
    setFormSubject('')
    setFormTemplate('')
    setFormSender(senderProfiles[0]?.id ?? '')
    setFormRecipients('all')
    setFormScheduledAt('')
    setFormConfigSet('')
  }, [senderProfiles])

  const handleCreate = useCallback(async () => {
    if (!formName.trim() || !formTemplate || !formSender) return
    const subjectToUse = formSubject || selectedTemplateDetail?.subject || ''
    if (!subjectToUse) return
    try {
      const input: CreateCampaignInput = {
        name: formName.trim(),
        subject: subjectToUse,
        templateName: formTemplate,
        senderProfileId: formSender,
        recipientFilter: formRecipients || 'all',
        scheduledAt: formScheduledAt || undefined,
        configurationSet: formConfigSet || defaultConfigSet || undefined,
      }
      await createCampaign.mutateAsync(input)
      resetForm()
      setCreateDialog(false)
      showToast('Campanha criada com sucesso')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao criar campanha', 'error')
    }
  }, [formName, formSubject, formTemplate, formSender, formRecipients, formScheduledAt, formConfigSet, defaultConfigSet, selectedTemplateDetail, createCampaign, resetForm, showToast])

  const handleEdit = useCallback(async () => {
    if (!selectedCampaign) return
    const subjectToUse = formSubject || selectedTemplateDetail?.subject || ''
    try {
      await updateCampaign.mutateAsync({
        id: selectedCampaign.id,
        input: {
          name: formName.trim() || undefined,
          subject: subjectToUse || undefined,
          templateName: formTemplate || undefined,
          senderProfileId: formSender || undefined,
          recipientFilter: formRecipients || undefined,
          scheduledAt: formScheduledAt || undefined,
          configurationSet: formConfigSet || undefined,
        },
      })
      setEditDialog(false)
      setSelectedCampaign(null)
      showToast('Campanha atualizada')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao atualizar', 'error')
    }
  }, [selectedCampaign, formName, formSubject, formTemplate, formSender, formRecipients, formScheduledAt, formConfigSet, selectedTemplateDetail, updateCampaign, showToast])

  const handleDelete = useCallback(async () => {
    if (!selectedCampaign) return
    try {
      await deleteCampaign.mutateAsync(selectedCampaign.id)
      setDeleteDialog(false)
      setSelectedCampaign(null)
      showToast('Campanha removida')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao remover', 'error')
    }
  }, [selectedCampaign, deleteCampaign, showToast])

  const handleSend = useCallback(async (campaign: Campaign) => {
    try {
      await sendCampaignMut.mutateAsync(campaign.id)
      showToast('Campanha enviada para processamento')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao enviar', 'error')
    }
  }, [sendCampaignMut, showToast])

  const handlePause = useCallback(async (campaign: Campaign) => {
    try {
      await pauseCampaignMut.mutateAsync(campaign.id)
      showToast('Campanha pausada')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao pausar', 'error')
    }
  }, [pauseCampaignMut, showToast])

  const handleCancel = useCallback(async (campaign: Campaign) => {
    try {
      await cancelCampaignMut.mutateAsync(campaign.id)
      showToast('Campanha cancelada')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao cancelar', 'error')
    }
  }, [cancelCampaignMut, showToast])

  const openEdit = useCallback((c: Campaign) => {
    setSelectedCampaign(c)
    setFormName(c.name)
    setFormSubject(c.subject)
    setFormTemplate(c.templateName)
    setFormSender(c.senderProfileId)
    setFormRecipients(c.recipientFilter ?? 'all')
    setFormScheduledAt(c.scheduledAt ?? '')
    setFormConfigSet(c.configurationSet ?? '')
    setEditDialog(true)
  }, [])

  const openDetail = useCallback((c: Campaign) => {
    setSelectedCampaign(c)
    setDetailDialog(true)
  }, [])

  const getTemplateName = useCallback((templateName: string) => {
    const t = templates.find((tpl) => tpl.name === templateName)
    return t?.displayName ?? templateName
  }, [templates])

  const getSenderName = useCallback((profileId: string) => {
    const p = senderProfiles.find((s) => s.id === profileId)
    return p ? `${p.name} <${p.email}>` : profileId
  }, [senderProfiles])

  const formatDate = (d: string | null) => {
    if (!d) return '—'
    return new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-botica-100 text-botica-700">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Campanhas</h1>
            <p className="text-xs text-slate-500">
              {campaigns.length} campanha{campaigns.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className={cn('w-3.5 h-3.5 mr-1', isLoading && 'animate-spin')} />
            Atualizar
          </Button>
          <Button size="sm" onClick={() => { resetForm(); setCreateDialog(true) }}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Nova Campanha
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar campanhas..."
            className="pl-8 h-8 text-xs"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs"
        >
          <option value="">Todos os status</option>
          {CAMPAIGN_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-[var(--shadow-card)]">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center text-sm text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
              Carregando campanhas...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500 mb-1">
                {search || statusFilter ? 'Nenhuma campanha encontrada' : 'Nenhuma campanha criada'}
              </p>
              <p className="text-xs text-slate-400">
                {!search && !statusFilter && 'Crie sua primeira campanha para enviar e-mails em massa.'}
              </p>
              {!search && !statusFilter && (
                <Button size="sm" className="mt-3" onClick={() => { resetForm(); setCreateDialog(true) }}>
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Nova Campanha
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campanha</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Agendamento</TableHead>
                  <TableHead>Métricas</TableHead>
                  <TableHead className="w-36">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-slate-50" onClick={() => openDetail(c)}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{c.name}</p>
                        <p className="text-xs text-slate-500 truncate max-w-[250px]">{c.subject}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-600">{getTemplateName(c.templateName)}</span>
                    </TableCell>
                    <TableCell>
                      <CampaignStatusBadge status={c.status as CampaignStatus} />
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-500">
                        {c.scheduledAt ? formatDate(c.scheduledAt) : c.sentAt ? formatDate(c.sentAt) : '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {c.metrics ? (
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="text-slate-500" title="Enviados">{c.metrics.sent} env</span>
                          <span className="text-green-600" title="Abertos">{c.metrics.opened} ab</span>
                          <span className="text-blue-600" title="Cliques">{c.metrics.clicked} cl</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {c.status === 'draft' && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Enviar"
                              onClick={() => handleSend(c)}>
                              <Play className="w-3.5 h-3.5 text-green-600" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar"
                              onClick={() => openEdit(c)}>
                              <Pencil className="w-3.5 h-3.5 text-slate-500" />
                            </Button>
                          </>
                        )}
                        {c.status === 'scheduled' && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Cancelar"
                            onClick={() => handleCancel(c)}>
                            <XCircle className="w-3.5 h-3.5 text-red-500" />
                          </Button>
                        )}
                        {c.status === 'sending' && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Pausar"
                            onClick={() => handlePause(c)}>
                            <Pause className="w-3.5 h-3.5 text-amber-600" />
                          </Button>
                        )}
                        {c.status === 'sent' && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Ver métricas"
                            onClick={() => openDetail(c)}>
                            <BarChart3 className="w-3.5 h-3.5 text-botica-600" />
                          </Button>
                        )}
                        {(c.status === 'draft' || c.status === 'cancelled') && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="Remover" onClick={() => { setSelectedCampaign(c); setDeleteDialog(true) }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Create Campaign Dialog */}
      <Dialog open={createDialog} onOpenChange={(open) => { setCreateDialog(open); if (!open) setFormChannel(null) }}>
        <DialogContent onClose={() => { setCreateDialog(false); setFormChannel(null) }} className={formChannel ? 'max-w-2xl' : 'max-w-lg'}>
          {!formChannel ? (
            <>
              <DialogHeader>
                <DialogTitle>Nova Campanha</DialogTitle>
                <DialogDescription>Selecione o canal de comunicação para sua campanha.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-3 gap-3 py-2">
                {CHANNELS.map((ch) => (
                  <button
                    key={ch.value}
                    disabled={!ch.enabled}
                    onClick={() => setFormChannel(ch.value)}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-lg border-2 p-5 text-center transition-all cursor-pointer',
                      ch.enabled
                        ? 'border-slate-200 hover:border-botica-400 hover:bg-botica-50'
                        : 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed',
                    )}
                  >
                    <ch.icon className={cn('w-7 h-7', ch.enabled ? 'text-botica-600' : 'text-slate-400')} />
                    <span className="text-sm font-semibold text-slate-800">{ch.label}</span>
                    <span className="text-[10px] text-slate-500 leading-tight">{ch.desc}</span>
                    {ch.enabled && <ChevronRight className="w-4 h-4 text-botica-400 mt-1" />}
                    {!ch.enabled && <span className="text-[9px] text-slate-400 font-medium uppercase mt-1">Em breve</span>}
                  </button>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialog(false)}>Cancelar</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <button onClick={() => setFormChannel(null)} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                    <Mail className="w-5 h-5" />
                  </button>
                  <div>
                    <DialogTitle>Nova Campanha de E-mail</DialogTitle>
                    <DialogDescription>Preencha os dados abaixo para criar sua campanha.</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <CampaignForm
                name={formName} onNameChange={setFormName}
                subject={formSubject}
                templateName={formTemplate} onTemplateChange={setFormTemplate}
                senderProfileId={formSender} onSenderChange={setFormSender}
                recipientFilter={formRecipients} onRecipientsChange={setFormRecipients}
                scheduledAt={formScheduledAt} onScheduledAtChange={setFormScheduledAt}
                configurationSet={formConfigSet} onConfigSetChange={setFormConfigSet}
                templates={templates}
                senderProfiles={senderProfiles}
                configSets={configSets}
                defaultConfigSet={defaultConfigSet ?? null}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setFormChannel(null)}>Voltar</Button>
                <Button onClick={handleCreate}
                  disabled={!formName.trim() || !formTemplate || !formSender || createCampaign.isPending}>
                  {createCampaign.isPending ? 'Criando...' : 'Criar Campanha'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Campaign Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent onClose={() => setEditDialog(false)} className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Campanha</DialogTitle>
            <DialogDescription>Altere os detalhes da campanha.</DialogDescription>
          </DialogHeader>
          <CampaignForm
            name={formName} onNameChange={setFormName}
            subject={formSubject}
            templateName={formTemplate} onTemplateChange={setFormTemplate}
            senderProfileId={formSender} onSenderChange={setFormSender}
            recipientFilter={formRecipients} onRecipientsChange={setFormRecipients}
            scheduledAt={formScheduledAt} onScheduledAtChange={setFormScheduledAt}
            configurationSet={formConfigSet} onConfigSetChange={setFormConfigSet}
            templates={templates}
            senderProfiles={senderProfiles}
            configSets={configSets}
            defaultConfigSet={defaultConfigSet ?? null}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={updateCampaign.isPending}>
              {updateCampaign.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Campaign Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent onClose={() => setDeleteDialog(false)}>
          <DialogHeader>
            <DialogTitle>Remover Campanha</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover a campanha &ldquo;{selectedCampaign?.name}&rdquo;? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteCampaign.isPending}>
              {deleteCampaign.isPending ? 'Removendo...' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Campaign Detail Dialog */}
      <Dialog open={detailDialog} onOpenChange={setDetailDialog}>
        <DialogContent onClose={() => setDetailDialog(false)} className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedCampaign?.name}</DialogTitle>
          </DialogHeader>
          {selectedCampaign && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Assunto</p>
                  <p className="font-medium">{selectedCampaign.subject}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <CampaignStatusBadge status={selectedCampaign.status as CampaignStatus} />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Template</p>
                  <p>{getTemplateName(selectedCampaign.templateName)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Remetente</p>
                  <p className="truncate">{getSenderName(selectedCampaign.senderProfileId)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Destinatários</p>
                  <p>{selectedCampaign.recipientFilter === 'all' ? 'Todos os contatos' : selectedCampaign.recipientFilter ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Configuration Set</p>
                  <p>{selectedCampaign.configurationSet ?? 'Padrão da conta'}</p>
                </div>
                {selectedCampaign.scheduledAt && (
                  <div>
                    <p className="text-xs text-slate-500">Agendado para</p>
                    <p>{formatDate(selectedCampaign.scheduledAt)}</p>
                  </div>
                )}
                {selectedCampaign.sentAt && (
                  <div>
                    <p className="text-xs text-slate-500">Enviado em</p>
                    <p>{formatDate(selectedCampaign.sentAt)}</p>
                  </div>
                )}
              </div>

              {/* Metrics */}
              {selectedCampaign.metrics && (
                <div className="border-t border-slate-100 pt-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4" />
                    Métricas de Envio
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    <MetricCard label="Enviados" value={selectedCampaign.metrics.sent} />
                    <MetricCard label="Entregues" value={selectedCampaign.metrics.delivered} color="text-green-600" />
                    <MetricCard label="Abertos" value={selectedCampaign.metrics.opened} color="text-blue-600" />
                    <MetricCard label="Cliques" value={selectedCampaign.metrics.clicked} color="text-indigo-600" />
                    <MetricCard label="Bounces" value={selectedCampaign.metrics.bounced} color="text-red-600" />
                    <MetricCard label="Complaints" value={selectedCampaign.metrics.complained} color="text-red-600" />
                    <MetricCard label="Descadastros" value={selectedCampaign.metrics.unsubscribed} color="text-amber-600" />
                    {selectedCampaign.metrics.sent > 0 && (
                      <MetricCard
                        label="Taxa Abertura"
                        value={`${((selectedCampaign.metrics.opened / selectedCampaign.metrics.sent) * 100).toFixed(1)}%`}
                        color="text-botica-600"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialog(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast */}
      {toast && (
        <div
          className={cn(
            'fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg transition-all',
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white',
          )}
        >
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}
    </div>
  )
}

// ── Campaign Form ────────────────────────────────────────────────────────────

function CampaignForm({
  name, onNameChange,
  subject,
  templateName, onTemplateChange,
  senderProfileId, onSenderChange,
  recipientFilter, onRecipientsChange,
  scheduledAt, onScheduledAtChange,
  configurationSet, onConfigSetChange,
  templates,
  senderProfiles,
  configSets,
  defaultConfigSet,
}: {
  name: string; onNameChange: (v: string) => void
  subject: string
  templateName: string; onTemplateChange: (v: string) => void
  senderProfileId: string; onSenderChange: (v: string) => void
  recipientFilter: string; onRecipientsChange: (v: string) => void
  scheduledAt: string; onScheduledAtChange: (v: string) => void
  configurationSet: string; onConfigSetChange: (v: string) => void
  templates: { name: string; displayName: string }[]
  senderProfiles: { id: string; name: string; email: string }[]
  configSets: string[]
  defaultConfigSet: string | null
}) {
  const [templateSearch, setTemplateSearch] = useState('')
  const [templateDropdownOpen, setTemplateDropdownOpen] = useState(false)

  const filteredTemplates = useMemo(() => {
    if (!templateSearch) return templates
    const q = templateSearch.toLowerCase()
    return templates.filter((t) => t.displayName.toLowerCase().includes(q) || t.name.toLowerCase().includes(q))
  }, [templates, templateSearch])

  const selectedTemplateName = templates.find((t) => t.name === templateName)?.displayName ?? ''

  return (
    <div className="space-y-4">
      {/* Campaign Name */}
      <div>
        <Label htmlFor="campaign-name" className="text-sm font-medium">Nome da Campanha</Label>
        <Input id="campaign-name" value={name} onChange={(e) => onNameChange(e.target.value)}
          placeholder="Ex: Newsletter Março 2026" className="mt-1.5 h-10" />
      </div>

      {/* Template with search */}
      <div>
        <Label className="text-sm font-medium">Template de E-mail</Label>
        <div className="relative mt-1.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={templateDropdownOpen ? templateSearch : selectedTemplateName}
              onChange={(e) => { setTemplateSearch(e.target.value); setTemplateDropdownOpen(true) }}
              onFocus={() => setTemplateDropdownOpen(true)}
              placeholder="Buscar template..."
              className="w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-botica-500 focus:border-transparent"
            />
          </div>
          {templateDropdownOpen && (
            <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
              {filteredTemplates.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-slate-400">
                  {templates.length === 0 ? 'Crie um template na aba E-mails primeiro.' : 'Nenhum template encontrado'}
                </div>
              ) : (
                filteredTemplates.map((t) => (
                  <button
                    key={t.name}
                    onClick={() => { onTemplateChange(t.name); setTemplateSearch(''); setTemplateDropdownOpen(false) }}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm hover:bg-botica-50 transition-colors flex items-center gap-2 cursor-pointer',
                      t.name === templateName && 'bg-botica-50 text-botica-700 font-medium',
                    )}
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{t.displayName}</span>
                    {t.name === templateName && <Check className="w-3.5 h-3.5 text-botica-600 ml-auto flex-shrink-0" />}
                  </button>
                ))
              )}
            </div>
          )}
          {/* Close dropdown on outside click */}
          {templateDropdownOpen && (
            <div className="fixed inset-0 z-10" onClick={() => setTemplateDropdownOpen(false)} />
          )}
        </div>
        {templates.length === 0 && (
          <p className="text-[10px] text-amber-600 mt-1">Crie um template na aba E-mails primeiro.</p>
        )}
      </div>

      {/* Subject (read-only, from template) */}
      {subject && (
        <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wide mb-0.5">Assunto do E-mail</p>
          <p className="text-sm text-slate-800">{subject}</p>
        </div>
      )}

      {/* Sender selection — card style */}
      <div>
        <Label className="text-sm font-medium">Remetente</Label>
        {senderProfiles.length === 0 ? (
          <p className="text-xs text-amber-600 mt-1">Configure um perfil de remetente em Configurações.</p>
        ) : (
          <div className="mt-1.5 space-y-1.5">
            {senderProfiles.map((s) => (
              <button
                key={s.id}
                onClick={() => onSenderChange(s.id)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-lg border-2 px-3 py-2.5 text-left transition-all cursor-pointer',
                  s.id === senderProfileId
                    ? 'border-botica-500 bg-botica-50'
                    : 'border-slate-200 hover:border-slate-300',
                )}
              >
                <div className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold',
                  s.id === senderProfileId ? 'bg-botica-600 text-white' : 'bg-slate-200 text-slate-600',
                )}>
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{s.name}</p>
                  <p className="text-xs text-slate-500 truncate">{s.email}</p>
                </div>
                {s.id === senderProfileId && <Check className="w-4 h-4 text-botica-600 flex-shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Recipients & Scheduling */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="campaign-recipients" className="text-sm font-medium">Destinatários</Label>
          <select id="campaign-recipients" value={recipientFilter} onChange={(e) => onRecipientsChange(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm">
            <option value="all">Todos os contatos</option>
            <option value="active">Contatos ativos</option>
            <option value="lead">Leads</option>
            <option value="subscriber">Subscribers</option>
            <option value="customer">Customers</option>
          </select>
        </div>
        <div>
          <Label htmlFor="campaign-schedule" className="text-sm font-medium">Agendar envio <span className="text-slate-400 font-normal">(opcional)</span></Label>
          <Input id="campaign-schedule" type="datetime-local" value={scheduledAt}
            onChange={(e) => onScheduledAtChange(e.target.value)} className="mt-1.5 h-10" />
        </div>
      </div>

      {/* Configuration Set */}
      <div>
        <Label htmlFor="campaign-configset" className="text-sm font-medium">Configuration Set</Label>
        <select id="campaign-configset" value={configurationSet} onChange={(e) => onConfigSetChange(e.target.value)}
          className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm">
          <option value="">{defaultConfigSet ? `Padrão: ${defaultConfigSet}` : 'Nenhum (padrão da conta)'}</option>
          {configSets.map((cs) => (
            <option key={cs} value={cs}>{cs}</option>
          ))}
        </select>
        <p className="text-[10px] text-slate-400 mt-0.5">
          Se não selecionado, será usado o configuration set padrão definido nas configurações.
        </p>
      </div>
    </div>
  )
}

// ── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-center">
      <p className="text-[10px] text-slate-500 mb-0.5">{label}</p>
      <p className={cn('text-sm font-semibold', color ?? 'text-slate-900')}>{value}</p>
    </div>
  )
}
