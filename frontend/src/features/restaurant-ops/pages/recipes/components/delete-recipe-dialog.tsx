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
import { useDeleteRecipe } from '../../../hooks/use-recipes'

type DeleteRecipeDialogProps = {
  recipeId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteRecipeDialog({ recipeId, open, onOpenChange }: DeleteRecipeDialogProps) {
  const deleteRecipe = useDeleteRecipe()

  const handleDelete = async () => {
    await deleteRecipe.mutateAsync(recipeId)
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Recipe</AlertDialogTitle>

          <AlertDialogDescription>
            Are you sure you want to delete this recipe? All of its ingredient lines will be
            deleted as well. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteRecipe.isPending}>Cancel</AlertDialogCancel>

          <AlertDialogAction
            disabled={deleteRecipe.isPending}
            onClick={(e) => {
              e.preventDefault()
              void handleDelete()
            }}
          >
            {deleteRecipe.isPending ? 'Deleting...' : 'Delete Recipe'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
