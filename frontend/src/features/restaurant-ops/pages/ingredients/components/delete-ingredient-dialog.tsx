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
import { useDeleteIngredient } from '../../../hooks/use-ingredients'

type DeleteIngredientDialogProps = {
  ingredientId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteIngredientDialog({
  ingredientId,
  open,
  onOpenChange,
}: DeleteIngredientDialogProps) {
  const deleteIngredient = useDeleteIngredient()

  const handleDelete = async () => {
    await deleteIngredient.mutateAsync(ingredientId)
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Ingredient</AlertDialogTitle>

          <AlertDialogDescription>
            Are you sure you want to delete this ingredient? Any recipe lines using it will be
            deleted as well. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteIngredient.isPending}>Cancel</AlertDialogCancel>

          <AlertDialogAction
            disabled={deleteIngredient.isPending}
            onClick={(e) => {
              e.preventDefault()
              void handleDelete()
            }}
          >
            {deleteIngredient.isPending ? 'Deleting...' : 'Delete Ingredient'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
