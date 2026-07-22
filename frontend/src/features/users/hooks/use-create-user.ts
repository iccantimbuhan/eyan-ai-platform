import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { createUser } from '../api/users-api'
import type { CreateUserFormValues } from '../schemas/user-schema'

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateUserFormValues) =>
      createUser(payload),

    onSuccess: async () => {
      toast.success('User created successfully.')

      await queryClient.invalidateQueries({
        queryKey: ['users'],
      })
    },

    onError: () => {
      toast.error('Failed to create user.')
    },
  })
}
