/**
 * React Query hooks for segmentation.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/store/auth-store'
import {
  listSegments,
  getSegment,
  createSegment,
  updateSegment,
  deleteSegment,
  evaluateSegment,
  listSegmentMembers,
  addSegmentMembers,
  removeSegmentMembers,
  getSegmentEmails,
} from '../api/segmentation-api'
import type { SegmentFormData } from '../types'

const SEGMENTS_KEY = ['segments']

function useCredentials() {
  const getCredentials = useAuthStore((s) => s.getCredentials)
  return () => {
    const creds = getCredentials()
    if (!creds) throw new Error('Sessão expirada. Faça login novamente.')
    return creds
  }
}

export function useSegments() {
  const getCreds = useCredentials()
  return useQuery({
    queryKey: SEGMENTS_KEY,
    queryFn: () => listSegments(getCreds()),
    staleTime: 1000 * 60 * 2,
  })
}

export function useSegment(id: string | null) {
  const getCreds = useCredentials()
  return useQuery({
    queryKey: [...SEGMENTS_KEY, id],
    queryFn: () => getSegment(getCreds(), id!),
    enabled: !!id,
  })
}

export function useCreateSegment() {
  const qc = useQueryClient()
  const getCreds = useCredentials()
  return useMutation({
    mutationFn: (data: SegmentFormData) => createSegment(getCreds(), data),
    onSuccess: () => qc.invalidateQueries({ queryKey: SEGMENTS_KEY }),
  })
}

export function useUpdateSegment() {
  const qc = useQueryClient()
  const getCreds = useCredentials()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SegmentFormData> }) =>
      updateSegment(getCreds(), id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: SEGMENTS_KEY }),
  })
}

export function useDeleteSegment() {
  const qc = useQueryClient()
  const getCreds = useCredentials()
  return useMutation({
    mutationFn: (id: string) => deleteSegment(getCreds(), id),
    onSuccess: () => qc.invalidateQueries({ queryKey: SEGMENTS_KEY }),
  })
}

export function useEvaluateSegment(segmentId: string | null) {
  const getCreds = useCredentials()
  return useQuery({
    queryKey: [...SEGMENTS_KEY, segmentId, 'evaluate'],
    queryFn: () => evaluateSegment(getCreds(), segmentId!),
    enabled: !!segmentId,
    staleTime: 1000 * 60,
  })
}

export function useSegmentMembers(segmentId: string | null) {
  const getCreds = useCredentials()
  return useQuery({
    queryKey: [...SEGMENTS_KEY, segmentId, 'members'],
    queryFn: () => listSegmentMembers(getCreds(), segmentId!),
    enabled: !!segmentId,
  })
}

export function useAddSegmentMembers() {
  const qc = useQueryClient()
  const getCreds = useCredentials()
  return useMutation({
    mutationFn: ({ segmentId, emails }: { segmentId: string; emails: string[] }) =>
      addSegmentMembers(getCreds(), segmentId, emails),
    onSuccess: () => qc.invalidateQueries({ queryKey: SEGMENTS_KEY }),
  })
}

export function useRemoveSegmentMembers() {
  const qc = useQueryClient()
  const getCreds = useCredentials()
  return useMutation({
    mutationFn: ({ segmentId, emails }: { segmentId: string; emails: string[] }) =>
      removeSegmentMembers(getCreds(), segmentId, emails),
    onSuccess: () => qc.invalidateQueries({ queryKey: SEGMENTS_KEY }),
  })
}

export function useSegmentEmails(segmentId: string | null) {
  const getCreds = useCredentials()
  return useQuery({
    queryKey: [...SEGMENTS_KEY, segmentId, 'emails'],
    queryFn: () => getSegmentEmails(getCreds(), segmentId!),
    enabled: !!segmentId,
    staleTime: 1000 * 60,
  })
}
