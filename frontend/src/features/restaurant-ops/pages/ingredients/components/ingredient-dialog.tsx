import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UnsavedChangesDialog } from '@/components/unsaved-changes-dialog'
import { useIngredientCategories } from '../../../hooks/use-ingredient-categories'
import { useCreateIngredient, useUpdateIngredient } from '../../../hooks/use-ingredients'
import { useSuppliers } from '../../../hooks/use-suppliers'
import {
  defaultIngredientValues,
  ingredientSchema,
  type IngredientFormValues,
} from '../../../schemas/ingredient-schema'
import type { Ingredient } from '../../../types/restaurant-ops'

type IngredientDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  restaurantId: string
  ingredient?: Ingredient
}

export function IngredientDialog({
  open,
  onOpenChange,
  restaurantId,
  ingredient,
}: IngredientDialogProps) {
  const isEdit = Boolean(ingredient)

  const { data: categories } = useIngredientCategories(restaurantId)
  const { data: suppliers } = useSuppliers(restaurantId)

  const createIngredient = useCreateIngredient(restaurantId)
  const updateIngredient = useUpdateIngredient()
  const isPending = createIngredient.isPending || updateIngredient.isPending

  const form = useForm<IngredientFormValues>({
    resolver: zodResolver(ingredientSchema),
    defaultValues: defaultIngredientValues,
  })

  useEffect(() => {
    if (!open) return

    form.reset(
      ingredient
        ? {
            name: ingredient.name,
            ingredientCategoryId: ingredient.ingredientCategoryId ?? '',
            supplierIds: ingredient.suppliers.map((s) => s.id),
          }
        : defaultIngredientValues
    )
  }, [ingredient, form, open])

  async function onSubmit(values: IngredientFormValues) {
    const payload = {
      name: values.name,
      ingredientCategoryId: values.ingredientCategoryId || null,
      supplierIds: values.supplierIds ?? [],
    }

    if (isEdit && ingredient) {
      await updateIngredient.mutateAsync({ id: ingredient.id, payload })
    } else {
      await createIngredient.mutateAsync(payload)
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
            <DialogTitle>{isEdit ? 'Edit Ingredient' : 'Add Ingredient'}</DialogTitle>

            <DialogDescription>
              {isEdit ? 'Update this ingredient.' : 'e.g. Lettuce, Beef Patty, Oil.'}
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
                      <Input placeholder='e.g. Lettuce' autoFocus {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='ingredientCategoryId'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>

                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='No category' />
                        </SelectTrigger>
                      </FormControl>

                      <SelectContent>
                        {(categories ?? []).map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
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
                name='supplierIds'
                render={() => (
                  <FormItem>
                    <FormLabel>Suppliers</FormLabel>

                    <div className='max-h-48 space-y-3 overflow-y-auto rounded-md border p-4'>
                      {(suppliers ?? []).length === 0 ? (
                        <p className='text-sm text-muted-foreground'>
                          No suppliers yet for this restaurant.
                        </p>
                      ) : (
                        (suppliers ?? []).map((supplier) => (
                          <FormField
                            key={supplier.id}
                            control={form.control}
                            name='supplierIds'
                            render={({ field }) => (
                              <FormItem className='flex flex-row items-center space-y-0 space-x-3'>
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(supplier.id)}
                                    onCheckedChange={(checked) => {
                                      const current = field.value ?? []
                                      if (checked) {
                                        field.onChange([...current, supplier.id])
                                      } else {
                                        field.onChange(current.filter((id) => id !== supplier.id))
                                      }
                                    }}
                                  />
                                </FormControl>

                                <FormLabel className='font-normal'>{supplier.name}</FormLabel>
                              </FormItem>
                            )}
                          />
                        ))
                      )}
                    </div>

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
                  {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Ingredient'}
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
