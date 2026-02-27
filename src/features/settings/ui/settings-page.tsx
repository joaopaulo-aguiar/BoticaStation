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
  Star,
  Activity,
  BarChart3,
  Ban,
  Layers,
  Info,
} from 'lucide-react'
import {
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui'
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
  useSesAccount,
  useConfigurationSets,
  useSuppressedDestinations,
} from '@/features/settings/hooks/use-ses-identities'
import { getDkimRecords } from '@/features/settings/api/ses-identity-api'
import type { SesIdentityDetail } from '@/features/settings/api/ses-identity-api'
import { v4 as uuidv4 } from 'uuid'

// ─── Tab types ───────────────────────────────────────────────────────────────

type SettingsTab = 'ses' | 'senders' | 'infra'

const TABS: { id: SettingsTab; label: string; icon: typeof Globe }[] = [
  { id: 'ses', label: 'E-mail & Domínios', icon: Globe },
  { id: 'senders', label: 'Remetentes', icon: Mail },
  { id: 'infra', label: 'Infraestrutura', icon: Database },
]

// ─── Main Component ──────────────────────────────────────────────────────────

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('ses')

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
  const {
    data: identities,
    isLoading: identitiesLoading,
    refetch: refetchIdentities,
  } = useAllIdentities()
  const createIdentityMutation = useCreateIdentity()
  const deleteIdentityMutation = useDeleteIdentity()
  const [newIdentityDialogOpen, setNewIdentityDialogOpen] = useState(false)
  const [newIdentityValue, setNewIdentityValue] = useState('')
  const [deleteIdentityDialogOpen, setDeleteIdentityDialogOpen] = useState(false)
  const [deleteIdentityTarget, setDeleteIdentityTarget] = useState<string | null>(null)
  const [expandedIdentity, setExpandedIdentity] = useState<string | null>(null)
  const identityDetailQuery = useIdentityDetail(expandedIdentity)

  // ── SES Account ──────────────────────────────────────────────────────
  const { data: accountInfo, isLoading: accountLoading } = useSesAccount()
  const { data: configSets } = useConfigurationSets()
  const { data: suppressedList } = useSuppressedDestinations()

  // ── Sender Profiles ──────────────────────────────────────────────────
  const [senderDialogOpen, setSenderDialogOpen] = useState(false)
  const [editingSenderId, setEditingSenderId] = useState<string | null>(null)
  const [senderLabel, setSenderLabel] = useState('')
  const [senderEmail, setSenderEmail] = useState('')
  const [senderDisplayName, setSenderDisplayName] = useState('')
  const [senderReplyTo, setSenderReplyTo] = useState('')
  const [senderIsDefault, setSenderIsDefault] = useState(false)

  useEffect(() => {
    setS3Arn(settings.s3Bucket.bucketArn)
    setS3Region(settings.s3Bucket.region)
    setTableName(settings.campaignAnalyticsTable.tableName)
    setTableRegion(settings.campaignAnalyticsTable.region)
  }, [settings])

  // ── Handlers ─────────────────────────────────────────────────────────

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
  const verifiedEmails =
    identities?.filter((i) => i.type === 'EMAIL_ADDRESS' && i.sendingEnabled) ?? []
  const verifiedDomains =
    identities?.filter((i) => i.type === 'DOMAIN' && i.sendingEnabled) ?? []

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-200 text-slate-700">
          <Settings className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">Configurações</h1>
          <p className="text-xs text-slate-500">
            Configurações do sistema, integrações AWS e identidades SES
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="w-4 h-4" />
          Restaurar Padrão
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-slate-200">
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'border-botica-600 text-botica-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB: E-mail & Domínios (SES) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'ses' && (
        <div className="space-y-5">
          {/* ── SES Account Overview ─────────────────────────────────── */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-botica-100 text-botica-700">
                <Activity className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-slate-900">Status da Conta SES</h2>
                <p className="text-xs text-slate-500">
                  Visão geral da sua conta Amazon SES
                </p>
              </div>
            </div>

            <div className="p-5">
              {accountLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              ) : accountInfo ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Envio
                    </p>
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`w-2 h-2 rounded-full ${accountInfo.sendingEnabled ? 'bg-green-500' : 'bg-red-500'}`}
                      />
                      <span className="text-sm font-medium text-slate-800">
                        {accountInfo.sendingEnabled ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Acesso Produção
                    </p>
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`w-2 h-2 rounded-full ${accountInfo.productionAccessEnabled ? 'bg-green-500' : 'bg-amber-500'}`}
                      />
                      <span className="text-sm font-medium text-slate-800">
                        {accountInfo.productionAccessEnabled ? 'Sim' : 'Sandbox'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Limite 24h
                    </p>
                    <span className="text-sm font-medium text-slate-800">
                      {accountInfo.sendQuota.max24HourSend.toLocaleString('pt-BR')}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1">emails</span>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Enviados 24h
                    </p>
                    <span className="text-sm font-medium text-slate-800">
                      {accountInfo.sendQuota.sentLast24Hours.toLocaleString('pt-BR')}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1">
                      / {accountInfo.sendQuota.max24HourSend.toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400">Não foi possível carregar informações da conta.</p>
              )}

              {accountInfo && (
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>
                      Taxa máx: <strong className="text-slate-700">{accountInfo.sendQuota.maxSendRate}</strong> emails/s
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Shield className="w-3.5 h-3.5" />
                    <span>
                      Status: <strong className="text-slate-700">{accountInfo.enforcementStatus}</strong>
                    </span>
                  </div>
                  {configSets && configSets.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Layers className="w-3.5 h-3.5" />
                      <span>
                        Config sets: <strong className="text-slate-700">{configSets.length}</strong>
                      </span>
                    </div>
                  )}
                  {suppressedList && suppressedList.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Ban className="w-3.5 h-3.5" />
                      <span>
                        Suprimidos: <strong className="text-slate-700">{suppressedList.length}</strong>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Domain Identities ─────────────────────────────────────── */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-green-100 text-green-700">
                <Globe className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-slate-900">Domínios Verificados</h2>
                <p className="text-xs text-slate-500">
                  Domínios configurados para envio de e-mails
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchIdentities()}
                disabled={identitiesLoading}
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${identitiesLoading ? 'animate-spin' : ''}`}
                />
                Atualizar
              </Button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-500">
                Prefira usar nos registros sempre o nome de seu site ou sua marca. Isso deixa suas
                ofertas mais confiáveis e garante o funcionamento dos links do seu email.
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
                        <VerificationBadge status={id.verificationStatus} />
                        <span className="flex-1 text-sm font-medium text-slate-800">
                          {id.identity}
                        </span>
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

                      {expandedIdentity === id.identity && identityDetailQuery.data && (
                        <DkimDetailsPanel
                          identity={id.identity}
                          detail={identityDetailQuery.data}
                          isLoading={identityDetailQuery.isLoading}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Email Identities ──────────────────────────────────────── */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-blue-100 text-blue-700">
                <Mail className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-slate-900">Endereços de E-mail</h2>
                <p className="text-xs text-slate-500">
                  E-mails individuais verificados para envio
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setNewIdentityDialogOpen(true)}
                className="text-green-700 border-green-300 hover:bg-green-50"
              >
                <Plus className="w-4 h-4" />
                Adicionar
              </Button>
            </div>

            <div className="p-5">
              <p className="text-xs text-slate-500 mb-3">
                Enviar emails com o nome da sua marca ou site como remetente previne que eles sejam
                marcados como spam, além de garantir que os links contidos neles funcionem
                corretamente.
              </p>

              {emailIdentities.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">
                  Nenhum endereço de e-mail configurado.
                </p>
              ) : (
                <div className="space-y-2">
                  {emailIdentities.map((id) => (
                    <div
                      key={id.identity}
                      className="flex items-center gap-3 px-4 py-3 border border-slate-200 rounded-lg"
                    >
                      <VerificationBadge status={id.verificationStatus} />
                      <span className="flex-1 text-sm font-medium text-slate-800">
                        {id.identity}
                      </span>
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
          </div>

          {/* ── Suppression List ──────────────────────────────────────── */}
          {suppressedList && suppressedList.length > 0 && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-red-100 text-red-700">
                  <Ban className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h2 className="text-sm font-semibold text-slate-900">Lista de Supressão</h2>
                  <p className="text-xs text-slate-500">
                    E-mails bloqueados por bounces ou reclamações de spam
                  </p>
                </div>
              </div>
              <div className="p-5">
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {suppressedList.map((item) => (
                    <div
                      key={item.email}
                      className="flex items-center gap-3 px-3 py-2 text-xs bg-slate-50 rounded"
                    >
                      <span className="flex-1 text-slate-700 font-mono">{item.email}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          item.reason === 'BOUNCE'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {item.reason === 'BOUNCE' ? 'Bounce' : 'Spam'}
                      </span>
                      <span className="text-slate-400">
                        {item.lastUpdateTime
                          ? new Date(item.lastUpdateTime).toLocaleDateString('pt-BR')
                          : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Configuration Sets ────────────────────────────────────── */}
          {configSets && configSets.length > 0 && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-purple-100 text-purple-700">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h2 className="text-sm font-semibold text-slate-900">Configuration Sets</h2>
                  <p className="text-xs text-slate-500">
                    Conjuntos de regras aplicados ao envio de e-mails (rastreamento, eventos)
                  </p>
                </div>
              </div>
              <div className="p-5">
                <div className="flex flex-wrap gap-2">
                  {configSets.map((cs) => (
                    <span
                      key={cs.name}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-purple-50 text-purple-700 font-medium"
                    >
                      <Layers className="w-3 h-3" />
                      {cs.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB: Remetentes */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'senders' && (
        <div className="space-y-5">
          {/* Info card */}
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 flex items-start gap-3">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-800 leading-relaxed">
              Perfis de remetente são utilizados nas campanhas e envios de teste de templates.
              Cada remetente deve usar um e-mail de um domínio ou endereço verificado na aba
              &quot;E-mail &amp; Domínios&quot;.
            </p>
          </div>

          {/* Sender profiles card */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-blue-100 text-blue-700">
                <Mail className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-slate-900">Perfis de Remetente</h2>
                <p className="text-xs text-slate-500">
                  Configure remetentes para usar nas campanhas e testes de templates
                </p>
              </div>
              <Button size="sm" onClick={handleOpenAddSender}>
                <Plus className="w-4 h-4" />
                Novo Remetente
              </Button>
            </div>

            <div className="p-5">
              {settings.ses.senderProfiles.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Mail className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm font-medium text-slate-500">
                    Nenhum remetente configurado
                  </p>
                  <p className="text-xs mt-1">
                    Adicione um perfil de remetente para usar nas campanhas de e-mail.
                  </p>
                  <Button size="sm" className="mt-4" onClick={handleOpenAddSender}>
                    <Plus className="w-4 h-4" />
                    Criar primeiro remetente
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {settings.ses.senderProfiles.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 px-4 py-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-100 text-blue-600">
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

          {/* Available identities summary */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-green-100 text-green-700">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-slate-900">
                  Identidades Disponíveis para Remetente
                </h2>
                <p className="text-xs text-slate-500">
                  Domínios e e-mails verificados que podem ser usados como remetente
                </p>
              </div>
            </div>
            <div className="p-5">
              {verifiedDomains.length === 0 && verifiedEmails.length === 0 ? (
                <p className="text-xs text-slate-400">
                  Nenhuma identidade verificada. Configure na aba &quot;E-mail &amp; Domínios&quot;.
                </p>
              ) : (
                <div className="space-y-3">
                  {verifiedDomains.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Domínios (qualquer e-mail @domínio)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {verifiedDomains.map((d) => (
                          <span
                            key={d.identity}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-green-50 text-green-700 font-medium"
                          >
                            <Globe className="w-3 h-3" />@{d.identity}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {verifiedEmails.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        E-mails individuais
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {verifiedEmails.map((e) => (
                          <span
                            key={e.identity}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-blue-50 text-blue-700 font-medium"
                          >
                            <Mail className="w-3 h-3" />
                            {e.identity}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB: Infraestrutura */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'infra' && (
        <div className="space-y-5">
          {/* ── S3 Bucket Config ──────────────────────────────────────── */}
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
                  <Label className="text-xs font-medium text-slate-700">
                    ARN ou Nome do Bucket
                  </Label>
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
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="text-xs text-slate-400">
                  {s3Arn && (
                    <span>
                      Bucket:{' '}
                      <strong className="text-slate-600 font-mono">
                        {s3Arn.replace('arn:aws:s3:::', '')}
                      </strong>{' '}
                      • Região: <strong className="text-slate-600">{s3Region}</strong>
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

          {/* ── DynamoDB table — Campaign Analytics ───────────────────── */}
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
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="text-xs text-slate-400">
                  {tableName ? (
                    <span>
                      Tabela:{' '}
                      <strong className="text-slate-600 font-mono">{tableName}</strong> •
                      Região: <strong className="text-slate-600">{tableRegion}</strong>
                    </span>
                  ) : (
                    <span className="text-amber-500">
                      Tabela não configurada — Campanhas não serão salvas
                    </span>
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

          {/* ── Info card ──────────────────────────────────────────────── */}
          <div className="bg-botica-50 rounded-lg border border-botica-200 p-4">
            <p className="text-xs text-botica-800 leading-relaxed">
              <strong>Nota:</strong> As credenciais AWS (Access Key, Secret Key e Session Token)
              são gerenciadas na tela de login via MFA/STS e aplicadas automaticamente a todas as
              integrações. As configurações acima definem apenas os recursos (buckets, tabelas e
              identidades SES) que o sistema utiliza.
            </p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Dialogs */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      {/* New Identity Dialog */}
      <Dialog open={newIdentityDialogOpen} onOpenChange={setNewIdentityDialogOpen}>
        <DialogContent onClose={() => setNewIdentityDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Adicionar Identidade</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Insira um domínio (ex:{' '}
              <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
                boticaalternativa.com.br
              </code>
              ) ou um endereço de e-mail (ex:{' '}
              <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
                contato@boticaalternativa.com.br
              </code>
              ).
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNewIdentityDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleCreateIdentity}
              disabled={createIdentityMutation.isPending || !newIdentityValue.trim()}
            >
              {createIdentityMutation.isPending && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
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
            Tem certeza que deseja remover <strong>&quot;{deleteIdentityTarget}&quot;</strong>? Não
            será mais possível enviar e-mails a partir dessa identidade.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteIdentityDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteIdentity}
              disabled={deleteIdentityMutation.isPending}
            >
              {deleteIdentityMutation.isPending && (
                <Loader2 className="w-3 h-3 animate-spin" />
              )}
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
              {verifiedEmails.length > 0 || verifiedDomains.length > 0 ? (
                <>
                  <Input
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    placeholder="desperte@boticaalternativa.com.br"
                    className="mt-1"
                    list="verified-emails-list"
                  />
                  <datalist id="verified-emails-list">
                    {verifiedEmails.map((e) => (
                      <option key={e.identity} value={e.identity} />
                    ))}
                  </datalist>
                </>
              ) : (
                <Input
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="desperte@boticaalternativa.com.br"
                  className="mt-1"
                />
              )}
              <p className="text-[10px] text-slate-400 mt-1">
                Deve ser de um domínio ou e-mail verificado na aba &quot;E-mail &amp; Domínios&quot;
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

// ─── Sub-components ──────────────────────────────────────────────────────────

function VerificationBadge({ status }: { status: string }) {
  const isSuccess = status === 'SUCCESS'
  const isPending = status === 'PENDING'

  return (
    <div
      className={`w-5 h-5 rounded-full flex items-center justify-center ${
        isSuccess
          ? 'bg-green-100 text-green-600'
          : isPending
            ? 'bg-amber-100 text-amber-600'
            : 'bg-red-100 text-red-600'
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 className="w-3.5 h-3.5" />
      ) : (
        <AlertCircle className="w-3.5 h-3.5" />
      )}
    </div>
  )
}

function DkimDetailsPanel({
  identity,
  detail,
  isLoading,
}: {
  identity: string
  detail: SesIdentityDetail
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-medium text-slate-700">
            DKIM: {detail.dkimAttributes?.status ?? 'N/A'}
          </span>
        </div>

        {detail.dkimTokens && detail.dkimTokens.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-600 mb-2">
              Registros DKIM (CNAME) para configurar no DNS:
            </p>
            <div className="space-y-2">
              {getDkimRecords(identity, detail.dkimTokens).map((rec, i) => (
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

        {detail.mailFromDomain && (
          <div className="text-xs text-slate-600">
            <span className="font-medium">MAIL FROM:</span> {detail.mailFromDomain} (
            {detail.mailFromStatus})
          </div>
        )}
      </div>
    </div>
  )
}
