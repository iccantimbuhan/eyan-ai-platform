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
import { Textarea } from '@/components/ui/textarea'
import { UnsavedChangesDialog } from '@/components/unsaved-changes-dialog'
import { useCreateSupplier, useUpdateSupplier } from '../../../hooks/use-suppliers'
import {
  defaultSupplierValues,
  supplierSchema,
  type SupplierFormValues,
} from '../../../schemas/supplier-schema'
import type { Supplier } from '../../../types/restaurant-ops'

type SupplierDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  restaurantId: string
  supplier?: Supplier
}

export function SupplierDialog({
  open,
  onOpenChange,
  restaurantId,
  supplier,
}: SupplierDialogProps) {
  const isEdit = Boolean(supplier)

  const createSupplier = useCreateSupplier(restaurantId)
  const updateSupplier = useUpdateSupplier()
  const isPending = createSupplier.isPending || updateSupplier.isPending

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: defaultSupplierValues,
  })

  useEffect(() => {
    if (!open) return

    form.reset(
      supplier
        ? {
            name: supplier.name,
            phone: supplier.phone ?? '',
            email: supplier.email ?? '',
            notes: supplier.notes ?? '',
          }
        : defaultSupplierValues
    )
  }, [supplier, form, open])

  async function onSubmit(values: SupplierFormValues) {
    const payload = {
      name: values.name,
      phone: values.phone || null,
      email: values.email || null,
      notes: values.notes || null,
    }

    if (isEdit && supplier) {
      await updateSupplier.mutateAsync({ id: supplier.id, payload })
    } else {
      await createSupplier.mutateAsync(payload)
    }

    onOpenChange(false)
  }

  const { guardedOnOpenChange, unsavedChangesDialogProps } = useUnsavedChangesGuard({
    isDirty: form.formState.isDirty,
    onOpenChange,
  })

  return (
    <>
      <Dialog open={open} onOpenChange={guardedOnOpenChange}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>

            <DialogDescription>
              {isEdit ? 'Update this supplier.' : 'e.g. 360 Food, J.Calleja.'}
            </DialogDescription>
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
                      <Input placeholder='e.g. 360 Food' autoFocus {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='phone'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>

                    <FormControl>
                      <Input placeholder='e.g. 79006761' {...field} />
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
                      <Input type='email' placeholder='optional' {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='notes'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>

                    <FormControl>
                      <Textarea placeholder='optional' {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type='button'
                  variant='outline'
                  disabled={isPending}
                  onClick={() => guardedOnOpenChange(false)}
                >
                  Cancel
                </Button>

                <Button type='submit' disabled={isPending}>
                  {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Supplier'}
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
