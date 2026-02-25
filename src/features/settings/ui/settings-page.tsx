import { useState, useEffect } from 'react'
import {
  Settings,
  Save,
  RotateCcw,
  Database,
  HardDrive,
  CheckCircle2,
  Globe,
  Mail,
  Plus,
  Trash2,
  RefreshCw,
  Loader2,
  AlertCircle,
  Shield,
  Copy,
  ChevronDown,
  ChevronUp,
  Pencil,
  X,
  Star,
} from 'lucide-react'
import { Button, Input, Label, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui'
import {
  useSettingsStore,
  type S3BucketConfig,
  type DynamoTableConfig,
  type SenderProfile,
} from '@/features/settings/store/settings-store'
import {
  useAllIdentities,
  useIdentityDetail,
  useCreateIdentity,
  useDeleteIdentity,
} from '@/features/settings/hooks/use-ses-identities'
import { getDkimRecords } from '@/features/settings/api/ses-identity-api'
import { v4 as uuidv4 } from 'uuid'

export function SettingsPage() {
  const {
    settings,
    updateS3Bucket,
    updateCampaignTable,
    addSenderProfile,
    updateSenderProfile,
    removeSenderProfile,
    resetToDefaults,
  } = useSettingsStore()

  // ── S3 Bucket config ─────────────────────────────────────────────────
  const [s3Arn, setS3Arn] = useState(settings.s3Bucket.bucketArn)
  const [s3Region, setS3Region] = useState(settings.s3Bucket.region)
  const [s3Saved, setS3Saved] = useState(false)

  // ── DynamoDB Campaign table config ───────────────────────────────────
  const [tableName, setTableName] = useState(settings.campaignAnalyticsTable.tableName)
  const [tableRegion, setTableRegion] = useState(settings.campaignAnalyticsTable.region)
  const [tableSaved, setTableSaved] = useState(false)

  // ── SES Identities ──────────────────────────────────────────────────
  const { data: identities, isLoading: identitiesLoading, refetch: refetchIdentities } = useAllIdentities()
  const createIdentityMutation = useCreateIdentity()
  const deleteIdentityMutation = useDeleteIdentity()
  const [newIdentityDialogOpen, setNewIdentityDialogOpen] = useState(false)
  const [newIdentityValue, setNewIdentityValue] = useState('')
  const [deleteIdentityDialogOpen, setDeleteIdentityDialogOpen] = useState(false)
  const [deleteIdentityTarget, setDeleteIdentityTarget] = useState<string | null>(null)
  const [expandedIdentity, setExpandedIdentity] = useState<string | null>(null)
  const identityDetailQuery = useIdentityDetail(expandedIdentity)

  // ── Sender Profiles ──────────────────────────────────────────────────
  const [senderDialogOpen, setSenderDialogOpen] = useState(false)
  const [editingSenderId, setEditingSenderId] = useState<string | null>(null)
  const [senderLabel, setSenderLabel] = useState('')
  const [senderEmail, setSenderEmail] = useState('')
  const [senderDisplayName, setSenderDisplayName] = useState('')
  const [senderReplyTo, setSenderReplyTo] = useState('')
  const [senderIsDefault, setSenderIsDefault] = useState(false)

  // Sync when store changes externally
  useEffect(() => {
    setS3Arn(settings.s3Bucket.bucketArn)
    setS3Region(settings.s3Bucket.region)
    setTableName(settings.campaignAnalyticsTable.tableName)
    setTableRegion(settings.campaignAnalyticsTable.region)
  }, [settings])

  const handleSaveS3 = () => {
    const config: S3BucketConfig = {
      bucketArn: s3Arn.trim(),
      region: s3Region.trim() || 'sa-east-1',
    }
    updateS3Bucket(config)
    setS3Saved(true)
    setTimeout(() => setS3Saved(false), 2000)
  }

  const handleSaveTable = () => {
    const config: DynamoTableConfig = {
      tableName: tableName.trim(),
      region: tableRegion.trim() || 'sa-east-1',
    }
    updateCampaignTable(config)
    setTableSaved(true)
    setTimeout(() => setTableSaved(false), 2000)
  }

  const handleReset = () => {
    if (window.confirm('Restaurar todas as configurações para os valores padrão?')) {
      resetToDefaults()
    }
  }

  const handleCreateIdentity = async () => {
    if (!newIdentityValue.trim()) return
    await createIdentityMutation.mutateAsync(newIdentityValue.trim())
    setNewIdentityDialogOpen(false)
    setNewIdentityValue('')
  }

  const handleDeleteIdentity = async () => {
    if (!deleteIdentityTarget) return
    await deleteIdentityMutation.mutateAsync(deleteIdentityTarget)
    setDeleteIdentityDialogOpen(false)
    setDeleteIdentityTarget(null)
    if (expandedIdentity === deleteIdentityTarget) setExpandedIdentity(null)
  }

  const handleToggleIdentityDetail = (name: string) => {
    setExpandedIdentity(expandedIdentity === name ? null : name)
  }

  const resetSenderForm = () => {
    setSenderLabel('')
    setSenderEmail('')
    setSenderDisplayName('')
    setSenderReplyTo('')
    setSenderIsDefault(false)
    setEditingSenderId(null)
  }

  const handleOpenAddSender = () => {
    resetSenderForm()
    setSenderDialogOpen(true)
  }

  const handleEditSender = (p: SenderProfile) => {
    setEditingSenderId(p.id)
    setSenderLabel(p.label)
    setSenderEmail(p.email)
    setSenderDisplayName(p.displayName)
    setSenderReplyTo(p.replyTo || '')
    setSenderIsDefault(p.isDefault || false)
    setSenderDialogOpen(true)
  }

  const handleSaveSender = () => {
    if (!senderLabel.trim() || !senderEmail.trim()) return
    if (editingSenderId) {
      updateSenderProfile(editingSenderId, {
        label: senderLabel,
        email: senderEmail,
        displayName: senderDisplayName,
        replyTo: senderReplyTo || undefined,
        isDefault: senderIsDefault,
      })
    } else {
      addSenderProfile({
        id: uuidv4(),
        label: senderLabel,
        email: senderEmail,
        displayName: senderDisplayName,
        replyTo: senderReplyTo || undefined,
        isDefault: senderIsDefault,
      })
    }
    resetSenderForm()
    setSenderDialogOpen(false)
  }

  const AWS_REGIONS = [
    'us-east-1',
    'us-east-2',
    'us-west-1',
    'us-west-2',
    'sa-east-1',
    'eu-west-1',
    'eu-west-2',
    'eu-central-1',
    'ap-southeast-1',
    'ap-southeast-2',
    'ap-northeast-1',
  ]

  const domainIdentities = identities?.filter((i) => i.type === 'DOMAIN') ?? []
  const emailIdentities = identities?.filter((i) => i.type === 'EMAIL_ADDRESS') ?? []

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-200 text-slate-700">
          <Settings className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">Configurações</h1>
          <p className="text-xs text-slate-500">Configurações do sistema, integrações AWS e domínios SES</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="w-4 h-4" />
          Restaurar Padrão
        </Button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── SES Domain / Identity Configuration ──────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-green-100 text-green-700">
            <Globe className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-slate-900">Seus Domínios — AWS SES</h2>
            <p className="text-xs text-slate-500">
              Gerencie domínios e endereços de e-mail verificados para envio de campanhas
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchIdentities()}
            disabled={identitiesLoading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${identitiesLoading ? 'animate-spin' : ''}`} />
            Verificar alterações
          </Button>
        </div>

        <div className="p-5 space-y-6">
          {/* ── Domain Identities ─────────────────────────────────────── */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Domínios
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Prefira usar nos registros sempre o nome de seu site ou sua marca. Isso deixa suas ofertas
              mais confiáveis e garante o funcionamento dos links do seu email.
            </p>

            {identitiesLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            ) : domainIdentities.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">Nenhum domínio configurado.</p>
            ) : (
              <div className="space-y-2">
                {domainIdentities.map((id) => (
                  <div key={id.identity} className="border border-slate-200 rounded-lg">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          id.verificationStatus === 'SUCCESS'
                            ? 'bg-green-100 text-green-600'
                            : id.verificationStatus === 'PENDING'
                              ? 'bg-amber-100 text-amber-600'
                              : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {id.verificationStatus === 'SUCCESS' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <span className="flex-1 text-sm font-medium text-slate-800">{id.identity}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          id.sendingEnabled
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {id.sendingEnabled ? 'Envio habilitado' : 'Pendente'}
                      </span>
                      <button
                        onClick={() => handleToggleIdentityDetail(id.identity)}
                        className="p-1 rounded hover:bg-slate-100 text-slate-400 cursor-pointer"
                      >
                        {expandedIdentity === id.identity ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setDeleteIdentityTarget(id.identity)
                          setDeleteIdentityDialogOpen(true)
                        }}
                        className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Expanded DKIM details */}
                    {expandedIdentity === id.identity && identityDetailQuery.data && (
                      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
                        {identityDetailQuery.isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4 text-slate-500" />
                              <span className="text-xs font-medium text-slate-700">
                                DKIM: {identityDetailQuery.data.dkimAttributes?.status ?? 'N/A'}
                              </span>
                            </div>

                            {identityDetailQuery.data.dkimTokens &&
                              identityDetailQuery.data.dkimTokens.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-slate-600 mb-2">
                                    Registros DKIM (CNAME) para configurar no DNS:
                                  </p>
                                  <div className="space-y-2">
                                    {getDkimRecords(
                                      id.identity,
                                      identityDetailQuery.data.dkimTokens,
                                    ).map((rec, i) => (
                                      <div
                                        key={i}
                                        className="bg-white rounded border border-slate-200 p-2 text-[11px] font-mono"
                                      >
                                        <div className="flex items-start gap-1">
                                          <span className="text-slate-400 flex-shrink-0">Nome:</span>
                                          <span className="text-slate-700 break-all">{rec.name}</span>
                                          <button
                                            onClick={() => navigator.clipboard.writeText(rec.name)}
                                            className="ml-auto p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer flex-shrink-0"
                                            title="Copiar"
                                          >
                                            <Copy className="w-3 h-3" />
                                          </button>
                                        </div>
                                        <div className="flex items-start gap-1 mt-1">
                                          <span className="text-slate-400 flex-shrink-0">Valor:</span>
                                          <span className="text-slate-700 break-all">{rec.value}</span>
                                          <button
                                            onClick={() => navigator.clipboard.writeText(rec.value)}
                                            className="ml-auto p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer flex-shrink-0"
                                            title="Copiar"
                                          >
                                            <Copy className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                            {identityDetailQuery.data.mailFromDomain && (
                              <div className="text-xs text-slate-600">
                                <span className="font-medium">MAIL FROM:</span>{' '}
                                {identityDetailQuery.data.mailFromDomain} (
                                {identityDetailQuery.data.mailFromStatus})
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Email Identities ──────────────────────────────────────── */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Email
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Enviar emails com o nome da sua marca ou site como remetente previne que eles sejam
              marcados como spam, além de garantir que os links contidos neles funcionem corretamente.
            </p>

            {emailIdentities.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">Nenhum endereço de e-mail configurado.</p>
            ) : (
              <div className="space-y-2">
                {emailIdentities.map((id) => (
                  <div
                    key={id.identity}
                    className="flex items-center gap-3 px-4 py-3 border border-slate-200 rounded-lg"
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        id.verificationStatus === 'SUCCESS'
                          ? 'bg-green-100 text-green-600'
                          : 'bg-amber-100 text-amber-600'
                      }`}
                    >
                      {id.verificationStatus === 'SUCCESS' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <span className="flex-1 text-sm font-medium text-slate-800">{id.identity}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        id.sendingEnabled
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {id.sendingEnabled ? 'Verificado' : 'Pendente'}
                    </span>
                    <button
                      onClick={() => {
                        setDeleteIdentityTarget(id.identity)
                        setDeleteIdentityDialogOpen(true)
                      }}
                      className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add identity button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNewIdentityDialogOpen(true)}
            className="text-green-700 border-green-300 hover:bg-green-50"
          >
            <Plus className="w-4 h-4" />
            Adicionar novo domínio ou e-mail
          </Button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── Sender Profiles (Remetentes) ────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-blue-100 text-blue-700">
            <Mail className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-slate-900">Remetentes de E-mail</h2>
            <p className="text-xs text-slate-500">
              Configure perfis de remetentes para usar nas campanhas. Cada remetente deve ser de um
              domínio ou e-mail verificado acima.
            </p>
          </div>
          <Button size="sm" onClick={handleOpenAddSender}>
            <Plus className="w-4 h-4" />
            Novo Remetente
          </Button>
        </div>

        <div className="p-5">
          {settings.ses.senderProfiles.length === 0 ? (
            <div className="text-center py-6 text-slate-400">
              <Mail className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs">Nenhum remetente configurado.</p>
              <p className="text-[10px] mt-1">
                Adicione um perfil de remetente para usar nas campanhas de e-mail.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {settings.ses.senderProfiles.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-4 py-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800">{p.label}</span>
                      {p.isDefault && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5" /> Padrão
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {p.displayName ? `${p.displayName} <${p.email}>` : p.email}
                      {p.replyTo && ` • Reply-to: ${p.replyTo}`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleEditSender(p)}
                    className="p-1.5 rounded hover:bg-slate-200 text-slate-400 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => removeSenderProfile(p.id)}
                    className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── S3 Bucket Config ──────────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-amber-100 text-amber-700">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Bucket S3 — Templates</h2>
            <p className="text-xs text-slate-500">
              Bucket utilizado para backup e versionamento dos templates de e-mail
            </p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-slate-700">ARN ou Nome do Bucket</Label>
              <Input
                value={s3Arn}
                onChange={(e) => setS3Arn(e.target.value)}
                placeholder="arn:aws:s3:::meu-bucket ou meu-bucket"
                className="mt-1 font-mono text-xs"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Ex: arn:aws:s3:::templates-botica ou templates-botica
              </p>
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-700">Região</Label>
              <select
                value={s3Region}
                onChange={(e) => setS3Region(e.target.value)}
                className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-botica-500"
              >
                {AWS_REGIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="text-xs text-slate-400">
              {s3Arn && (
                <span>
                  Bucket: <strong className="text-slate-600 font-mono">{s3Arn.replace('arn:aws:s3:::', '')}</strong>
                  {' '}• Região: <strong className="text-slate-600">{s3Region}</strong>
                </span>
              )}
            </div>
            <Button size="sm" onClick={handleSaveS3}>
              {s3Saved ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-100" />
                  Salvo
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Salvar
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ── DynamoDB table — Campaign Analytics ───────────────────────── */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-blue-100 text-blue-700">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">DynamoDB — Campanhas</h2>
            <p className="text-xs text-slate-500">
              Tabela com dados de campanhas, envios, aberturas, cliques e bounces
            </p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-slate-700">Nome da Tabela</Label>
              <Input
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                placeholder="Campaigns"
                className="mt-1 font-mono text-xs"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Tabela DynamoDB para armazenar campanhas e métricas
              </p>
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-700">Região</Label>
              <select
                value={tableRegion}
                onChange={(e) => setTableRegion(e.target.value)}
                className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-botica-500"
              >
                {AWS_REGIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="text-xs text-slate-400">
              {tableName ? (
                <span>
                  Tabela: <strong className="text-slate-600 font-mono">{tableName}</strong>
                  {' '}• Região: <strong className="text-slate-600">{tableRegion}</strong>
                </span>
              ) : (
                <span className="text-amber-500">Tabela não configurada — Campanhas não serão salvas</span>
              )}
            </div>
            <Button size="sm" onClick={handleSaveTable}>
              {tableSaved ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-100" />
                  Salvo
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Salvar
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Info card ──────────────────────────────────────────────────── */}
      <div className="bg-botica-50 rounded-lg border border-botica-200 p-4">
        <p className="text-xs text-botica-800 leading-relaxed">
          <strong>Nota:</strong> As credenciais AWS (Access Key, Secret Key e Session Token)
          são gerenciadas na tela de login via MFA/STS e aplicadas automaticamente a todas
          as integrações. As configurações acima definem apenas os recursos (buckets, tabelas
          e identidades SES) que o sistema utiliza.
        </p>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── Dialogs ──────────────────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════ */}

      {/* New Identity Dialog */}
      <Dialog open={newIdentityDialogOpen} onOpenChange={setNewIdentityDialogOpen}>
        <DialogContent onClose={() => setNewIdentityDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Adicionar Identidade SES</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Insira um domínio (ex: <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">boticaalternativa.com.br</code>)
              ou um endereço de e-mail (ex: <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">contato@boticaalternativa.com.br</code>).
            </p>
            <div>
              <Label className="text-xs">Domínio ou E-mail</Label>
              <Input
                value={newIdentityValue}
                onChange={(e) => setNewIdentityValue(e.target.value)}
                placeholder="dominio.com.br ou email@dominio.com.br"
                className="mt-1"
              />
            </div>
            <div className="bg-blue-50 rounded-md p-3 text-xs text-blue-700">
              <strong>Domínio:</strong> Após criar, configure os registros DKIM no DNS.
              <br />
              <strong>E-mail:</strong> Um e-mail de verificação será enviado ao endereço informado.
            </div>
            {createIdentityMutation.isError && (
              <div className="flex items-center gap-2 p-2 bg-red-50 rounded text-xs text-red-600">
                <AlertCircle className="w-3.5 h-3.5" />
                {createIdentityMutation.error instanceof Error
                  ? createIdentityMutation.error.message
                  : 'Erro ao criar identidade'}
              </div>
            )}
            {createIdentityMutation.isSuccess && (
              <div className="p-2 bg-green-50 rounded text-xs text-green-600">
                Identidade criada com sucesso!
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNewIdentityDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleCreateIdentity}
              disabled={createIdentityMutation.isPending || !newIdentityValue.trim()}
            >
              {createIdentityMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Identity Dialog */}
      <Dialog open={deleteIdentityDialogOpen} onOpenChange={setDeleteIdentityDialogOpen}>
        <DialogContent onClose={() => setDeleteIdentityDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Apagar Identidade</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Tem certeza que deseja remover <strong>"{deleteIdentityTarget}"</strong>?
            Não será mais possível enviar e-mails a partir dessa identidade.
          </p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteIdentityDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteIdentity}
              disabled={deleteIdentityMutation.isPending}
            >
              {deleteIdentityMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
              Apagar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sender Profile Dialog */}
      <Dialog open={senderDialogOpen} onOpenChange={setSenderDialogOpen}>
        <DialogContent onClose={() => setSenderDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>
              {editingSenderId ? 'Editar Remetente' : 'Novo Remetente'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nome do perfil</Label>
              <Input
                value={senderLabel}
                onChange={(e) => setSenderLabel(e.target.value)}
                placeholder="Ex: Marketing, Transacional, Newsletter"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">E-mail do remetente</Label>
              <Input
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="desperte@boticaalternativa.com.br"
                className="mt-1"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Deve ser de um domínio ou e-mail verificado no SES acima
              </p>
            </div>
            <div>
              <Label className="text-xs">Nome de exibição</Label>
              <Input
                value={senderDisplayName}
                onChange={(e) => setSenderDisplayName(e.target.value)}
                placeholder="Botica Alternativa"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Reply-To (opcional)</Label>
              <Input
                value={senderReplyTo}
                onChange={(e) => setSenderReplyTo(e.target.value)}
                placeholder="contato@boticaalternativa.com.br"
                className="mt-1"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={senderIsDefault}
                onChange={(e) => setSenderIsDefault(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span className="text-xs text-slate-700">Definir como remetente padrão</span>
            </label>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetSenderForm()
                setSenderDialogOpen(false)
              }}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveSender}
              disabled={!senderLabel.trim() || !senderEmail.trim()}
            >
              <Save className="w-3.5 h-3.5" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
