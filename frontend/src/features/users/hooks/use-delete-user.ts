import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { deleteUser } from '../api/users-api'

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteUser,

    onSuccess: async () => {
      toast.success('User deleted successfully.')

      await queryClient.invalidateQueries({
        queryKey: ['users'],
      })
    },

    onError: () => {
      toast.error('Failed to delete user.')
    },
  })
}
