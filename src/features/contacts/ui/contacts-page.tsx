import { useState, useCallback, useMemo } from 'react'
import {
  Users, Plus, Search, Trash2, Pencil, Upload, RefreshCw,
  ChevronLeft, ChevronRight, AlertCircle, Check, X,
  AlertTriangle, Ban, ListFilter,
} from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/shared/ui/dialog'
import { cn } from '@/shared/lib/utils'
import { useAuthStore } from '@/features/auth/store/auth-store'
import {
  useContactsList,
  useCreateContact,
  useUpdateContact,
  useDeleteContact,
  useImportContacts,
} from '../hooks/use-contacts'
import { ContactFormDialog } from './contact-form-dialog'
import { ImportCsvDialog } from './import-csv-dialog'
import {
  LIFECYCLE_STAGES,
  CONTACT_STATUSES,
} from '../types'
import type {
  Contact,
  ContactFilterInput,
  ContactSortInput,
  CreateContactInput,
  UpdateContactInput,
} from '../types'

// ── Channel Health Indicators ────────────────────────────────────────────────

function EmailStatusIcon({ status, reason }: { status: string | null; reason: string | null }) {
  if (!status || status === 'active') return null
  const cfg = {
    bounced:      { icon: AlertTriangle, color: 'text-red-500', tip: `Bounce: ${reason ?? 'e-mail rejeitado'}` },
    complained:   { icon: Ban,           color: 'text-red-500', tip: `Complaint: ${reason ?? 'marcado como spam'}` },
    unsubscribed: { icon: Ban,           color: 'text-slate-400', tip: 'Descadastrado pelo contato' },
  }[status] ?? { icon: AlertCircle, color: 'text-amber-500', tip: status }
  const Icon = cfg.icon
  return (
    <span className="relative group shrink-0">
      <Icon className={cn('w-3.5 h-3.5', cfg.color)} />
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[10px] text-white shadow-lg z-50">
        {cfg.tip}
      </span>
    </span>
  )
}

function PhoneStatusIcon({ status }: { status: string | null }) {
  if (!status || status === 'active') return null
  const cfg = {
    invalid:      { icon: AlertTriangle, color: 'text-red-500', tip: 'Número inválido' },
    unsubscribed: { icon: Ban,           color: 'text-slate-400', tip: 'Descadastrado (SMS)' },
  }[status] ?? { icon: AlertCircle, color: 'text-amber-500', tip: status }
  const Icon = cfg.icon
  return (
    <span className="relative group shrink-0">
      <Icon className={cn('w-3.5 h-3.5', cfg.color)} />
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[10px] text-white shadow-lg z-50">
        {cfg.tip}
      </span>
    </span>
  )
}

// ── Contacts Page (Wrapper with Tabs) ────────────────────────────────────────

type ContactsTab = 'contacts' | 'segmentation'

export function ContactsPage() {
  const [tab, setTab] = useState<ContactsTab>('contacts')

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 border-b border-slate-200 pb-px -mt-1">
        <button
          onClick={() => setTab('contacts')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer',
            tab === 'contacts'
              ? 'border-botica-600 text-botica-700'
              : 'border-transparent text-slate-500 hover:text-slate-700',
          )}
        >
          <Users className="w-4 h-4" />
          Contatos
        </button>
        <button
          onClick={() => setTab('segmentation')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer',
            tab === 'segmentation'
              ? 'border-botica-600 text-botica-700'
              : 'border-transparent text-slate-500 hover:text-slate-700',
          )}
        >
          <ListFilter className="w-4 h-4" />
          Segmentação
        </button>
      </div>

      {tab === 'contacts' ? <ContactsListView /> : <SegmentationView />}
    </div>
  )
}

// ── Segmentation View (Placeholder) ──────────────────────────────────────────

function SegmentationView() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700">
            <ListFilter className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Segmentação</h1>
            <p className="text-xs text-slate-500">Crie segmentos para direcionar campanhas a públicos específicos</p>
          </div>
        </div>
        <Button size="sm" disabled>
          <Plus className="w-3.5 h-3.5 mr-1" />
          Novo Segmento
        </Button>
      </div>
      <div className="bg-white rounded-lg border border-slate-200 shadow-[var(--shadow-card)] p-12 text-center">
        <ListFilter className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-600 mb-1">Segmentação de Contatos</p>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Crie segmentos baseados em lifecycle stage, tags, status de e-mail, localização
          e comportamento para enviar campanhas direcionadas com maior taxa de conversão.
        </p>
      </div>
    </div>
  )
}

// ── Contacts List View ───────────────────────────────────────────────────────

function ContactsListView() {
  const userRole = useAuthStore((s) => s.userRole)

  // ── Filters & pagination ──
  const [search, setSearch] = useState('')
  const [filterLifecycle, setFilterLifecycle] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [showFilters] = useState(false)
  const [pageSize] = useState(50)
  const [nextToken, setNextToken] = useState<string | null>(null)
  const [tokenHistory, setTokenHistory] = useState<(string | null)[]>([null])
  const [sort] = useState<ContactSortInput>({ field: 'CREATED_AT', direction: 'DESC' })

  const filter = useMemo<ContactFilterInput | null>(() => {
    const f: ContactFilterInput = {}
    if (search.trim()) f.search = search.trim()
    if (filterLifecycle) f.lifecycleStage = filterLifecycle
    if (filterStatus) f.status = filterStatus
    return Object.keys(f).length ? f : null
  }, [search, filterLifecycle, filterStatus])

  const { data, isLoading } = useContactsList(pageSize, nextToken, filter, sort)
  const contacts = data?.items ?? []
  const hasNextPage = !!data?.nextToken
  const currentPageIndex = tokenHistory.indexOf(nextToken)

  // ── Mutations ──
  const createContact = useCreateContact()
  const updateContact = useUpdateContact()
  const deleteContact = useDeleteContact()
  const importContacts = useImportContacts()

  // ── Dialogs ──
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null)
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  // ── Toast ──
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  // ── Handlers ──
  const handleNew = useCallback(() => {
    setEditingContact(null)
    setFormDialogOpen(true)
  }, [])

  const handleEdit = useCallback((contact: Contact) => {
    setEditingContact(contact)
    setFormDialogOpen(true)
  }, [])

  const handleFormSave = useCallback(async (data: CreateContactInput | { id: string; input: UpdateContactInput }) => {
    try {
      if ('id' in data) {
        await updateContact.mutateAsync(data)
        showToast('Contato atualizado!')
      } else {
        await createContact.mutateAsync(data)
        showToast('Contato criado!')
      }
      setFormDialogOpen(false)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao salvar contato', 'error')
    }
  }, [createContact, updateContact, showToast])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await deleteContact.mutateAsync(deleteTarget.id)
      setDeleteDialogOpen(false)
      setDeleteTarget(null)
      showToast('Contato excluído')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao excluir', 'error')
    }
  }, [deleteTarget, deleteContact, showToast])

  const handleImport = useCallback(async (inputs: CreateContactInput[]) => {
    try {
      const result = await importContacts.mutateAsync(inputs)
      showToast(`Importação concluída: ${result.success} sucesso, ${result.failed} falhas`)
      setImportDialogOpen(false)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro na importação', 'error')
    }
  }, [importContacts, showToast])

  const handleNextPage = useCallback(() => {
    if (data?.nextToken) {
      setTokenHistory((prev) => [...prev, data.nextToken!])
      setNextToken(data.nextToken)
    }
  }, [data])

  const handlePrevPage = useCallback(() => {
    if (currentPageIndex > 0) {
      const prevToken = tokenHistory[currentPageIndex - 1]
      setNextToken(prevToken)
    }
  }, [currentPageIndex, tokenHistory])

  const handleClearFilters = useCallback(() => {
    setSearch('')
    setFilterLifecycle(null)
    setFilterStatus(null)
    setNextToken(null)
    setTokenHistory([null])
  }, [])

  const canDelete = userRole === 'ADMIN' || userRole === 'GESTOR'
  const canImport = userRole === 'ADMIN'

  // ── Render ──
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setNextToken(null); setTokenHistory([null]) }}
              placeholder="Buscar contato..."
              className="pl-8 h-8 text-xs"
            />
          </div>

          {/* Stats badges */}
          <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-500">
            <span>Total: <strong className="text-slate-700">{data?.totalCount ?? contacts.length}</strong></span>
            {contacts.length > 0 && (
              <>
                <span>Customers: <strong className="text-emerald-600">{contacts.filter(c => c.lifecycleStage === 'customer').length}</strong></span>
                <span>Leads: <strong className="text-blue-600">{contacts.filter(c => c.lifecycleStage === 'lead').length}</strong></span>
              </>
            )}
          </div>

          <div className="flex-1" />

          {/* Actions */}
          {canImport && (
            <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
              <Upload className="w-3.5 h-3.5 mr-1" />
              Importar CSV
            </Button>
          )}
          <Button size="sm" onClick={handleNew}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Novo Contato
          </Button>
        </div>

        {/* Filters row (inline, always visible when active) */}
        {(filterLifecycle || filterStatus || showFilters) && (
          <div className="flex items-center gap-4 px-4 py-2.5 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-500">Estágio:</span>
              <button
                onClick={() => setFilterLifecycle(null)}
                className={cn(
                  'px-2 py-0.5 rounded text-[11px] cursor-pointer transition-colors',
                  !filterLifecycle ? 'bg-botica-100 text-botica-700 font-medium' : 'text-slate-500 hover:bg-slate-100',
                )}
              >
                Todos
              </button>
              {LIFECYCLE_STAGES.map((ls) => (
                <button
                  key={ls.value}
                  onClick={() => { setFilterLifecycle(filterLifecycle === ls.value ? null : ls.value); setNextToken(null); setTokenHistory([null]) }}
                  className={cn(
                    'px-2 py-0.5 rounded text-[11px] cursor-pointer transition-colors',
                    filterLifecycle === ls.value ? `${ls.color} font-medium` : 'text-slate-500 hover:bg-slate-100',
                  )}
                >
                  {ls.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-500">Status:</span>
              <button
                onClick={() => setFilterStatus(null)}
                className={cn(
                  'px-2 py-0.5 rounded text-[11px] cursor-pointer transition-colors',
                  !filterStatus ? 'bg-botica-100 text-botica-700 font-medium' : 'text-slate-500 hover:bg-slate-100',
                )}
              >
                Todos
              </button>
              {CONTACT_STATUSES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => { setFilterStatus(filterStatus === s.value ? null : s.value); setNextToken(null); setTokenHistory([null]) }}
                  className={cn(
                    'px-2 py-0.5 rounded text-[11px] cursor-pointer transition-colors',
                    filterStatus === s.value ? `${s.color} font-medium` : 'text-slate-500 hover:bg-slate-100',
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <button onClick={handleClearFilters} className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer ml-auto">
              <X className="w-3 h-3 inline mr-0.5" />Limpar
            </button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Nome Completo</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">E-mail</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Telefone</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Lifecycle</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Saldo Cashback</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Status</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-slate-400">
                    <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                    Carregando contatos...
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">
                      {filter ? 'Nenhum contato encontrado com estes filtros.' : 'Nenhum contato cadastrado.'}
                    </p>
                    {!filter && (
                      <Button variant="outline" size="sm" className="mt-3" onClick={handleNew}>
                        <Plus className="w-3.5 h-3.5 mr-1" /> Novo Contato
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => {
                  const lifecycle = LIFECYCLE_STAGES.find(l => l.value === contact.lifecycleStage)
                  const statusInfo = CONTACT_STATUSES.find(s => s.value === contact.status)
                  const cashback = contact.cashbackInfo?.currentBalance ?? 0

                  return (
                    <tr
                      key={contact.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-800">{contact.fullName}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate">{contact.email}</span>
                          <EmailStatusIcon status={contact.emailStatus} reason={contact.emailFailReason} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 hidden md:table-cell font-mono text-xs">
                        {contact.phone ? (
                          <div className="flex items-center gap-1.5">
                            <span>{contact.phone}</span>
                            <PhoneStatusIcon status={contact.phoneStatus} />
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {lifecycle && (
                          <Badge className={cn('text-[11px]', lifecycle.color)}>{lifecycle.label}</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="font-mono text-sm text-slate-700">
                          R$ {cashback.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {statusInfo && (
                          <Badge className={cn('text-[11px]', statusInfo.color)}>{statusInfo.label}</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEdit(contact)}
                            className="p-1.5 rounded-md hover:bg-slate-100 cursor-pointer transition-colors text-slate-400 hover:text-slate-600"
                            title="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => { setDeleteTarget(contact); setDeleteDialogOpen(true) }}
                              className="p-1.5 rounded-md hover:bg-red-50 cursor-pointer transition-colors text-slate-400 hover:text-red-600"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100">
          <div className="text-xs text-slate-400">
            {contacts.length > 0 && (
              <span>Mostrando {contacts.length} contato{contacts.length !== 1 ? 's' : ''}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={currentPageIndex <= 0}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs text-slate-500 px-2">Página {currentPageIndex + 1}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={!hasNextPage}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Form Dialog */}
      <ContactFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        contact={editingContact}
        onSave={handleFormSave}
        isPending={createContact.isPending || updateContact.isPending}
      />

      {/* Import CSV Dialog */}
      <ImportCsvDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImport}
        isPending={importContacts.isPending}
      />

      {/* Delete Confirm */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent onClose={() => setDeleteDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Excluir Contato</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.fullName}</strong> ({deleteTarget?.email})? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleteContact.isPending}>
              {deleteContact.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
