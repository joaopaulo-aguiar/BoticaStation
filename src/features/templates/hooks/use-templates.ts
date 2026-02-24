import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/store/auth-store'
import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  sendTestEmail,
  listVerifiedIdentities,
  listTemplateBackups,
} from '@/features/templates/api/templates-api'

const TEMPLATES_KEY = ['ses-templates']

function useCredentials() {
  const getCredentials = useAuthStore((s) => s.getCredentials)
  return () => {
    const creds = getCredentials()
    if (!creds) throw new Error('Sessão expirada. Faça login novamente.')
    return creds
  }
}

export function useTemplates() {
  const getCreds = useCredentials()

  return useQuery({
    queryKey: TEMPLATES_KEY,
    queryFn: async () => {
      const creds = getCreds()
      const result = await listTemplates(creds)
      return result.templates
    },
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 2,
  })
}

export function useTemplate(name: string | null) {
  const getCreds = useCredentials()

  return useQuery({
    queryKey: [...TEMPLATES_KEY, name],
    queryFn: () => {
      const creds = getCreds()
      return getTemplate(creds, name!)
    },
    enabled: !!name,
    refetchOnWindowFocus: false,
  })
}

export function useCreateTemplate() {
  const queryClient = useQueryClient()
  const getCreds = useCredentials()

  return useMutation({
    mutationFn: (data: {
      name: string
      subject: string
      html: string
      text?: string
      testData?: Record<string, unknown>
    }) => {
      const creds = getCreds()
      return createTemplate(creds, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY })
    },
  })
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient()
  const getCreds = useCredentials()

  return useMutation({
    mutationFn: ({
      name,
      data,
    }: {
      name: string
      data: { subject: string; html: string; text?: string; testData?: Record<string, unknown> }
    }) => {
      const creds = getCreds()
      return updateTemplate(creds, name, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY })
    },
  })
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient()
  const getCreds = useCredentials()

  return useMutation({
    mutationFn: (name: string) => {
      const creds = getCreds()
      return deleteTemplate(creds, name)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY })
    },
  })
}

export function useDuplicateTemplate() {
  const queryClient = useQueryClient()
  const getCreds = useCredentials()

  return useMutation({
    mutationFn: ({ sourceName, newName }: { sourceName: string; newName: string }) => {
      const creds = getCreds()
      return duplicateTemplate(creds, sourceName, newName)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY })
    },
  })
}

export function useSendTestEmail() {
  const getCreds = useCredentials()

  return useMutation({
    mutationFn: (data: {
      toEmail: string
      fromEmail: string
      subject: string
      html: string
      text?: string
    }) => {
      const creds = getCreds()
      return sendTestEmail(creds, data)
    },
  })
}

export function useVerifiedIdentities() {
  const getCreds = useCredentials()

  return useQuery({
    queryKey: ['ses-identities'],
    queryFn: () => {
      const creds = getCreds()
      return listVerifiedIdentities(creds)
    },
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
  })
}

export function useTemplateBackups(name: string | null) {
  const getCreds = useCredentials()

  return useQuery({
    queryKey: [...TEMPLATES_KEY, name, 'backups'],
    queryFn: () => {
      const creds = getCreds()
      return listTemplateBackups(creds, name!)
    },
    enabled: !!name,
    refetchOnWindowFocus: false,
  })
}
