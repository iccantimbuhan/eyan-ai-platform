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
import { useDeleteIngredientCategory } from '../../../hooks/use-ingredient-categories'

type DeleteIngredientCategoryDialogProps = {
  categoryId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteIngredientCategoryDialog({
  categoryId,
  open,
  onOpenChange,
}: DeleteIngredientCategoryDialogProps) {
  const deleteCategory = useDeleteIngredientCategory()

  const handleDelete = async () => {
    await deleteCategory.mutateAsync(categoryId)
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Ingredient Category</AlertDialogTitle>

          <AlertDialogDescription>
            Are you sure you want to delete this category? Ingredients in it will be
            un-categorized, not deleted. This action cannot be undone.
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
