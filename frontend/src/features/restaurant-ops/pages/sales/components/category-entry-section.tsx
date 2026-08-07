import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateSalesCategory, useSalesCategories } from '../../../hooks/use-sales-reference'
import { useCreateCategoryEntry, useDeleteCategoryEntry } from '../../../hooks/use-sales'
import {
  categoryEntrySchema,
  defaultCategoryEntryValues,
  type CategoryEntryFormValues,
} from '../../../schemas/sales-schema'
import type { SalesCategoryEntry } from '../../../types/restaurant-ops'

type CategoryEntrySectionProps = {
  restaurantId: string
  salesId: string
  entries: SalesCategoryEntry[]
}

export function CategoryEntrySection({ restaurantId, salesId, entries }: CategoryEntrySectionProps) {
  const { data: categories } = useSalesCategories(restaurantId)
  const createCategory = useCreateSalesCategory(restaurantId)
  const createEntry = useCreateCategoryEntry()
  const deleteEntry = useDeleteCategoryEntry()
  const [newCategoryName, setNewCategoryName] = useState('')

  const form = useForm<CategoryEntryFormValues>({
    resolver: zodResolver(categoryEntrySchema),
    defaultValues: defaultCategoryEntryValues,
  })

  useEffect(() => {
    form.reset(defaultCategoryEntryValues)
  }, [salesId, form])

  async function onSubmit(values: CategoryEntryFormValues) {
    await createEntry.mutateAsync({
      salesId,
      salesCategoryId: values.salesCategoryId,
      quantity: values.quantity ? Number(values.quantity) : undefined,
      amount: Number(values.amount),
    })
    form.reset(defaultCategoryEntryValues)
  }

  async function addNewCategory() {
    if (!newCategoryName.trim()) return
    const category = await createCategory.mutateAsync(newCategoryName.trim())
    form.setValue('salesCategoryId', category.id)
    setNewCategoryName('')
  }

  return (
    <div className='space-y-3'>
      <p className='text-sm font-medium'>Categories</p>

      <div className='space-y-2'>
        {entries.length === 0 ? (
          <p className='text-sm text-muted-foreground'>No category entries yet.</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className='flex items-center justify-between rounded-md border px-3 py-2'>
              <span className='text-sm'>
                {entry.categoryName}: &euro;{entry.amount}
                {entry.quantity ? ` (qty ${entry.quantity})` : ''}
              </span>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                disabled={deleteEntry.isPending}
                onClick={() => deleteEntry.mutate({ salesId, entryId: entry.id })}
              >
                <Trash2 className='h-4 w-4 text-destructive' />
              </Button>
            </div>
          ))
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='flex items-end gap-2'>
          <FormField
            control={form.control}
            name='salesCategoryId'
            render={({ field }) => (
              <FormItem className='flex-1'>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='Category' />
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
            name='quantity'
            render={({ field }) => (
              <FormItem className='w-20'>
                <FormControl>
                  <Input inputMode='decimal' placeholder='Qty' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='amount'
            render={({ field }) => (
              <FormItem className='w-24'>
                <FormControl>
                  <Input inputMode='decimal' placeholder='Amount' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type='submit' size='icon' aria-label='Add category entry' disabled={createEntry.isPending}>
            <Plus className='h-4 w-4' />
          </Button>
        </form>
      </Form>

      <div className='flex items-end gap-2'>
        <Input
          placeholder='New category name (e.g. Pizza)'
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          className='flex-1'
        />
        <Button type='button' variant='outline' size='sm' onClick={addNewCategory} disabled={createCategory.isPending}>
          Add Category
        </Button>
      </div>
    </div>
  )
}
