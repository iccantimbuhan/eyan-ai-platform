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
import { useDeleteUnit } from '../../../hooks/use-units'

type DeleteUnitDialogProps = {
  unitId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteUnitDialog({ unitId, open, onOpenChange }: DeleteUnitDialogProps) {
  const deleteUnit = useDeleteUnit()

  const handleDelete = async () => {
    await deleteUnit.mutateAsync(unitId)
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Unit</AlertDialogTitle>

          <AlertDialogDescription>
            Are you sure you want to delete this unit? Any recipe lines using it will be deleted
            as well. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteUnit.isPending}>Cancel</AlertDialogCancel>

          <AlertDialogAction
            disabled={deleteUnit.isPending}
            onClick={(e) => {
              e.preventDefault()
              void handleDelete()
            }}
          >
            {deleteUnit.isPending ? 'Deleting...' : 'Delete Unit'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
