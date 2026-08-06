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
import {
  useCreateIngredientCategory,
  useUpdateIngredientCategory,
} from '../../../hooks/use-ingredient-categories'
import {
  defaultIngredientCategoryValues,
  ingredientCategorySchema,
  type IngredientCategoryFormValues,
} from '../../../schemas/ingredient-category-schema'
import type { IngredientCategory } from '../../../types/restaurant-ops'

type IngredientCategoryDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  restaurantId: string
  category?: IngredientCategory
}

export function IngredientCategoryDialog({
  open,
  onOpenChange,
  restaurantId,
  category,
}: IngredientCategoryDialogProps) {
  const isEdit = Boolean(category)

  const createCategory = useCreateIngredientCategory(restaurantId)
  const updateCategory = useUpdateIngredientCategory()
  const isPending = createCategory.isPending || updateCategory.isPending

  const form = useForm<IngredientCategoryFormValues>({
    resolver: zodResolver(ingredientCategorySchema),
    defaultValues: defaultIngredientCategoryValues,
  })

  useEffect(() => {
    if (!open) return

    form.reset(category ? { name: category.name } : defaultIngredientCategoryValues)
  }, [category, form, open])

  async function onSubmit(values: IngredientCategoryFormValues) {
    if (isEdit && category) {
      await updateCategory.mutateAsync({ id: category.id, payload: values })
    } else {
      await createCategory.mutateAsync(values)
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
            <DialogTitle>{isEdit ? 'Edit Ingredient Category' : 'Add Ingredient Category'}</DialogTitle>

            <DialogDescription>
              {isEdit ? 'Update this category.' : 'e.g. Vegetables, Cheese, Meat.'}
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
                      <Input placeholder='e.g. Vegetables' autoFocus {...field} />
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
