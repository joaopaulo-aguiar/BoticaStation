/**
 * Campaigns Page — RD Station-style email campaign management.
 *
 * Features:
 * - Tab-based list: Enviados, Rascunhos, Agendados
 * - Search, date range filter, sort options
 * - Table with campaign metrics
 * - Row actions: view email, statistics, duplicate, delete
 * - Create / Edit campaign dialog
 * - Campaign detail statistics view
 * - Send campaign flow
 */
import { useState, useMemo, useCallback } from 'react'
import {
  Send,
  Plus,
  Search,
  RefreshCw,
  MoreVertical,
  Eye,
  BarChart3,
  Copy,
  Trash2,
  Loader2,
  AlertCircle,
  Calendar,
  ArrowUpDown,
  Mail,
  Pencil,
  Rocket,
  X,
  FileText,
  ChevronDown,
  Filter,
  CheckCircle2,
} from 'lucide-react'
import {
  Button,
  Input,
  Label,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui'
import {
  useCampaigns,
  useCampaign,
  useCreateCampaign,
  useUpdateCampaign,
  useDeleteCampaign,
  useDuplicateCampaign,
  useSendCampaign,
  useRecipientsByTags,
} from '../hooks/use-campaigns'
import { useTemplates, useVerifiedIdentities } from '@/features/templates/hooks/use-templates'
import { CampaignStatsView } from './campaign-stats'
import type { Campaign, CampaignFormData, CampaignStatus } from '../types'

// ─── Constants ───────────────────────────────────────────────────────────────

type TabId = 'sent' | 'draft' | 'scheduled'

const TABS: { id: TabId; label: string; statuses: CampaignStatus[] }[] = [
  { id: 'sent', label: 'Enviados', statuses: ['sent', 'sending'] },
  { id: 'draft', label: 'Rascunhos', statuses: ['draft'] },
  { id: 'scheduled', label: 'Agendados', statuses: ['scheduled'] },
]

type SortField = 'sentAt' | 'name' | 'stats.selected' | 'stats.opened'
type PageView = 'list' | 'stats' | 'create' | 'edit' | 'preview'

const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: 'Rascunho',
  scheduled: 'Agendado',
  sending: 'Enviando',
  sent: 'Enviado',
  cancelled: 'Cancelado',
}

const STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  scheduled: 'bg-blue-100 text-blue-700',
  sending: 'bg-amber-100 text-amber-700',
  sent: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CampaignsPage() {
  // ── View state ───────────────────────────────────────────────────────────
  const [view, setView] = useState<PageView>('list')
  const [activeTab, setActiveTab] = useState<TabId>('sent')
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('sentAt')
  const [sortAsc, setSortAsc] = useState(false)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)

  // ── Dialog state ─────────────────────────────────────────────────────────
  const [contextMenu, setContextMenu] = useState<{ campaign: Campaign; x: number; y: number } | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null)
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false)
  const [duplicateTarget, setDuplicateTarget] = useState<Campaign | null>(null)
  const [duplicateName, setDuplicateName] = useState('')
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [sendTarget, setSendTarget] = useState<Campaign | null>(null)

  // ── Form state for create/edit ───────────────────────────────────────────
  const [formName, setFormName] = useState('')
  const [formSubject, setFormSubject] = useState('')
  const [formTemplateName, setFormTemplateName] = useState('')
  const [formSenderEmail, setFormSenderEmail] = useState('')
  const [formSenderName, setFormSenderName] = useState('')
  const [formReplyTo, setFormReplyTo] = useState('')
  const [formRecipientTags, setFormRecipientTags] = useState<string[]>([])
  const [formTagInput, setFormTagInput] = useState('')
  const [formScheduledAt, setFormScheduledAt] = useState('')
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null)

  // ── Queries & Mutations ──────────────────────────────────────────────────
  const { data: campaigns, isLoading, error, refetch } = useCampaigns()
  const selectedCampaignQuery = useCampaign(selectedCampaignId)
  const { data: templates } = useTemplates()
  const { data: identities } = useVerifiedIdentities()

  const createMutation = useCreateCampaign()
  const updateMutation = useUpdateCampaign()
  const deleteMutation = useDeleteCampaign()
  const duplicateMutation = useDuplicateCampaign()
  const sendMutation = useSendCampaign()

  const recipientQuery = useRecipientsByTags(
    sendTarget?.recipientTags ?? [],
    !!sendTarget,
  )

  const isSaving = createMutation.isPending || updateMutation.isPending

  // ── Filtered & sorted campaigns ──────────────────────────────────────────
  const filteredCampaigns = useMemo(() => {
    if (!campaigns) return []
    const tab = TABS.find((t) => t.id === activeTab)!
    let list = campaigns.filter((c) => tab.statuses.includes(c.status))
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.subject.toLowerCase().includes(q))
    }
    // Sort
    list.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'sentAt':
          cmp =
            new Date(a.sentAt || a.scheduledAt || a.createdAt).getTime() -
            new Date(b.sentAt || b.scheduledAt || b.createdAt).getTime()
          break
        case 'name':
          cmp = a.name.localeCompare(b.name)
          break
        case 'stats.selected':
          cmp = a.stats.selected - b.stats.selected
          break
        case 'stats.opened':
          cmp =
            (a.stats.sent ? a.stats.opened / a.stats.sent : 0) -
            (b.stats.sent ? b.stats.opened / b.stats.sent : 0)
          break
      }
      return sortAsc ? cmp : -cmp
    })
    return list
  }, [campaigns, activeTab, search, sortField, sortAsc])

  const tabCounts = useMemo(() => {
    if (!campaigns) return { sent: 0, draft: 0, scheduled: 0 }
    return {
      sent: campaigns.filter((c) => c.status === 'sent' || c.status === 'sending').length,
      draft: campaigns.filter((c) => c.status === 'draft').length,
      scheduled: campaigns.filter((c) => c.status === 'scheduled').length,
    }
  }, [campaigns])

  // ── Handlers ─────────────────────────────────────────────────────────────

  const resetForm = () => {
    setFormName('')
    setFormSubject('')
    setFormTemplateName('')
    setFormSenderEmail('')
    setFormSenderName('')
    setFormReplyTo('')
    setFormRecipientTags([])
    setFormTagInput('')
    setFormScheduledAt('')
    setEditingCampaignId(null)
  }

  const handleCreateNew = () => {
    resetForm()
    setView('create')
  }

  const handleEdit = (c: Campaign) => {
    setFormName(c.name)
    setFormSubject(c.subject)
    setFormTemplateName(c.templateName || '')
    setFormSenderEmail(c.senderEmail)
    setFormSenderName(c.senderName || '')
    setFormReplyTo(c.replyTo || '')
    setFormRecipientTags(c.recipientTags)
    setFormScheduledAt(c.scheduledAt || '')
    setEditingCampaignId(c.id)
    setView('edit')
  }

  const handleSaveForm = async () => {
    if (!formName.trim() || !formSubject.trim() || !formSenderEmail) return

    const data: CampaignFormData = {
      name: formName,
      subject: formSubject,
      templateName: formTemplateName || undefined,
      senderEmail: formSenderEmail,
      senderName: formSenderName || undefined,
      replyTo: formReplyTo || undefined,
      recipientTags: formRecipientTags,
      scheduledAt: formScheduledAt || undefined,
    }

    if (editingCampaignId) {
      await updateMutation.mutateAsync({ id: editingCampaignId, data })
    } else {
      await createMutation.mutateAsync(data)
    }
    resetForm()
    setView('list')
  }

  const handleViewStats = (c: Campaign) => {
    setSelectedCampaignId(c.id)
    setView('stats')
    setContextMenu(null)
  }

  const handleDelete = (c: Campaign) => {
    setDeleteTarget(c)
    setDeleteDialogOpen(true)
    setContextMenu(null)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    await deleteMutation.mutateAsync(deleteTarget.id)
    setDeleteDialogOpen(false)
    setDeleteTarget(null)
  }

  const handleDuplicate = (c: Campaign) => {
    setDuplicateTarget(c)
    setDuplicateName(`${c.name} (cópia)`)
    setDuplicateDialogOpen(true)
    setContextMenu(null)
  }

  const confirmDuplicate = async () => {
    if (!duplicateTarget || !duplicateName.trim()) return
    await duplicateMutation.mutateAsync({ id: duplicateTarget.id, newName: duplicateName })
    setDuplicateDialogOpen(false)
    setDuplicateTarget(null)
    setDuplicateName('')
  }

  const handleOpenSendDialog = (c: Campaign) => {
    setSendTarget(c)
    setSendDialogOpen(true)
    setContextMenu(null)
  }

  const confirmSend = async () => {
    if (!sendTarget || !recipientQuery.data?.length) return
    await sendMutation.mutateAsync({
      campaignId: sendTarget.id,
      emails: recipientQuery.data,
    })
    setSendDialogOpen(false)
    setSendTarget(null)
  }

  const handleContextMenu = (e: React.MouseEvent, c: Campaign) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ campaign: c, x: e.clientX, y: e.clientY })
  }

  const handleAddTag = () => {
    const tag = formTagInput.trim()
    if (tag && !formRecipientTags.includes(tag)) {
      setFormRecipientTags([...formRecipientTags, tag])
    }
    setFormTagInput('')
  }

  const handleRemoveTag = (tag: string) => {
    setFormRecipientTags(formRecipientTags.filter((t) => t !== tag))
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc)
    else {
      setSortField(field)
      setSortAsc(false)
    }
  }

  // Close context menu on click outside
  const handlePageClick = useCallback(() => {
    if (contextMenu) setContextMenu(null)
  }, [contextMenu])

  // ─── Stats view ──────────────────────────────────────────────────────────
  if (view === 'stats' && selectedCampaignQuery.data) {
    return (
      <CampaignStatsView
        campaign={selectedCampaignQuery.data}
        onBack={() => {
          setView('list')
          setSelectedCampaignId(null)
        }}
      />
    )
  }

  // ─── Create / Edit form ──────────────────────────────────────────────────
  if (view === 'create' || view === 'edit') {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              resetForm()
              setView('list')
            }}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {view === 'create' ? 'Criar Email' : 'Editar Campanha'}
            </h1>
            <p className="text-xs text-slate-500">
              {view === 'create' ? 'Configure os detalhes da nova campanha' : `Editando: ${formName}`}
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="p-6 space-y-5">
            {/* Name */}
            <div>
              <Label className="text-xs font-medium text-slate-700">Nome da Campanha</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Promo | Final de Semana | 25-02-26"
                className="mt-1"
              />
            </div>

            {/* Subject */}
            <div>
              <Label className="text-xs font-medium text-slate-700">Assunto do E-mail</Label>
              <Input
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                placeholder="Ex: Última Oportunidade de fim de semana"
                className="mt-1"
              />
            </div>

            {/* Template */}
            <div>
              <Label className="text-xs font-medium text-slate-700">Template SES (opcional)</Label>
              <select
                value={formTemplateName}
                onChange={(e) => setFormTemplateName(e.target.value)}
                className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-botica-500"
              >
                <option value="">Sem template (HTML direto)</option>
                {templates?.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Se escolher um template, o e-mail usará o HTML do template SES
              </p>
            </div>

            {/* Sender */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium text-slate-700">Remetente (e-mail)</Label>
                {identities && identities.length > 0 ? (
                  <select
                    value={formSenderEmail}
                    onChange={(e) => setFormSenderEmail(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-botica-500"
                  >
                    <option value="">Selecione...</option>
                    {identities.map((id) => (
                      <option key={id.identity} value={id.identity}>
                        {id.identity} ({id.type})
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    value={formSenderEmail}
                    onChange={(e) => setFormSenderEmail(e.target.value)}
                    placeholder="desperte@boticaalternativa.com.br"
                    className="mt-1"
                  />
                )}
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-700">Nome do Remetente</Label>
                <Input
                  value={formSenderName}
                  onChange={(e) => setFormSenderName(e.target.value)}
                  placeholder="Botica Alternativa"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Reply-to */}
            <div>
              <Label className="text-xs font-medium text-slate-700">Reply-To (opcional)</Label>
              <Input
                value={formReplyTo}
                onChange={(e) => setFormReplyTo(e.target.value)}
                placeholder="contato@boticaalternativa.com.br"
                className="mt-1"
              />
            </div>

            {/* Recipient tags */}
            <div>
              <Label className="text-xs font-medium text-slate-700">
                Tags dos destinatários (segmentação)
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={formTagInput}
                  onChange={(e) => setFormTagInput(e.target.value)}
                  placeholder="Adicionar tag..."
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddTag()
                    }
                  }}
                />
                <Button variant="outline" size="sm" onClick={handleAddTag}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formRecipientTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {formRecipientTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-botica-100 text-botica-700"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-red-600 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-slate-400 mt-1">
                Deixe vazio para enviar a todos os contatos ativos com opt-in
              </p>
            </div>

            {/* Schedule */}
            <div>
              <Label className="text-xs font-medium text-slate-700">
                Agendamento (opcional)
              </Label>
              <Input
                type="datetime-local"
                value={formScheduledAt}
                onChange={(e) => setFormScheduledAt(e.target.value)}
                className="mt-1 w-auto"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Deixe vazio para salvar como rascunho
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-lg">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetForm()
                setView('list')
              }}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveForm}
              disabled={isSaving || !formName.trim() || !formSubject.trim() || !formSenderEmail}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {view === 'create' ? 'Criar Campanha' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ─── List view (main) ────────────────────────────────────────────────────
  return (
    <div className="space-y-4" onClick={handlePageClick}>
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 text-blue-700">
          <Send className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">Email</h1>
          <p className="text-xs text-slate-500">Gestão de campanhas de email marketing</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button size="sm" onClick={handleCreateNew}>
            <Plus className="w-4 h-4" />
            Criar Email
          </Button>
        </div>
      </div>

      {/* Search & Filters bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Button variant="outline" size="sm" className="h-9 gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          Período
          <ChevronDown className="w-3 h-3" />
        </Button>
        <Button variant="outline" size="sm" className="h-9 gap-1.5">
          <Filter className="w-3.5 h-3.5" />
          Filtros
          <ChevronDown className="w-3 h-3" />
        </Button>
        <div className="ml-auto flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => handleSort('sentAt')}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            Data de envio
            <ChevronDown className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-slate-200">
        {TABS.map((tab) => {
          const count = tabCounts[tab.id]
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Campaign Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 p-6 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">Erro ao carregar campanhas</span>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Mail className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm font-medium text-slate-500">
              {search ? 'Nenhuma campanha encontrada' : 'Nenhuma campanha nessa categoria'}
            </p>
            <p className="text-xs mt-1">
              {activeTab === 'draft' ? 'Crie uma nova campanha para começar' : ''}
            </p>
            {activeTab === 'draft' && (
              <Button size="sm" className="mt-4" onClick={handleCreateNew}>
                <Plus className="w-4 h-4" />
                Criar Email
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider min-w-[280px]">
                    Nome do Email
                  </th>
                  <th
                    className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-600 whitespace-nowrap"
                    onClick={() => handleSort('sentAt')}
                  >
                    <span className="inline-flex items-center gap-1">
                      Data de Envio
                      <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th
                    className="text-center px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-600"
                    onClick={() => handleSort('stats.selected')}
                  >
                    Selecionados
                  </th>
                  <th
                    className="text-center px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-600"
                    onClick={() => handleSort('stats.opened')}
                  >
                    Abertura
                  </th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Cliques
                  </th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Bounces
                  </th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Spam
                  </th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Descadastros
                  </th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-12">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.map((c) => {
                  const openRate = c.stats.sent ? ((c.stats.opened / c.stats.sent) * 100).toFixed(2) : '0,00'
                  const clickRate = c.stats.sent ? ((c.stats.clicked / c.stats.sent) * 100).toFixed(2) : '0,00'
                  const bounceRate = c.stats.sent ? ((c.stats.bounced / c.stats.sent) * 100).toFixed(2) : '0,00'
                  const spamRate = c.stats.sent ? ((c.stats.complained / c.stats.sent) * 100).toFixed(2) : '0,00'
                  const unsubRate = c.stats.sent
                    ? ((c.stats.unsubscribed / c.stats.sent) * 100).toFixed(2)
                    : '0,00'

                  const dateStr = c.sentAt
                    ? `${new Date(c.sentAt).toLocaleDateString('pt-BR')} ${new Date(c.sentAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                    : c.scheduledAt
                      ? `${new Date(c.scheduledAt).toLocaleDateString('pt-BR')} ${new Date(c.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                      : '–'

                  return (
                    <tr
                      key={c.id}
                      className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <button
                          className="text-blue-600 hover:text-blue-800 hover:underline font-medium text-left cursor-pointer"
                          onClick={() => handleViewStats(c)}
                        >
                          {c.name}
                        </button>
                      </td>
                      <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{dateStr}</td>
                      <td className="px-3 py-3 text-center text-slate-700 font-medium">
                        {c.stats.selected.toLocaleString('pt-BR')}
                        {c.status === 'sent' && (
                          <span className="ml-1 text-green-500">
                            <CheckCircle2 className="w-3.5 h-3.5 inline" />
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center text-slate-600">
                        {openRate.replace('.', ',')}%
                      </td>
                      <td className="px-3 py-3 text-center text-slate-600">
                        {clickRate.replace('.', ',')}%
                      </td>
                      <td className="px-3 py-3 text-center text-slate-600">
                        {bounceRate.replace('.', ',')}%
                      </td>
                      <td className="px-3 py-3 text-center text-slate-600">
                        {spamRate.replace('.', ',')}%
                      </td>
                      <td className="px-3 py-3 text-center text-slate-600">
                        {unsubRate.replace('.', ',')}%
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={(e) => handleContextMenu(e, c)}
                          className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Context Menu ──────────────────────────────────────────────────── */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[180px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.campaign.status === 'sent' && (
            <button
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
              onClick={() => handleViewStats(contextMenu.campaign)}
            >
              <BarChart3 className="w-3.5 h-3.5" /> Estatísticas
            </button>
          )}
          {(contextMenu.campaign.status === 'draft' || contextMenu.campaign.status === 'scheduled') && (
            <>
              <button
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
                onClick={() => {
                  handleEdit(contextMenu.campaign)
                  setContextMenu(null)
                }}
              >
                <Pencil className="w-3.5 h-3.5" /> Editar
              </button>
              <button
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-green-700 hover:bg-green-50 cursor-pointer"
                onClick={() => handleOpenSendDialog(contextMenu.campaign)}
              >
                <Rocket className="w-3.5 h-3.5" /> Enviar agora
              </button>
            </>
          )}
          <button
            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
            onClick={() => handleDuplicate(contextMenu.campaign)}
          >
            <Copy className="w-3.5 h-3.5" /> Duplicar
          </button>
          <div className="border-t border-slate-100 my-1" />
          <button
            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 cursor-pointer"
            onClick={() => handleDelete(contextMenu.campaign)}
          >
            <Trash2 className="w-3.5 h-3.5" /> Excluir
          </button>
        </div>
      )}

      {/* ── Delete dialog ─────────────────────────────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent onClose={() => setDeleteDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Excluir Campanha</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Tem certeza que deseja excluir a campanha{' '}
            <strong>"{deleteTarget?.name}"</strong>? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Duplicate dialog ──────────────────────────────────────────────── */}
      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent onClose={() => setDuplicateDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Duplicar Campanha</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Duplicando: <strong>{duplicateTarget?.name}</strong>
            </p>
            <div>
              <Label className="text-xs">Nome da nova campanha</Label>
              <Input
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
                placeholder="Nome da cópia"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDuplicateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={confirmDuplicate}
              disabled={duplicateMutation.isPending || !duplicateName.trim()}
            >
              {duplicateMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
              Duplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Send confirmation dialog ──────────────────────────────────────── */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent onClose={() => setSendDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Enviar Campanha</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Enviar campanha <strong>"{sendTarget?.name}"</strong>?
            </p>
            {recipientQuery.isLoading && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Calculando destinatários...
              </div>
            )}
            {recipientQuery.data && (
              <div className="bg-blue-50 rounded-md p-3 text-sm text-blue-800">
                <strong>{recipientQuery.data.length.toLocaleString('pt-BR')}</strong> destinatários
                serão notificados.
              </div>
            )}
            {sendMutation.isError && (
              <div className="flex items-center gap-2 p-2 bg-red-50 rounded text-xs text-red-600">
                <AlertCircle className="w-3.5 h-3.5" />
                {sendMutation.error instanceof Error ? sendMutation.error.message : 'Erro ao enviar'}
              </div>
            )}
            {sendMutation.isSuccess && (
              <div className="p-2 bg-green-50 rounded text-xs text-green-600">
                Campanha enviada com sucesso!
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSendDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={confirmSend}
              disabled={sendMutation.isPending || !recipientQuery.data?.length}
            >
              {sendMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Rocket className="w-3.5 h-3.5" />
              )}
              Enviar Agora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
