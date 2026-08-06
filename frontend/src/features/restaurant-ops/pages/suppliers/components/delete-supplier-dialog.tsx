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
import { useDeleteSupplier } from '../../../hooks/use-suppliers'

type DeleteSupplierDialogProps = {
  supplierId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteSupplierDialog({
  supplierId,
  open,
  onOpenChange,
}: DeleteSupplierDialogProps) {
  const deleteSupplier = useDeleteSupplier()

  const handleDelete = async () => {
    await deleteSupplier.mutateAsync(supplierId)
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Supplier</AlertDialogTitle>

          <AlertDialogDescription>
            Are you sure you want to delete this supplier? It will be unlinked from any
            ingredients it supplies. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteSupplier.isPending}>Cancel</AlertDialogCancel>

          <AlertDialogAction
            disabled={deleteSupplier.isPending}
            onClick={(e) => {
              e.preventDefault()
              void handleDelete()
            }}
          >
            {deleteSupplier.isPending ? 'Deleting...' : 'Delete Supplier'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
