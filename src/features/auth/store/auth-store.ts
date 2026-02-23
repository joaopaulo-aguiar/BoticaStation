import { create } from 'zustand'
import { STSClient, GetSessionTokenCommand } from '@aws-sdk/client-sts'
import type { AWSSessionCredentials, AWSLoginForm } from '@/shared/types'

const SESSION_KEY = 'botica_session'

function saveSession(credentials: AWSSessionCredentials): void {
  const serializable = {
    ...credentials,
    expiration: credentials.expiration.toISOString(),
  }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(serializable))
}

function loadSession(): AWSSessionCredentials | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    const expiration = new Date(parsed.expiration)

    if (new Date() >= expiration) {
      sessionStorage.removeItem(SESSION_KEY)
      return null
    }

    return { ...parsed, expiration }
  } catch {
    sessionStorage.removeItem(SESSION_KEY)
    return null
  }
}

function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY)
}

const initialCredentials = loadSession()

interface AuthState {
  credentials: AWSSessionCredentials | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (form: AWSLoginForm) => Promise<void>
  logout: () => void
  getCredentials: () => AWSSessionCredentials | null
}

export const useAuthStore = create<AuthState>((set, get) => ({
  credentials: initialCredentials,
  isAuthenticated: !!initialCredentials,
  isLoading: false,
  error: null,

  login: async (form: AWSLoginForm) => {
    set({ isLoading: true, error: null })

    try {
      const region = form.region || 'us-east-1'

      const stsClient = new STSClient({
        region,
        credentials: {
          accessKeyId: form.accessKeyId,
          secretAccessKey: form.secretAccessKey,
        },
      })

      const command = new GetSessionTokenCommand({
        DurationSeconds: 43200, // 12 hours
        SerialNumber: form.mfaSerialNumber,
        TokenCode: form.mfaToken,
      })

      const response = await stsClient.send(command)

      if (!response.Credentials) {
        throw new Error('Falha ao obter credenciais temporárias da AWS')
      }

      const sessionCredentials: AWSSessionCredentials = {
        accessKeyId: response.Credentials.AccessKeyId!,
        secretAccessKey: response.Credentials.SecretAccessKey!,
        sessionToken: response.Credentials.SessionToken!,
        expiration: response.Credentials.Expiration!,
        region,
      }

      saveSession(sessionCredentials)

      set({
        credentials: sessionCredentials,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido ao autenticar'
      set({
        isLoading: false,
        error: message,
        isAuthenticated: false,
        credentials: null,
      })
      throw err
    }
  },

  logout: () => {
    clearSession()
    set({
      credentials: null,
      isAuthenticated: false,
      error: null,
    })
  },

  getCredentials: () => {
    const state = get()
    if (!state.credentials) return null

    if (new Date() >= state.credentials.expiration) {
      state.logout()
      return null
    }

    return state.credentials
  },
}))
