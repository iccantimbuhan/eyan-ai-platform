import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

import { useUpdateUser } from '../hooks/use-update-user'
import {
  availableRoles,
  type UpdateUserFormValues,
  updateUserSchema,
} from '../schemas/update-user-schema'
import type { User } from '../types/user'

type EditUserDialogProps = {
  user: User
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditUserDialog({
  user,
  open,
  onOpenChange,
}: EditUserDialogProps) {
  const updateUserMutation = useUpdateUser()

  const form = useForm<UpdateUserFormValues>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      name: '',
      email: '',
      roles: [],
      isActive: true,
    },
  })

  useEffect(() => {
    if (!open) return

    form.reset({
      name: user.name,
      email: user.email,
      roles: [...user.roles],
      isActive: user.isActive,
    })
  }, [form, open, user])

  async function onSubmit(values: UpdateUserFormValues) {
    await updateUserMutation.mutateAsync({
      id: user.id,
      data: values,
    })

    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>

          <DialogDescription>
            Update user information.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>

                  <FormControl>
                    <Input {...field} />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>

                  <FormControl>
                    <Input
                      type="email"
                      {...field}
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border p-4">
                  <FormLabel>Active</FormLabel>

                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="roles"
              render={() => (
                <FormItem>
                  <FormLabel>Roles</FormLabel>

                  <div className="space-y-3 rounded-md border p-4">
                    {availableRoles.map((role) => (
                      <FormField
                        key={role}
                        control={form.control}
                        name="roles"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-3">
                            <FormControl>
                              <Checkbox
                                checked={field.value.includes(role)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    field.onChange([
                                      ...field.value,
                                      role,
                                    ])
                                  } else {
                                    field.onChange(
                                      field.value.filter(
                                        (r) => r !== role
                                      )
                                    )
                                  }
                                }}
                              />
                            </FormControl>

                            <FormLabel className="font-normal">
                              {role}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>

                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={updateUserMutation.isPending}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={updateUserMutation.isPending}
              >
                {updateUserMutation.isPending
                  ? 'Saving...'
                  : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
