import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { useCreateUser } from '../hooks/use-create-user'
import {
  availableRoles,
  createUserSchema,
  defaultCreateUserValues,
  type CreateUserFormValues,
} from '../schemas/user-schema'

type CreateUserDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateUserDialog({
  open,
  onOpenChange,
}: CreateUserDialogProps) {
  const createUser = useCreateUser()

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: defaultCreateUserValues,
  })

  async function onSubmit(values: CreateUserFormValues) {
    await createUser.mutateAsync(values)

    form.reset()

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>

          <DialogDescription>Create a new user account.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>

                  <FormControl>
                    <Input placeholder='John Doe' {...field} />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='email'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>

                  <FormControl>
                    <Input
                      type='email'
                      placeholder='john@example.com'
                      {...field}
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='password'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>

                  <FormControl>
                    <Input type='password' placeholder='••••••••' {...field} />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='roles'
              render={() => (
                <FormItem>
                  <FormLabel>Roles</FormLabel>

                  <div className='space-y-3 rounded-md border p-4'>
                    {availableRoles.map((role) => (
                      <FormField
                        key={role}
                        control={form.control}
                        name='roles'
                        render={({ field }) => (
                          <FormItem className='flex flex-row items-center space-y-0 space-x-3'>
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(role)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    field.onChange([...field.value, role])
                                  } else {
                                    field.onChange(
                                      field.value.filter(
                                        (value) => value !== role
                                      )
                                    )
                                  }
                                }}
                              />
                            </FormControl>

                            <FormLabel className='font-normal'>
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
                type='button'
                variant='outline'
                disabled={createUser.isPending}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>

              <Button type='submit' disabled={createUser.isPending}>
                {createUser.isPending ? 'Creating...' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
