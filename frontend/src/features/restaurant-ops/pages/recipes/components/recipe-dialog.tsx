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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { UnsavedChangesDialog } from '@/components/unsaved-changes-dialog'
import { useCreateRecipe, useUpdateRecipe } from '../../../hooks/use-recipes'
import {
  defaultRecipeValues,
  recipeSchema,
  type RecipeFormValues,
} from '../../../schemas/recipe-schema'
import type { MenuItem, Recipe } from '../../../types/restaurant-ops'

type RecipeDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  restaurantId: string
  // Menu items that don't already have a recipe — only relevant when
  // creating; editing an existing recipe keeps its menuItemId fixed
  // (Recipe.menuItemId is unique and immutable after creation, backend-side).
  availableMenuItems: MenuItem[]
  menuItemName?: string
  recipe?: Recipe
}

export function RecipeDialog({
  open,
  onOpenChange,
  restaurantId,
  availableMenuItems,
  menuItemName,
  recipe,
}: RecipeDialogProps) {
  const isEdit = Boolean(recipe)

  const createRecipe = useCreateRecipe(restaurantId)
  const updateRecipe = useUpdateRecipe()
  const isPending = createRecipe.isPending || updateRecipe.isPending

  const form = useForm<RecipeFormValues>({
    resolver: zodResolver(recipeSchema),
    defaultValues: defaultRecipeValues,
  })

  useEffect(() => {
    if (!open) return

    form.reset(
      recipe
        ? { menuItemId: recipe.menuItemId, notes: recipe.notes ?? '' }
        : defaultRecipeValues
    )
  }, [recipe, form, open])

  async function onSubmit(values: RecipeFormValues) {
    if (isEdit && recipe) {
      await updateRecipe.mutateAsync({ id: recipe.id, payload: { notes: values.notes || null } })
    } else {
      await createRecipe.mutateAsync({
        menuItemId: values.menuItemId,
        notes: values.notes || null,
      })
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
            <DialogTitle>{isEdit ? 'Edit Recipe' : 'Add Recipe'}</DialogTitle>

            <DialogDescription>
              {isEdit
                ? 'Update this recipe.'
                : 'A recipe links one menu item to the ingredients consumed when it sells.'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
              <FormField
                control={form.control}
                name='menuItemId'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Menu Item</FormLabel>

                    {isEdit ? (
                      <FormControl>
                        <Textarea readOnly rows={1} value={menuItemName ?? ''} className='resize-none' />
                      </FormControl>
                    ) : (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Select a menu item' />
                          </SelectTrigger>
                        </FormControl>

                        <SelectContent>
                          {availableMenuItems.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

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
                  {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Recipe'}
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
