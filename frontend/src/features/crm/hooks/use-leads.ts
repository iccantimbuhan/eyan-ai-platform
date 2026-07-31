import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  addLeadNote,
  assignLead,
  getLead,
  getLeads,
  updateLead,
  updateLeadStatus,
  type ListLeadsParams,
  type UpdateLeadPayload,
  type UpdateLeadStatusPayload,
} from '../api/crm-api'

function invalidateLeadQueries(queryClient: ReturnType<typeof useQueryClient>, id?: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['crm-leads'] }),
    ...(id ? [queryClient.invalidateQueries({ queryKey: ['crm-lead', id] })] : []),
  ])
}

export function useLeads(params: ListLeadsParams = {}) {
  return useQuery({
    queryKey: ['crm-leads', params],
    queryFn: () => getLeads(params),
  })
}

export function useLead(id: string) {
  return useQuery({
    queryKey: ['crm-lead', id],
    queryFn: () => getLead(id),
    enabled: Boolean(id),
  })
}

export function useUpdateLead(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateLeadPayload) => updateLead(id, payload),

    onSuccess: async () => {
      toast.success('Lead updated.')
      await invalidateLeadQueries(queryClient, id)
    },

    onError: () => {
      toast.error('Failed to update lead.')
    },
  })
}

export function useUpdateLeadStatus(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateLeadStatusPayload) => updateLeadStatus(id, payload),

    onSuccess: async () => {
      toast.success('Lead status updated.')
      await invalidateLeadQueries(queryClient, id)
    },

    onError: () => {
      toast.error('Failed to update lead status.')
    },
  })
}

export function useAssignLead(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (assignedToId: string | null) => assignLead(id, assignedToId),

    onSuccess: async () => {
      toast.success('Lead assignment updated.')
      await invalidateLeadQueries(queryClient, id)
    },

    onError: () => {
      toast.error('Failed to update lead assignment.')
    },
  })
}

export function useAddLeadNote(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: string) => addLeadNote(id, body),

    onSuccess: async () => {
      toast.success('Note added.')
      await invalidateLeadQueries(queryClient, id)
    },

    onError: () => {
      toast.error('Failed to add note.')
    },
  })
}
