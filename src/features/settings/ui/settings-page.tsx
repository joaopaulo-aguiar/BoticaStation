import { useState, useCallback } from 'react'
import {
  Settings, Mail, Plus, Trash2, RefreshCw, CheckCircle2, XCircle, Clock,
  AlertCircle, Check,
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
  useVerifiedIdentities,
  useRequestEmailVerification,
  useDeleteVerifiedIdentity,
} from '../hooks/use-settings'

const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  Success: { icon: CheckCircle2, color: 'text-green-600', label: 'Verificado' },
  Pending: { icon: Clock, color: 'text-amber-600', label: 'Pendente' },
  Failed: { icon: XCircle, color: 'text-red-600', label: 'Falhou' },
  TemporaryFailure: { icon: AlertCircle, color: 'text-amber-600', label: 'Falha Temporária' },
  NotStarted: { icon: Clock, color: 'text-slate-400', label: 'Não Iniciado' },
}

export function SettingsPage() {
  const { data: identities = [], isLoading, refetch } = useVerifiedIdentities()
  const requestVerification = useRequestEmailVerification()
  const deleteIdentity = useDeleteVerifiedIdentity()

  const [addDialog, setAddDialog] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  const handleAddEmail = useCallback(async () => {
    const email = newEmail.trim()
    if (!email) return
    try {
      await requestVerification.mutateAsync(email)
      setNewEmail('')
      setAddDialog(false)
      showToast('Verificação solicitada! Verifique a caixa de entrada.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao solicitar verificação', 'error')
    }
  }, [newEmail, requestVerification, showToast])

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

      {/* SES Identities Section */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-botica-600" />
            <div>
              <h2 className="text-sm font-semibold text-slate-700">Amazon SES — Identidades Verificadas</h2>
              <p className="text-xs text-slate-500">E-mails e domínios verificados para envio</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className={cn('w-3.5 h-3.5 mr-1', isLoading && 'animate-spin')} />
              Atualizar
            </Button>
            <Button size="sm" onClick={() => setAddDialog(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              Adicionar E-mail
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
              Carregando identidades...
            </div>
          ) : identities.length === 0 ? (
            <div className="p-8 text-center">
              <Mail className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500 mb-1">Nenhuma identidade verificada</p>
              <p className="text-xs text-slate-400">Adicione um e-mail para começar a enviar.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Identidade</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Envio</TableHead>
                  <TableHead className="w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {identities.map((id) => {
                  const status = statusConfig[id.verificationStatus] ?? statusConfig.NotStarted
                  const StatusIcon = status.icon
                  return (
                    <TableRow key={id.identity}>
                      <TableCell className="font-medium text-sm">{id.identity}</TableCell>
                      <TableCell>
                        <Badge variant={id.type === 'Domain' ? 'default' : 'lead'}>
                          {id.type === 'Domain' ? 'Domínio' : 'E-mail'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={cn('flex items-center gap-1 text-xs font-medium', status.color)}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {status.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        {id.sendingEnabled ? (
                          <Badge variant="active">Ativo</Badge>
                        ) : (
                          <Badge variant="inactive">Inativo</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            setDeleteTarget(id.identity)
                            setDeleteDialog(true)
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Add Email Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent onClose={() => setAddDialog(false)}>
          <DialogHeader>
            <DialogTitle>Verificar Endereço de E-mail</DialogTitle>
            <DialogDescription>
              Um e-mail de verificação será enviado para o endereço informado.
              Clique no link para confirmar.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="verify-email">Endereço de E-mail</Label>
            <Input
              id="verify-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="email@exemplo.com"
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(false)}>Cancelar</Button>
            <Button
              onClick={handleAddEmail}
              disabled={!newEmail.trim() || requestVerification.isPending}
            >
              {requestVerification.isPending ? 'Enviando...' : 'Solicitar Verificação'}
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
              Tem certeza que deseja remover "{deleteTarget}"? Você não poderá mais enviar e-mails por este endereço.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteIdentity.isPending}
            >
              {deleteIdentity.isPending ? 'Removendo...' : 'Remover'}
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
