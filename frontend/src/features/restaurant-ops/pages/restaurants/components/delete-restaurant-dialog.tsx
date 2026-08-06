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
import { useDeleteRestaurant } from '../../../hooks/use-restaurants'

type DeleteRestaurantDialogProps = {
  restaurantId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteRestaurantDialog({
  restaurantId,
  open,
  onOpenChange,
}: DeleteRestaurantDialogProps) {
  const deleteRestaurant = useDeleteRestaurant()

  const handleDelete = async () => {
    await deleteRestaurant.mutateAsync(restaurantId)
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Restaurant</AlertDialogTitle>

          <AlertDialogDescription>
            Are you sure you want to delete this restaurant? Its branches, menu categories, and
            menu items will be deleted as well. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteRestaurant.isPending}>Cancel</AlertDialogCancel>

          <AlertDialogAction
            disabled={deleteRestaurant.isPending}
            onClick={(e) => {
              e.preventDefault()
              void handleDelete()
            }}
          >
            {deleteRestaurant.isPending ? 'Deleting...' : 'Delete Restaurant'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
