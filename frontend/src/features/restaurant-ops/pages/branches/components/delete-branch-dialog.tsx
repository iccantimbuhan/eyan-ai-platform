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
import { useDeleteBranch } from '../../../hooks/use-branches'

type DeleteBranchDialogProps = {
  branchId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteBranchDialog({ branchId, open, onOpenChange }: DeleteBranchDialogProps) {
  const deleteBranch = useDeleteBranch()

  const handleDelete = async () => {
    await deleteBranch.mutateAsync(branchId)
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Branch</AlertDialogTitle>

          <AlertDialogDescription>
            Are you sure you want to delete this branch? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteBranch.isPending}>Cancel</AlertDialogCancel>

          <AlertDialogAction
            disabled={deleteBranch.isPending}
            onClick={(e) => {
              e.preventDefault()
              void handleDelete()
            }}
          >
            {deleteBranch.isPending ? 'Deleting...' : 'Delete Branch'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
