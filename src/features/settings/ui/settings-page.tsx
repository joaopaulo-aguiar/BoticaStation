import { useState, useEffect } from 'react'
import {
  Settings,
  Save,
  RotateCcw,
  Database,
  HardDrive,
  CheckCircle2,
} from 'lucide-react'
import { Button, Input, Label } from '@/shared/ui'
import { useSettingsStore, type S3BucketConfig, type DynamoTableConfig } from '@/features/settings/store/settings-store'

export function SettingsPage() {
  const { settings, updateS3Bucket, updateCampaignTable, resetToDefaults } = useSettingsStore()

  // ── S3 Bucket config ─────────────────────────────────────────────────
  const [s3Arn, setS3Arn] = useState(settings.s3Bucket.bucketArn)
  const [s3Region, setS3Region] = useState(settings.s3Bucket.region)
  const [s3Saved, setS3Saved] = useState(false)

  // ── DynamoDB Campaign table config ───────────────────────────────────
  const [tableName, setTableName] = useState(settings.campaignAnalyticsTable.tableName)
  const [tableRegion, setTableRegion] = useState(settings.campaignAnalyticsTable.region)
  const [tableSaved, setTableSaved] = useState(false)

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

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-200 text-slate-700">
          <Settings className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">Configurações</h1>
          <p className="text-xs text-slate-500">Configurações do sistema e integrações AWS</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="w-4 h-4" />
          Restaurar Padrão
        </Button>
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
            <h2 className="text-sm font-semibold text-slate-900">DynamoDB — Análise de Campanhas</h2>
            <p className="text-xs text-slate-500">
              Tabela com dados consolidados de envios, aberturas, cliques e bounces
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
                placeholder="CampaignAnalytics"
                className="mt-1 font-mono text-xs"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Tabela DynamoDB com métricas consolidadas de campanhas
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
                <span className="text-amber-500">Tabela não configurada — Dashboard usará dados de exemplo</span>
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
          as integrações. As configurações acima definem apenas os recursos (buckets e tabelas)
          que o sistema utiliza.
        </p>
      </div>
    </div>
  )
}
