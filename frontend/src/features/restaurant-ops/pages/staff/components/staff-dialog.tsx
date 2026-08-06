import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UnsavedChangesDialog } from '@/components/unsaved-changes-dialog'
import { useUpsertStaff } from '../../../hooks/use-staff'
import { STAFF_SCOPE_OPTIONS, TENANT_ROLE_OPTIONS } from '../../../lib/tenant-role-labels'
import { defaultStaffValues, staffSchema, type StaffFormValues } from '../../../schemas/staff-schema'
import type { RestaurantSummary } from '@/features/organizations/api/organizations-api'

type StaffDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  restaurants: RestaurantSummary[]
  // Pre-fills the email (and locks it) when granting additional access to
  // an existing staff member from their row, instead of inviting someone
  // new — same upsert endpoint either way.
  prefillEmail?: string
}

export function StaffDialog({
  open,
  onOpenChange,
  organizationId,
  restaurants,
  prefillEmail,
}: StaffDialogProps) {
  const upsertStaff = useUpsertStaff(organizationId)

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: defaultStaffValues,
  })

  useEffect(() => {
    if (!open) return

    form.reset({ ...defaultStaffValues, email: prefillEmail ?? '' })
  }, [open, prefillEmail, form])

  const scope = form.watch('scope')
  const restaurantId = form.watch('restaurantId')
  const selectedRestaurant = restaurants.find((r) => r.id === restaurantId)

  async function onSubmit(values: StaffFormValues) {
    await upsertStaff.mutateAsync({
      email: values.email,
      name: values.name || undefined,
      password: values.password || undefined,
      tenantRole: values.tenantRole,
      scope: values.scope,
      restaurantId: values.scope === 'ORGANIZATION' ? undefined : values.restaurantId,
      branchId: values.scope === 'BRANCH' ? values.branchId : undefined,
    })

    onOpenChange(false)
  }

  const { guardedOnOpenChange, unsavedChangesDialogProps } = useUnsavedChangesGuard({
    isDirty: form.formState.isDirty,
    onOpenChange,
  })

  return (
    <>
      <Dialog open={open} onOpenChange={guardedOnOpenChange}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>{prefillEmail ? 'Grant Additional Access' : 'Invite Staff'}</DialogTitle>

            <DialogDescription>
              {prefillEmail
                ? 'Grant this staff member access to another restaurant or branch.'
                : "New here? We'll create their account. Already have one? We'll just add this access."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
              <FormField
                control={form.control}
                name='email'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>

                    <FormControl>
                      <Input
                        type='email'
                        placeholder='staff@example.com'
                        autoFocus={!prefillEmail}
                        disabled={Boolean(prefillEmail)}
                        {...field}
                      />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='grid grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='name'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>

                      <FormControl>
                        <Input placeholder='Only needed for a new account' {...field} />
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
                      <FormLabel>Initial Password</FormLabel>

                      <FormControl>
                        <Input type='password' placeholder='Only needed for a new account' {...field} />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='tenantRole'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>

                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className='w-full'>
                            <SelectValue placeholder='Select role' />
                          </SelectTrigger>
                        </FormControl>

                        <SelectContent>
                          {TENANT_ROLE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='scope'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Access Scope</FormLabel>

                      <Select
                        onValueChange={(value) => {
                          field.onChange(value)
                          form.setValue('restaurantId', '')
                          form.setValue('branchId', '')
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className='w-full'>
                            <SelectValue placeholder='Select scope' />
                          </SelectTrigger>
                        </FormControl>

                        <SelectContent>
                          {STAFF_SCOPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {(scope === 'RESTAURANT' || scope === 'BRANCH') && (
                <FormField
                  control={form.control}
                  name='restaurantId'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Restaurant</FormLabel>

                      <Select
                        onValueChange={(value) => {
                          field.onChange(value)
                          form.setValue('branchId', '')
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className='w-full'>
                            <SelectValue placeholder='Select restaurant' />
                          </SelectTrigger>
                        </FormControl>

                        <SelectContent>
                          {restaurants.map((restaurant) => (
                            <SelectItem key={restaurant.id} value={restaurant.id}>
                              {restaurant.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {scope === 'BRANCH' && selectedRestaurant && (
                <FormField
                  control={form.control}
                  name='branchId'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch</FormLabel>

                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className='w-full'>
                            <SelectValue placeholder='Select branch' />
                          </SelectTrigger>
                        </FormControl>

                        <SelectContent>
                          {selectedRestaurant.branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter>
                <Button
                  type='button'
                  variant='outline'
                  disabled={upsertStaff.isPending}
                  onClick={() => guardedOnOpenChange(false)}
                >
                  Cancel
                </Button>

                <Button type='submit' disabled={upsertStaff.isPending}>
                  {upsertStaff.isPending ? 'Saving...' : 'Save'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <UnsavedChangesDialog {...unsavedChangesDialogProps} />
    </>
  )
}
