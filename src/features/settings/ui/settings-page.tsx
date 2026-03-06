import { useState, useCallback } from 'react'
import {
  Settings, Mail, Plus, Trash2, RefreshCw, CheckCircle2, XCircle, Clock,
  AlertCircle, Check, Globe, Send, Server, Users, Shield, Key, UserPlus,
  ToggleLeft, ToggleRight, Search,
} from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'
import { Label } from '@/shared/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/shared/ui/dialog'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/shared/ui/table'
import { cn } from '@/shared/lib/utils'
import {
  useSesAccountStatus,
  useVerifiedIdentities,
  useRequestEmailVerification,
  useVerifyDomain,
  useDeleteVerifiedIdentity,
  useSenderProfiles,
  useCreateSenderProfile,
  useDeleteSenderProfile,
  useUsersList,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useResetUserPassword,
  useGroupsList,
} from '../hooks/use-settings'
import type { CognitoUser } from '../types'

// ── Constants ────────────────────────────────────────────────────────────────

const verificationStatusConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  Success: { icon: CheckCircle2, color: 'text-green-600', label: 'Verificado' },
  Pending: { icon: Clock, color: 'text-amber-600', label: 'Pendente' },
  Failed: { icon: XCircle, color: 'text-red-600', label: 'Falhou' },
  TemporaryFailure: { icon: AlertCircle, color: 'text-amber-600', label: 'Falha Temporária' },
  NotStarted: { icon: Clock, color: 'text-slate-400', label: 'Não Iniciado' },
}

const cognitoStatusLabel: Record<string, string> = {
  CONFIRMED: 'Confirmado',
  FORCE_CHANGE_PASSWORD: 'Trocar Senha',
  UNCONFIRMED: 'Não Confirmado',
}

type SesTab = 'identities' | 'senders' | 'infra'
type MainTab = 'ses' | 'users'

// ── Main Component ───────────────────────────────────────────────────────────

export function SettingsPage() {
  const [mainTab, setMainTab] = useState<MainTab>('ses')
  const [sesTab, setSesTab] = useState<SesTab>('identities')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 text-slate-700">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Configurações</h1>
          <p className="text-xs text-slate-500">Configurações do sistema e integrações</p>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        <button
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
            mainTab === 'ses'
              ? 'border-botica-600 text-botica-700'
              : 'border-transparent text-slate-500 hover:text-slate-700',
          )}
          onClick={() => setMainTab('ses')}
        >
          <Mail className="w-4 h-4" />
          Amazon SES
        </button>
        <button
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
            mainTab === 'users'
              ? 'border-botica-600 text-botica-700'
              : 'border-transparent text-slate-500 hover:text-slate-700',
          )}
          onClick={() => setMainTab('users')}
        >
          <Users className="w-4 h-4" />
          Usuários & Grupos
        </button>
      </div>

      {mainTab === 'ses' && (
        <>
          {/* SES Sub-Tabs */}
          <div className="flex gap-1 bg-slate-50 rounded-lg p-1">
            {([
              { key: 'identities' as const, icon: Mail, label: 'E-mail & Domínios' },
              { key: 'senders' as const, icon: Send, label: 'Remetentes' },
              { key: 'infra' as const, icon: Server, label: 'Infraestrutura' },
            ]).map((t) => (
              <button
                key={t.key}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-colors flex-1 justify-center',
                  sesTab === t.key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700',
                )}
                onClick={() => setSesTab(t.key)}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
          </div>

          {sesTab === 'identities' && <IdentitiesTab showToast={showToast} />}
          {sesTab === 'senders' && <SendersTab showToast={showToast} />}
          {sesTab === 'infra' && <InfraTab />}
        </>
      )}

      {mainTab === 'users' && <UsersTab showToast={showToast} />}

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

// ── Identities Tab (E-mail & Domínios) ──────────────────────────────────────

function IdentitiesTab({ showToast }: { showToast: (m: string, t?: 'success' | 'error') => void }) {
  const { data: identities = [], isLoading, refetch } = useVerifiedIdentities()
  const requestVerification = useRequestEmailVerification()
  const verifyDomain = useVerifyDomain()
  const deleteIdentity = useDeleteVerifiedIdentity()

  const [addEmailDialog, setAddEmailDialog] = useState(false)
  const [addDomainDialog, setAddDomainDialog] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newDomain, setNewDomain] = useState('')
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const emails = identities.filter((i) => i.type === 'EmailAddress')
  const domains = identities.filter((i) => i.type === 'Domain')

  const handleAddEmail = useCallback(async () => {
    const email = newEmail.trim()
    if (!email) return
    try {
      await requestVerification.mutateAsync(email)
      setNewEmail('')
      setAddEmailDialog(false)
      showToast('Verificação solicitada! Verifique a caixa de entrada.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao solicitar verificação', 'error')
    }
  }, [newEmail, requestVerification, showToast])

  const handleAddDomain = useCallback(async () => {
    const domain = newDomain.trim()
    if (!domain) return
    try {
      await verifyDomain.mutateAsync(domain)
      setNewDomain('')
      setAddDomainDialog(false)
      showToast('Domínio adicionado! Configure os registros DNS para verificar.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao verificar domínio', 'error')
    }
  }, [newDomain, verifyDomain, showToast])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await deleteIdentity.mutateAsync(deleteTarget)
      setDeleteDialog(false)
      setDeleteTarget(null)
      showToast('Identidade removida')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao remover', 'error')
    }
  }, [deleteTarget, deleteIdentity, showToast])

  const StatusBadge = ({ status }: { status: string }) => {
    const cfg = verificationStatusConfig[status] ?? verificationStatusConfig.NotStarted
    const Icon = cfg.icon
    return (
      <span className={cn('flex items-center gap-1 text-xs font-medium', cfg.color)}>
        <Icon className="w-3.5 h-3.5" />
        {cfg.label}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Domains */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-botica-600" />
            <div>
              <h2 className="text-sm font-semibold text-slate-700">Domínios Verificados</h2>
              <p className="text-xs text-slate-500">Domínios configurados para envio de e-mails</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className={cn('w-3.5 h-3.5 mr-1', isLoading && 'animate-spin')} />
              Atualizar
            </Button>
            <Button size="sm" onClick={() => setAddDomainDialog(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              Adicionar Domínio
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
              Carregando...
            </div>
          ) : domains.length === 0 ? (
            <div className="p-8 text-center">
              <Globe className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Nenhum domínio verificado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domínio</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Envio</TableHead>
                  <TableHead className="w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {domains.map((d) => (
                  <TableRow key={d.identity}>
                    <TableCell className="font-medium text-sm">{d.identity}</TableCell>
                    <TableCell><StatusBadge status={d.verificationStatus} /></TableCell>
                    <TableCell>
                      <Badge variant={d.sendingEnabled ? 'active' : 'inactive'}>
                        {d.sendingEnabled ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => { setDeleteTarget(d.identity); setDeleteDialog(true) }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Emails */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-botica-600" />
            <div>
              <h2 className="text-sm font-semibold text-slate-700">Endereços de E-mail</h2>
              <p className="text-xs text-slate-500">E-mails individuais verificados para envio</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setAddEmailDialog(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Adicionar E-mail
          </Button>
        </div>
        <div className="overflow-x-auto">
          {emails.length === 0 && !isLoading ? (
            <div className="p-8 text-center">
              <Mail className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Nenhum e-mail verificado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Envio</TableHead>
                  <TableHead className="w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emails.map((e) => (
                  <TableRow key={e.identity}>
                    <TableCell className="font-medium text-sm">{e.identity}</TableCell>
                    <TableCell><StatusBadge status={e.verificationStatus} /></TableCell>
                    <TableCell>
                      <Badge variant={e.sendingEnabled ? 'active' : 'inactive'}>
                        {e.sendingEnabled ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => { setDeleteTarget(e.identity); setDeleteDialog(true) }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Add Email Dialog */}
      <Dialog open={addEmailDialog} onOpenChange={setAddEmailDialog}>
        <DialogContent onClose={() => setAddEmailDialog(false)}>
          <DialogHeader>
            <DialogTitle>Verificar Endereço de E-mail</DialogTitle>
            <DialogDescription>
              Um e-mail de verificação será enviado para o endereço informado.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="verify-email">Endereço de E-mail</Label>
            <Input id="verify-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
              placeholder="email@exemplo.com" className="mt-1" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddEmailDialog(false)}>Cancelar</Button>
            <Button onClick={handleAddEmail} disabled={!newEmail.trim() || requestVerification.isPending}>
              {requestVerification.isPending ? 'Enviando...' : 'Solicitar Verificação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Domain Dialog */}
      <Dialog open={addDomainDialog} onOpenChange={setAddDomainDialog}>
        <DialogContent onClose={() => setAddDomainDialog(false)}>
          <DialogHeader>
            <DialogTitle>Verificar Domínio</DialogTitle>
            <DialogDescription>
              Registros DNS serão necessários para confirmar a propriedade do domínio.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="verify-domain">Domínio</Label>
            <Input id="verify-domain" type="text" value={newDomain} onChange={(e) => setNewDomain(e.target.value)}
              placeholder="exemplo.com.br" className="mt-1" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDomainDialog(false)}>Cancelar</Button>
            <Button onClick={handleAddDomain} disabled={!newDomain.trim() || verifyDomain.isPending}>
              {verifyDomain.isPending ? 'Verificando...' : 'Verificar Domínio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Identity Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent onClose={() => setDeleteDialog(false)}>
          <DialogHeader>
            <DialogTitle>Remover Identidade</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover &ldquo;{deleteTarget}&rdquo;?
              Você não poderá mais enviar e-mails por este endereço.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteIdentity.isPending}>
              {deleteIdentity.isPending ? 'Removendo...' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Senders Tab (Remetentes) ─────────────────────────────────────────────────

function SendersTab({ showToast }: { showToast: (m: string, t?: 'success' | 'error') => void }) {
  const { data: profiles = [], isLoading } = useSenderProfiles()
  const { data: identities = [] } = useVerifiedIdentities()
  const createProfile = useCreateSenderProfile()
  const deleteProfile = useDeleteSenderProfile()

  const [addDialog, setAddDialog] = useState(false)
  const [senderName, setSenderName] = useState('')
  const [senderEmail, setSenderEmail] = useState('')
  const [senderReplyTo, setSenderReplyTo] = useState('')
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const verifiedEmails = identities
    .filter((i) => i.verificationStatus === 'Success')
    .map((i) => i.identity)

  const handleCreate = useCallback(async () => {
    if (!senderName.trim() || !senderEmail.trim()) return
    try {
      await createProfile.mutateAsync({
        name: senderName.trim(),
        email: senderEmail.trim(),
        replyTo: senderReplyTo.trim() || undefined,
      })
      setSenderName('')
      setSenderEmail('')
      setSenderReplyTo('')
      setAddDialog(false)
      showToast('Remetente criado com sucesso')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao criar remetente', 'error')
    }
  }, [senderName, senderEmail, senderReplyTo, createProfile, showToast])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await deleteProfile.mutateAsync(deleteTarget.id)
      setDeleteDialog(false)
      setDeleteTarget(null)
      showToast('Remetente removido')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao remover', 'error')
    }
  }, [deleteTarget, deleteProfile, showToast])

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-botica-600" />
            <div>
              <h2 className="text-sm font-semibold text-slate-700">Perfis de Remetente</h2>
              <p className="text-xs text-slate-500">Configure nomes e e-mails de origem dos envios</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setAddDialog(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Novo Remetente
          </Button>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
              Carregando...
            </div>
          ) : profiles.length === 0 ? (
            <div className="p-8 text-center">
              <Send className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500 mb-1">Nenhum remetente configurado</p>
              <p className="text-xs text-slate-400">Crie um perfil de remetente para enviar e-mails.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Responder Para</TableHead>
                  <TableHead>Padrão</TableHead>
                  <TableHead className="w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-sm">{p.name}</TableCell>
                    <TableCell className="text-sm">{p.email}</TableCell>
                    <TableCell className="text-sm text-slate-500">{p.replyTo ?? '—'}</TableCell>
                    <TableCell>
                      {p.isDefault && <Badge variant="active">Padrão</Badge>}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => { setDeleteTarget({ id: p.id, name: p.name }); setDeleteDialog(true) }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Identities available */}
      {verifiedEmails.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-[var(--shadow-card)] p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Identidades Verificadas Disponíveis</h3>
          <div className="flex flex-wrap gap-2">
            {verifiedEmails.map((e) => (
              <Badge key={e} variant="default">{e}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Add Sender Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent onClose={() => setAddDialog(false)}>
          <DialogHeader>
            <DialogTitle>Novo Remetente</DialogTitle>
            <DialogDescription>Configure um perfil de remetente para os envios.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="sender-name">Nome do Remetente</Label>
              <Input id="sender-name" value={senderName} onChange={(e) => setSenderName(e.target.value)}
                placeholder="Botica Alternativa" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="sender-email">E-mail de Envio</Label>
              {verifiedEmails.length > 0 ? (
                <select id="sender-email" value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                  <option value="">Selecione...</option>
                  {verifiedEmails.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              ) : (
                <Input id="sender-email" type="email" value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="contato@empresa.com" className="mt-1" />
              )}
            </div>
            <div>
              <Label htmlFor="sender-reply">Responder Para (opcional)</Label>
              <Input id="sender-reply" type="email" value={senderReplyTo} onChange={(e) => setSenderReplyTo(e.target.value)}
                placeholder="suporte@empresa.com" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!senderName.trim() || !senderEmail.trim() || createProfile.isPending}>
              {createProfile.isPending ? 'Criando...' : 'Criar Remetente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Sender Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent onClose={() => setDeleteDialog(false)}>
          <DialogHeader>
            <DialogTitle>Remover Remetente</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover o remetente &ldquo;{deleteTarget?.name}&rdquo;?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteProfile.isPending}>
              {deleteProfile.isPending ? 'Removendo...' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Infra Tab ────────────────────────────────────────────────────────────────

function InfraTab() {
  const { data: status, isLoading, refetch } = useSesAccountStatus()

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-botica-600" />
            <div>
              <h2 className="text-sm font-semibold text-slate-700">Status da Conta SES</h2>
              <p className="text-xs text-slate-500">Informações da infraestrutura de envio</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className={cn('w-3.5 h-3.5 mr-1', isLoading && 'animate-spin')} />
            Atualizar
          </Button>
        </div>

        {isLoading || !status ? (
          <div className="p-8 text-center text-sm text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
            Carregando status...
          </div>
        ) : (
          <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatusCard label="Envio Habilitado" value={status.sendingEnabled ? 'Sim' : 'Não'}
              color={status.sendingEnabled ? 'text-green-600' : 'text-red-600'} />
            <StatusCard label="Acesso Produção" value={status.inSandbox ? 'Sandbox' : 'Produção'}
              color={status.inSandbox ? 'text-amber-600' : 'text-green-600'} />
            <StatusCard label="Limite 24h" value={status.max24HourSend.toLocaleString('pt-BR')} />
            <StatusCard label="Enviados 24h" value={status.sentLast24Hours.toLocaleString('pt-BR')} />
            <StatusCard label="Taxa Máxima" value={`${status.maxSendRate}/s`} />
            <StatusCard label="Config Sets" value={String(status.configSets)} />
          </div>
        )}
      </div>
    </div>
  )
}

function StatusCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={cn('text-lg font-semibold', color ?? 'text-slate-900')}>{value}</p>
    </div>
  )
}

// ── Users Tab (Cognito Users & Groups) ───────────────────────────────────────

function UsersTab({ showToast }: { showToast: (m: string, t?: 'success' | 'error') => void }) {
  const { data: users = [], isLoading: loadingUsers, refetch: refetchUsers } = useUsersList()
  const { data: groups = [], isLoading: loadingGroups } = useGroupsList()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()
  const resetPassword = useResetUserPassword()

  const [search, setSearch] = useState('')
  const [addDialog, setAddDialog] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CognitoUser | null>(null)

  // New user form
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newGroup, setNewGroup] = useState('')

  const filtered = users.filter((u) => {
    const q = search.toLowerCase()
    return !q || u.email.toLowerCase().includes(q) || (u.name ?? '').toLowerCase().includes(q)
  })

  const handleCreate = useCallback(async () => {
    if (!newEmail.trim() || !newName.trim() || !newPassword.trim() || !newGroup) return
    try {
      await createUser.mutateAsync({
        email: newEmail.trim(),
        name: newName.trim(),
        temporaryPassword: newPassword.trim(),
        group: newGroup,
      })
      setNewName('')
      setNewEmail('')
      setNewPassword('')
      setNewGroup('')
      setAddDialog(false)
      showToast('Usuário criado com sucesso')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao criar usuário', 'error')
    }
  }, [newEmail, newName, newPassword, newGroup, createUser, showToast])

  const handleToggleEnabled = useCallback(async (user: CognitoUser) => {
    try {
      await updateUser.mutateAsync({ username: user.username, input: { enabled: !user.enabled } })
      showToast(user.enabled ? 'Usuário desativado' : 'Usuário ativado')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao atualizar', 'error')
    }
  }, [updateUser, showToast])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await deleteUser.mutateAsync(deleteTarget.username)
      setDeleteDialog(false)
      setDeleteTarget(null)
      showToast('Usuário removido')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao remover', 'error')
    }
  }, [deleteTarget, deleteUser, showToast])

  const handleResetPassword = useCallback(async (username: string) => {
    try {
      await resetPassword.mutateAsync(username)
      showToast('Senha redefinida — o usuário receberá um e-mail')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao redefinir senha', 'error')
    }
  }, [resetPassword, showToast])

  return (
    <div className="space-y-6">
      {/* Groups Summary */}
      {!loadingGroups && groups.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-[var(--shadow-card)] p-6">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-botica-600" />
            <h2 className="text-sm font-semibold text-slate-700">Grupos de Acesso</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {groups.map((g) => (
              <div key={g.name} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-4 py-2.5">
                <Shield className="w-4 h-4 text-botica-600" />
                <div>
                  <p className="text-sm font-medium text-slate-900">{g.name}</p>
                  {g.description && <p className="text-xs text-slate-500">{g.description}</p>}
                </div>
                {g.precedence != null && (
                  <Badge variant="default" className="ml-2">Prioridade {g.precedence}</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-botica-600" />
            <div>
              <h2 className="text-sm font-semibold text-slate-700">Usuários do Sistema</h2>
              <p className="text-xs text-slate-500">
                {users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..." className="pl-8 h-8 w-48 text-xs" />
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchUsers()}>
              <RefreshCw className={cn('w-3.5 h-3.5 mr-1', loadingUsers && 'animate-spin')} />
              Atualizar
            </Button>
            <Button size="sm" onClick={() => setAddDialog(true)}>
              <UserPlus className="w-3.5 h-3.5 mr-1" />
              Novo Usuário
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loadingUsers ? (
            <div className="p-8 text-center text-sm text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
              Carregando usuários...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">
                {search ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="w-32">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.username}>
                    <TableCell className="font-medium text-sm">{u.name ?? '—'}</TableCell>
                    <TableCell className="text-sm">{u.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.groups.length > 0
                          ? u.groups.map((g) => <Badge key={g} variant="default">{g}</Badge>)
                          : <span className="text-xs text-slate-400">Sem grupo</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.status === 'CONFIRMED' ? 'active' : 'warning'}>
                        {cognitoStatusLabel[u.status] ?? u.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.enabled ? 'active' : 'inactive'}>
                        {u.enabled ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8"
                          title={u.enabled ? 'Desativar' : 'Ativar'}
                          onClick={() => handleToggleEnabled(u)}>
                          {u.enabled
                            ? <ToggleRight className="w-4 h-4 text-green-600" />
                            : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8"
                          title="Redefinir senha"
                          onClick={() => handleResetPassword(u.username)}>
                          <Key className="w-3.5 h-3.5 text-amber-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          title="Remover"
                          onClick={() => { setDeleteTarget(u); setDeleteDialog(true) }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Create User Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent onClose={() => setAddDialog(false)}>
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>O usuário receberá a senha temporária por e-mail.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="user-name">Nome</Label>
                <Input id="user-name" value={newName} onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nome completo" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="user-email">E-mail</Label>
                <Input id="user-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="email@exemplo.com" className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="user-pass">Senha Temporária</Label>
                <Input id="user-pass" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 caracteres" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="user-group">Grupo</Label>
                <select id="user-group" value={newGroup} onChange={(e) => setNewGroup(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                  <option value="">Selecione...</option>
                  {groups.map((g) => <option key={g.name} value={g.name}>{g.name}</option>)}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreate}
              disabled={!newName.trim() || !newEmail.trim() || !newPassword.trim() || !newGroup || createUser.isPending}>
              {createUser.isPending ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent onClose={() => setDeleteDialog(false)}>
          <DialogHeader>
            <DialogTitle>Remover Usuário</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover &ldquo;{deleteTarget?.name ?? deleteTarget?.email}&rdquo;?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteUser.isPending}>
              {deleteUser.isPending ? 'Removendo...' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
