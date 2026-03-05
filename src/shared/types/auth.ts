export type UserRole = 'ADMIN' | 'GESTOR' | 'OPERADOR'

export interface AuthUser {
  email: string
  name: string
  sub: string
  role: UserRole
}
