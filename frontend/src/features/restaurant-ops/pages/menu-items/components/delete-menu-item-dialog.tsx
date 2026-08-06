import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useDeleteMenuItem } from '../../../hooks/use-menu-items'

type DeleteMenuItemDialogProps = {
  itemId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteMenuItemDialog({ itemId, open, onOpenChange }: DeleteMenuItemDialogProps) {
  const deleteItem = useDeleteMenuItem()

  const handleDelete = async () => {
    await deleteItem.mutateAsync(itemId)
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Menu Item</AlertDialogTitle>

          <AlertDialogDescription>
            Are you sure you want to delete this menu item? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteItem.isPending}>Cancel</AlertDialogCancel>

          <AlertDialogAction
            disabled={deleteItem.isPending}
            onClick={(e) => {
              e.preventDefault()
              void handleDelete()
            }}
          >
            {deleteItem.isPending ? 'Deleting...' : 'Delete Item'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
