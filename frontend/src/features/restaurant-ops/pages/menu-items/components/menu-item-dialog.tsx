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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { UnsavedChangesDialog } from '@/components/unsaved-changes-dialog'
import { useCreateMenuItem, useUpdateMenuItem } from '../../../hooks/use-menu-items'
import { MENU_ITEM_STATUS_OPTIONS } from '../../../lib/status-labels'
import {
  defaultMenuItemValues,
  menuItemSchema,
  type MenuItemFormValues,
} from '../../../schemas/menu-item-schema'
import type { MenuCategory, MenuItem } from '../../../types/restaurant-ops'

type MenuItemDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  restaurantId: string
  categories: MenuCategory[]
  item?: MenuItem
}

export function MenuItemDialog({
  open,
  onOpenChange,
  restaurantId,
  categories,
  item,
}: MenuItemDialogProps) {
  const isEdit = Boolean(item)

  const createItem = useCreateMenuItem(restaurantId)
  const updateItem = useUpdateMenuItem()
  const isPending = createItem.isPending || updateItem.isPending

  const form = useForm<MenuItemFormValues>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: defaultMenuItemValues,
  })

  useEffect(() => {
    if (!open) return

    if (item) {
      form.reset({
        menuCategoryId: item.menuCategoryId,
        name: item.name,
        description: item.description ?? '',
        price: item.price,
        imagePath: item.imagePath ?? '',
        available: item.available,
        status: item.status,
      })
    } else {
      form.reset({
        ...defaultMenuItemValues,
        menuCategoryId: categories[0]?.id ?? '',
      })
    }
  }, [item, form, open, categories])

  async function onSubmit(values: MenuItemFormValues) {
    const payload = {
      menuCategoryId: values.menuCategoryId,
      name: values.name,
      description: values.description || undefined,
      price: values.price,
      imagePath: values.imagePath || undefined,
      available: values.available,
      status: values.status,
    }

    if (isEdit && item) {
      await updateItem.mutateAsync({ id: item.id, payload })
    } else {
      await createItem.mutateAsync(payload)
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
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Menu Item' : 'Add Menu Item'}</DialogTitle>

            <DialogDescription>
              {isEdit ? 'Update this menu item.' : 'Add a new item to the menu.'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
              <div className='grid grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='name'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>

                      <FormControl>
                        <Input placeholder='e.g. Classic Burger' autoFocus {...field} />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='menuCategoryId'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>

                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className='w-full'>
                            <SelectValue placeholder='Select category' />
                          </SelectTrigger>
                        </FormControl>

                        <SelectContent>
                          {categories.map((category) => (
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
              </div>

              <FormField
                control={form.control}
                name='description'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>

                    <FormControl>
                      <Textarea placeholder='Optional' rows={2} {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='grid grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='price'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price</FormLabel>

                      <FormControl>
                        <Input inputMode='decimal' placeholder='0.00' {...field} />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='status'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>

                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className='w-full'>
                            <SelectValue placeholder='Select status' />
                          </SelectTrigger>
                        </FormControl>

                        <SelectContent>
                          {MENU_ITEM_STATUS_OPTIONS.map((option) => (
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

              <FormField
                control={form.control}
                name='imagePath'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL</FormLabel>

                    <FormControl>
                      <Input placeholder='Optional' {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='available'
                render={({ field }) => (
                  <FormItem className='flex items-center justify-between rounded-md border p-4'>
                    <div className='space-y-0.5'>
                      <FormLabel>Available</FormLabel>
                      <p className='text-sm text-muted-foreground'>
                        Whether this item can be ordered right now.
                      </p>
                    </div>

                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
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

                <Button type='submit' disabled={isPending || categories.length === 0}>
                  {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Item'}
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
