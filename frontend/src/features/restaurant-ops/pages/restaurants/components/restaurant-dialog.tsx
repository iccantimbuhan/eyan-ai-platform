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
import { UnsavedChangesDialog } from '@/components/unsaved-changes-dialog'
import { useCreateRestaurant, useUpdateRestaurant } from '../../../hooks/use-restaurants'
import {
  defaultRestaurantValues,
  restaurantSchema,
  type RestaurantFormValues,
} from '../../../schemas/restaurant-schema'
import type { Restaurant } from '../../../types/restaurant-ops'

type RestaurantDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  restaurant?: Restaurant
}

export function RestaurantDialog({
  open,
  onOpenChange,
  organizationId,
  restaurant,
}: RestaurantDialogProps) {
  const isEdit = Boolean(restaurant)

  const createRestaurant = useCreateRestaurant(organizationId)
  const updateRestaurant = useUpdateRestaurant()
  const isPending = createRestaurant.isPending || updateRestaurant.isPending

  const form = useForm<RestaurantFormValues>({
    resolver: zodResolver(restaurantSchema),
    defaultValues: defaultRestaurantValues,
  })

  useEffect(() => {
    if (!open) return

    form.reset(restaurant ? { name: restaurant.name } : defaultRestaurantValues)
  }, [restaurant, form, open])

  async function onSubmit(values: RestaurantFormValues) {
    if (isEdit && restaurant) {
      await updateRestaurant.mutateAsync({ id: restaurant.id, payload: values })
    } else {
      await createRestaurant.mutateAsync(values)
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
            <DialogTitle>{isEdit ? 'Edit Restaurant' : 'Add Restaurant'}</DialogTitle>

            <DialogDescription>
              {isEdit ? 'Update this restaurant.' : 'Add a new restaurant brand.'}
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
                      <Input placeholder="e.g. Burger's Ink" autoFocus {...field} />
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
                  {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Restaurant'}
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
