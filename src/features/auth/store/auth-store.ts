import { create } from 'zustand'
import {
  signIn,
  signOut,
  confirmSignIn,
  fetchAuthSession,
  getCurrentUser,
} from 'aws-amplify/auth'
import type { AuthUser, UserRole } from '@/shared/types'

type AuthStep = 'idle' | 'new_password_required' | 'mfa_required' | 'authenticated'

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  isCheckingSession: boolean
  error: string | null
  userRole: UserRole | null
  authStep: AuthStep
  login: (email: string, password: string) => Promise<void>
  completeNewPassword: (newPassword: string) => Promise<void>
  confirmMfa: (code: string) => Promise<void>
  logout: () => Promise<void>
  checkSession: () => Promise<void>
  clearError: () => void
}

function extractRoleFromGroups(groups: string[] | undefined): UserRole {
  if (!groups || groups.length === 0) return 'OPERADOR'
  if (groups.includes('ADMIN')) return 'ADMIN'
  if (groups.includes('GESTOR')) return 'GESTOR'
  return 'OPERADOR'
}

async function buildAuthUser(): Promise<AuthUser> {
  const cognitoUser = await getCurrentUser()
  const session = await fetchAuthSession()
  const idTokenPayload = session.tokens?.idToken?.payload
  const groups = idTokenPayload?.['cognito:groups'] as string[] | undefined
  const role = extractRoleFromGroups(groups)

  return {
    email: (idTokenPayload?.['email'] as string) ?? cognitoUser.signInDetails?.loginId ?? '',
    name: (idTokenPayload?.['email'] as string)?.split('@')[0] ?? '',
    sub: cognitoUser.userId,
    role,
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isCheckingSession: true,
  error: null,
  userRole: null,
  authStep: 'idle',

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      const result = await signIn({ username: email, password })
      const step = result.nextStep.signInStep

      if (step === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        set({ isLoading: false, authStep: 'new_password_required' })
        return
      }

      if (
        step === 'CONFIRM_SIGN_IN_WITH_TOTP_CODE' ||
        step === 'CONFIRM_SIGN_IN_WITH_SMS_CODE'
      ) {
        set({ isLoading: false, authStep: 'mfa_required' })
        return
      }

      if (result.isSignedIn) {
        const user = await buildAuthUser()
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          userRole: user.role,
          authStep: 'authenticated',
        })
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao fazer login'
      set({ isLoading: false, error: message })
    }
  },

  completeNewPassword: async (newPassword: string) => {
    set({ isLoading: true, error: null })
    try {
      const result = await confirmSignIn({ challengeResponse: newPassword })

      if (result.isSignedIn) {
        const user = await buildAuthUser()
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          userRole: user.role,
          authStep: 'authenticated',
        })
        return
      }

      // May chain into MFA after password change
      const step = result.nextStep.signInStep
      if (
        step === 'CONFIRM_SIGN_IN_WITH_TOTP_CODE' ||
        step === 'CONFIRM_SIGN_IN_WITH_SMS_CODE'
      ) {
        set({ isLoading: false, authStep: 'mfa_required' })
        return
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao definir nova senha'
      set({ isLoading: false, error: message })
    }
  },

  confirmMfa: async (code: string) => {
    set({ isLoading: true, error: null })
    try {
      const result = await confirmSignIn({ challengeResponse: code })

      if (result.isSignedIn) {
        const user = await buildAuthUser()
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          userRole: user.role,
          authStep: 'authenticated',
        })
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Código MFA inválido'
      set({ isLoading: false, error: message })
    }
  },

  logout: async () => {
    try {
      await signOut()
    } catch {
      // ignore sign-out errors
    }
    set({
      user: null,
      isAuthenticated: false,
      userRole: null,
      authStep: 'idle',
      error: null,
    })
  },

  checkSession: async () => {
    set({ isCheckingSession: true })
    try {
      const user = await buildAuthUser()
      set({
        user,
        isAuthenticated: true,
        userRole: user.role,
        authStep: 'authenticated',
        isCheckingSession: false,
      })
    } catch {
      set({
        user: null,
        isAuthenticated: false,
        userRole: null,
        authStep: 'idle',
        isCheckingSession: false,
      })
    }
  },

  clearError: () => set({ error: null }),
}))
