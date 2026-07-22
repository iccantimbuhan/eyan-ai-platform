import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
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
import { Textarea } from '@/components/ui/textarea'
import { useCreateRole, useUpdateRole } from '../hooks/use-roles'
import {
  defaultRoleValues,
  roleSchema,
  type RoleFormValues,
} from '../schemas/role-schema'
import type { Role } from '../types/role'
import { PermissionMatrix } from './permission-matrix'

type Props = {
  mode: 'create' | 'edit' | 'view'
  role?: Role
  open: boolean
  onOpenChange: (open: boolean) => void
}
export function RoleDialog({ mode, role, open, onOpenChange }: Props) {
  const create = useCreateRole()
  const update = useUpdateRole()
  const readOnly = mode === 'view'
  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: defaultRoleValues,
  })
  useEffect(() => {
    if (open)
      form.reset(
        role
          ? {
              name: role.name,
              description: role.description ?? '',
              isActive: role.isActive,
              permissions: role.permissions,
            }
          : defaultRoleValues
      )
  }, [form, open, role])
  async function submit(values: RoleFormValues) {
    if (readOnly) return
    if (mode === 'create') await create.mutateAsync(values)
    else if (role) await update.mutateAsync({ id: role.id, values })
    onOpenChange(false)
  }
  const pending = create.isPending || update.isPending
  const title =
    mode === 'create'
      ? 'Create Role'
      : mode === 'edit'
        ? 'Edit Role'
        : 'View Role'
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {readOnly
              ? 'Review this role and its access.'
              : 'Manage role details and access.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className='space-y-6'>
            <div className='grid gap-4 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Name</FormLabel>
                    <FormControl>
                      <Input disabled={readOnly} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='isActive'
                render={({ field }) => (
                  <FormItem className='flex h-full items-center justify-between rounded-md border px-4'>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        disabled={readOnly}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      disabled={readOnly}
                      placeholder="Describe this role's responsibilities"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {
              <FormField
                control={form.control}
                name='permissions'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Permissions</FormLabel>
                    <PermissionMatrix
                      value={field.value}
                      onChange={field.onChange}
                      disabled={readOnly}
                    />
                  </FormItem>
                )}
              />
            }
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
                disabled={pending}
              >
                {readOnly ? 'Close' : 'Cancel'}
              </Button>
              {!readOnly && (
                <Button type='submit' disabled={pending}>
                  {pending ? 'Saving...' : 'Save'}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
