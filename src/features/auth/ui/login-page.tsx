import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { Button, Input, Label } from '@/shared/ui'
import { Shield, Eye, EyeOff, Loader2 } from 'lucide-react'
import type { AWSLoginForm } from '@/shared/types'

export function LoginPage() {
  const navigate = useNavigate()
  const { login, isLoading, error } = useAuthStore()
  const [showSecret, setShowSecret] = useState(false)
  const [form, setForm] = useState<AWSLoginForm>({
    accessKeyId: '',
    secretAccessKey: '',
    mfaToken: '',
    mfaSerialNumber: '',
    region: 'sa-east-1',
  })

  const handleChange = (field: keyof AWSLoginForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login(form)
      navigate('/')
    } catch {
      // Error is handled in the store
    }
  }

  const isValid =
    form.accessKeyId.length > 0 &&
    form.secretAccessKey.length > 0 &&
    form.mfaToken.length === 6 &&
    form.mfaSerialNumber.length > 0

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-botica-50 via-white to-earth-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-botica-600 text-white mb-4 shadow-lg">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Botica Station</h1>
          <p className="text-sm text-slate-500 mt-1">
            Automação de Marketing & Gestão de Cashback
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-xl shadow-[var(--shadow-card)] border border-slate-200 p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900">Autenticação AWS</h2>
            <p className="text-xs text-slate-500 mt-1">
              Insira suas credenciais IAM e o código MFA para obter uma sessão temporária segura.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Access Key ID */}
            <div className="space-y-1.5">
              <Label htmlFor="accessKeyId">Access Key ID</Label>
              <Input
                id="accessKeyId"
                placeholder="AKIA..."
                value={form.accessKeyId}
                onChange={handleChange('accessKeyId')}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            {/* Secret Access Key */}
            <div className="space-y-1.5">
              <Label htmlFor="secretAccessKey">Secret Access Key</Label>
              <div className="relative">
                <Input
                  id="secretAccessKey"
                  type={showSecret ? 'text' : 'password'}
                  placeholder="••••••••••••••••"
                  value={form.secretAccessKey}
                  onChange={handleChange('secretAccessKey')}
                  autoComplete="off"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* AWS Region */}
            <div className="space-y-1.5">
              <Label htmlFor="region">Região AWS</Label>
              <select
                id="region"
                value={form.region}
                onChange={(e) => setForm((prev) => ({ ...prev, region: e.target.value }))}
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-botica-500 cursor-pointer"
              >
                <option value="sa-east-1">sa-east-1 (São Paulo)</option>
                <option value="us-east-1">us-east-1 (N. Virginia)</option>
                <option value="us-east-2">us-east-2 (Ohio)</option>
                <option value="us-west-1">us-west-1 (N. California)</option>
                <option value="us-west-2">us-west-2 (Oregon)</option>
                <option value="eu-west-1">eu-west-1 (Ireland)</option>
                <option value="eu-central-1">eu-central-1 (Frankfurt)</option>
              </select>
            </div>

            {/* MFA Serial Number (ARN) */}
            <div className="space-y-1.5">
              <Label htmlFor="mfaSerialNumber">MFA Device ARN</Label>
              <Input
                id="mfaSerialNumber"
                placeholder="arn:aws:iam::123456789012:mfa/user"
                value={form.mfaSerialNumber}
                onChange={handleChange('mfaSerialNumber')}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            {/* MFA Token */}
            <div className="space-y-1.5">
              <Label htmlFor="mfaToken">Código MFA (6 dígitos)</Label>
              <Input
                id="mfaToken"
                placeholder="123456"
                value={form.mfaToken}
                onChange={handleChange('mfaToken')}
                maxLength={6}
                inputMode="numeric"
                pattern="[0-9]{6}"
                autoComplete="one-time-code"
                className="tracking-[0.3em] text-center font-mono text-lg"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3">
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            {/* Submit */}
            <Button type="submit" className="w-full" disabled={!isValid || isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Autenticando...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Entrar com STS
                </>
              )}
            </Button>
          </form>

          <div className="mt-4 p-3 bg-slate-50 rounded-md">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              <strong>Segurança:</strong> As credenciais de longo prazo não são armazenadas. O
              token temporário STS (12h) é persistido na sessão do navegador.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
