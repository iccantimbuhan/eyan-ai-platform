import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useIngredients } from '../../../hooks/use-ingredients'
import {
  useCreateRecipeIngredient,
  useDeleteRecipeIngredient,
} from '../../../hooks/use-recipes'
import { useUnits } from '../../../hooks/use-units'
import {
  defaultRecipeIngredientLineValues,
  recipeIngredientLineSchema,
  type RecipeIngredientLineFormValues,
} from '../../../schemas/recipe-schema'
import type { Recipe } from '../../../types/restaurant-ops'

type RecipeIngredientsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  restaurantId: string
  recipe?: Recipe
  menuItemName?: string
}

export function RecipeIngredientsDialog({
  open,
  onOpenChange,
  restaurantId,
  recipe,
  menuItemName,
}: RecipeIngredientsDialogProps) {
  const { data: ingredients } = useIngredients(restaurantId)
  const { data: units } = useUnits(restaurantId)
  const createLine = useCreateRecipeIngredient()
  const deleteLine = useDeleteRecipeIngredient()

  const form = useForm<RecipeIngredientLineFormValues>({
    resolver: zodResolver(recipeIngredientLineSchema),
    defaultValues: defaultRecipeIngredientLineValues,
  })

  useEffect(() => {
    if (!open) return
    form.reset(defaultRecipeIngredientLineValues)
  }, [open, recipe, form])

  async function onSubmit(values: RecipeIngredientLineFormValues) {
    if (!recipe) return

    await createLine.mutateAsync({
      recipeId: recipe.id,
      payload: {
        ingredientId: values.ingredientId,
        unitId: values.unitId,
        quantity: Number(values.quantity),
      },
    })

    form.reset(defaultRecipeIngredientLineValues)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Recipe Ingredients</DialogTitle>

          <DialogDescription>
            {menuItemName
              ? `What's consumed when ${menuItemName} is sold.`
              : 'What&rsquo;s consumed when this menu item is sold.'}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-2'>
          {(recipe?.ingredients ?? []).length === 0 ? (
            <p className='text-sm text-muted-foreground'>No ingredients on this recipe yet.</p>
          ) : (
            recipe?.ingredients.map((line) => (
              <div
                key={line.id}
                className='flex items-center justify-between rounded-md border px-3 py-2'
              >
                <span className='text-sm'>
                  {line.quantity} {line.unitAbbreviation} {line.ingredientName}
                </span>

                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  disabled={deleteLine.isPending}
                  onClick={() => deleteLine.mutate(line.id)}
                >
                  <Trash2 className='h-4 w-4 text-destructive' />
                </Button>
              </div>
            ))
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4 border-t pt-4'>
            <div className='grid grid-cols-2 gap-3'>
              <FormField
                control={form.control}
                name='ingredientId'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ingredient</FormLabel>

                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select' />
                        </SelectTrigger>
                      </FormControl>

                      <SelectContent>
                        {(ingredients ?? []).map((ingredient) => (
                          <SelectItem key={ingredient.id} value={ingredient.id}>
                            {ingredient.name}
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
                name='unitId'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>

                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select' />
                        </SelectTrigger>
                      </FormControl>

                      <SelectContent>
                        {(units ?? []).map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.abbreviation}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='quantity'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>

                  <FormControl>
                    <Input inputMode='decimal' placeholder='e.g. 20' {...field} />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type='submit' disabled={createLine.isPending || !recipe} className='w-full'>
              {createLine.isPending ? 'Adding...' : 'Add Ingredient'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
