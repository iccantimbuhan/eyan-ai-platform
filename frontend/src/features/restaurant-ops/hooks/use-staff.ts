import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  disableStaff,
  getStaff,
  upsertStaff,
  type UpsertStaffPayload,
} from '../api/restaurant-ops-api'

function invalidateStaffQueries(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: ['staff'] })
}

export function useStaff(organizationId: string) {
  return useQuery({
    queryKey: ['staff', organizationId],
    queryFn: () => getStaff(organizationId),
    enabled: Boolean(organizationId),
  })
}

export function useUpsertStaff(organizationId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpsertStaffPayload) => upsertStaff(organizationId, payload),

    onSuccess: async () => {
      toast.success('Staff membership saved.')
      await invalidateStaffQueries(queryClient)
    },

    onError: () => {
      toast.error('Failed to save staff membership.')
    },
  })
}

export function useDisableStaff(organizationId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => disableStaff(organizationId, userId),

    onSuccess: async () => {
      toast.success('Staff member disabled.')
      await invalidateStaffQueries(queryClient)
    },

    onError: () => {
      toast.error('Failed to disable staff member.')
    },
  })
}
