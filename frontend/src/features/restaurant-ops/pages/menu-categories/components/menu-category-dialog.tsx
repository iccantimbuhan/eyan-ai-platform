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
import { useCreateMenuCategory, useUpdateMenuCategory } from '../../../hooks/use-menu-categories'
import {
  defaultMenuCategoryValues,
  menuCategorySchema,
  type MenuCategoryFormValues,
} from '../../../schemas/menu-category-schema'
import type { MenuCategory } from '../../../types/restaurant-ops'

type MenuCategoryDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  restaurantId: string
  category?: MenuCategory
}

export function MenuCategoryDialog({
  open,
  onOpenChange,
  restaurantId,
  category,
}: MenuCategoryDialogProps) {
  const isEdit = Boolean(category)

  const createCategory = useCreateMenuCategory(restaurantId)
  const updateCategory = useUpdateMenuCategory()
  const isPending = createCategory.isPending || updateCategory.isPending

  const form = useForm<MenuCategoryFormValues>({
    resolver: zodResolver(menuCategorySchema),
    defaultValues: defaultMenuCategoryValues,
  })

  useEffect(() => {
    if (!open) return

    form.reset(
      category
        ? { name: category.name, displayOrder: String(category.displayOrder) }
        : defaultMenuCategoryValues
    )
  }, [category, form, open])

  async function onSubmit(values: MenuCategoryFormValues) {
    const payload = {
      name: values.name,
      displayOrder: values.displayOrder ? Number(values.displayOrder) : undefined,
    }

    if (isEdit && category) {
      await updateCategory.mutateAsync({ id: category.id, payload })
    } else {
      await createCategory.mutateAsync(payload)
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
            <DialogTitle>{isEdit ? 'Edit Menu Category' : 'Add Menu Category'}</DialogTitle>

            <DialogDescription>
              {isEdit ? 'Update this menu category.' : 'e.g. Burgers, Wraps, Drinks.'}
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
                      <Input placeholder='e.g. Burgers' autoFocus {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='displayOrder'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Order</FormLabel>

                    <FormControl>
                      <Input inputMode='numeric' placeholder='0' {...field} />
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
                  {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Category'}
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
