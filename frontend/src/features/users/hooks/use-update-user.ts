import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { updateUser } from '../api/users-api'
import type { UpdateUserFormValues } from '../schemas/update-user-schema'

type UpdateUserPayload = {
  id: string
  data: UpdateUserFormValues
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: UpdateUserPayload) => updateUser(id, data),

    onSuccess: async () => {
      toast.success('User updated successfully.')

      await queryClient.invalidateQueries({
        queryKey: ['users'],
      })
    },

    onError: () => {
      toast.error('Failed to update user.')
    },
  })
}
