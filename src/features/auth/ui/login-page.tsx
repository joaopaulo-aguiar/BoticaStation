import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth-store'
import { Button } from '@/shared/ui'
import { Input } from '@/shared/ui'
import { Label } from '@/shared/ui'
import { Loader2, Eye, EyeOff, KeyRound } from 'lucide-react'

export function LoginPage() {
  const navigate = useNavigate()
  const { login, completeNewPassword, confirmMfa, isLoading, error, authStep, clearError } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    clearError()
    setLocalError(null)
    await login(email, password)
    if (useAuthStore.getState().isAuthenticated) {
      navigate('/dashboard')
    }
  }

  const handleNewPassword = async (e: FormEvent) => {
    e.preventDefault()
    clearError()
    setLocalError(null)
    if (newPassword !== confirmNewPassword) {
      setLocalError('As senhas não coincidem')
      return
    }
    if (newPassword.length < 8) {
      setLocalError('A senha deve ter no mínimo 8 caracteres')
      return
    }
    await completeNewPassword(newPassword)
    if (useAuthStore.getState().isAuthenticated) {
      navigate('/dashboard')
    }
  }

  const handleMfa = async (e: FormEvent) => {
    e.preventDefault()
    clearError()
    setLocalError(null)
    await confirmMfa(mfaCode)
    if (useAuthStore.getState().isAuthenticated) {
      navigate('/dashboard')
    }
  }

  const displayError = localError ?? error

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-botica-50 to-earth-50 px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
          {/* Header */}
          <div className="flex flex-col items-center mb-8">
            <img src="/logo-horizontal.svg" alt="Botica Alternativa" className="h-10 w-auto mb-3" />
            {authStep === 'new_password_required' && (
              <div className="flex items-center gap-1.5 mt-1">
                <KeyRound className="w-4 h-4 text-botica-600" />
                <p className="text-xs text-slate-500">Defina sua nova senha para continuar</p>
              </div>
            )}
            {authStep === 'idle' && (
              <p className="text-xs text-slate-500 mt-1">Acesso Interno</p>
            )}
          </div>

          {/* Login Form */}
          {authStep === 'idle' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {displayError && (
                <p className="text-xs text-red-600 bg-red-50 rounded-md px-3 py-2">{displayError}</p>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Entrar'}
              </Button>
            </form>
          )}

          {/* New Password Form (Force Change Password) */}
          {authStep === 'new_password_required' && (
            <form onSubmit={handleNewPassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmNewPassword">Confirmar Nova Senha</Label>
                <Input
                  id="confirmNewPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Repita a nova senha"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>

              {displayError && (
                <p className="text-xs text-red-600 bg-red-50 rounded-md px-3 py-2">{displayError}</p>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Definir Senha e Entrar'}
              </Button>
            </form>
          )}

          {/* MFA Form */}
          {authStep === 'mfa_required' && (
            <form onSubmit={handleMfa} className="space-y-4">
              <div className="text-center mb-2">
                <p className="text-sm text-slate-600">Digite o código do seu autenticador</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mfaCode">Código MFA (6 dígitos)</Label>
                <Input
                  id="mfaCode"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="000000"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  required
                  autoComplete="one-time-code"
                  autoFocus
                />
              </div>

              {displayError && (
                <p className="text-xs text-red-600 bg-red-50 rounded-md px-3 py-2">{displayError}</p>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verificar'}
              </Button>
            </form>
          )}

          <p className="text-center text-[11px] text-slate-400 mt-6">
            BoticaStation v2.0.0 — Powered by AWS Cognito
          </p>
        </div>
      </div>
    </div>
  )
}
