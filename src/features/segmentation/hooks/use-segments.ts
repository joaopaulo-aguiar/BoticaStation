import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import {
  listSegments,
  getSegment,
  createSegment,
  updateSegment,
  deleteSegment,
  previewSegmentContacts,
} from '../api/segments-api'
import type { CreateSegmentInput, UpdateSegmentInput, SegmentCondition } from '../types'

const SEGMENTS_KEY = ['segments'] as const

export function useSegmentsList() {
  return useQuery({
    queryKey: [...SEGMENTS_KEY, 'list'],
    queryFn: () => listSegments(),
    staleTime: 30_000,
  })
}

export function useSegmentDetail(id: string | null) {
  return useQuery({
    queryKey: [...SEGMENTS_KEY, 'detail', id],
    queryFn: () => getSegment(id!),
    enabled: !!id,
    staleTime: 60_000,
  })
}

export function useCreateSegment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateSegmentInput) => createSegment(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: SEGMENTS_KEY }),
  })
}

export function useUpdateSegment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSegmentInput }) => updateSegment(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: SEGMENTS_KEY }),
  })
}

export function useDeleteSegment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSegment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: SEGMENTS_KEY }),
  })
}

export function usePreviewSegmentContacts(
  conditions: SegmentCondition[],
  conditionLogic: string,
  search: string,
  enabled: boolean,
) {
  const hasValidConditions = conditions.some((c) => c.value.trim())
  return useQuery({
    queryKey: [...SEGMENTS_KEY, 'preview', conditionLogic, conditions, search],
    queryFn: () => previewSegmentContacts(
      conditions.filter((c) => c.value.trim()),
      conditionLogic,
      search || undefined,
      50,
    ),
    enabled: enabled && hasValidConditions,
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  })
}
