import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createRestaurant,
  deleteRestaurant,
  getRestaurants,
  updateRestaurant,
} from '../api/restaurant-ops-api'

function invalidateRestaurantQueries(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['restaurants'] }),
    queryClient.invalidateQueries({ queryKey: ['tenant-context'] }),
  ])
}

export function useRestaurants(organizationId: string) {
  return useQuery({
    queryKey: ['restaurants', organizationId],
    queryFn: () => getRestaurants(organizationId),
    enabled: Boolean(organizationId),
  })
}

export function useCreateRestaurant(organizationId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { name: string }) => createRestaurant(organizationId, payload),

    onSuccess: async () => {
      toast.success('Restaurant added.')
      await invalidateRestaurantQueries(queryClient)
    },

    onError: () => {
      toast.error('Failed to add restaurant.')
    },
  })
}

export function useUpdateRestaurant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { name?: string } }) =>
      updateRestaurant(id, payload),

    onSuccess: async () => {
      toast.success('Restaurant updated.')
      await invalidateRestaurantQueries(queryClient)
    },

    onError: () => {
      toast.error('Failed to update restaurant.')
    },
  })
}

export function useDeleteRestaurant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteRestaurant(id),

    onSuccess: async () => {
      toast.success('Restaurant deleted.')
      await invalidateRestaurantQueries(queryClient)
    },

    onError: () => {
      toast.error('Failed to delete restaurant.')
    },
  })
}
