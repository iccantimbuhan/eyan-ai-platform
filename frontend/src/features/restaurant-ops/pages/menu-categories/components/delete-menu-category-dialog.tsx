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
import { useDeleteMenuCategory } from '../../../hooks/use-menu-categories'

type DeleteMenuCategoryDialogProps = {
  categoryId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteMenuCategoryDialog({
  categoryId,
  open,
  onOpenChange,
}: DeleteMenuCategoryDialogProps) {
  const deleteCategory = useDeleteMenuCategory()

  const handleDelete = async () => {
    await deleteCategory.mutateAsync(categoryId)
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Menu Category</AlertDialogTitle>

          <AlertDialogDescription>
            Are you sure you want to delete this category? Its menu items will be deleted as
            well. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteCategory.isPending}>Cancel</AlertDialogCancel>

          <AlertDialogAction
            disabled={deleteCategory.isPending}
            onClick={(e) => {
              e.preventDefault()
              void handleDelete()
            }}
          >
            {deleteCategory.isPending ? 'Deleting...' : 'Delete Category'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
