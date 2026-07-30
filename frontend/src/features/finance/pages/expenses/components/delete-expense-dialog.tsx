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
import { useDeleteExpense } from '../../../hooks/use-expenses'

type DeleteExpenseDialogProps = {
  expenseId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteExpenseDialog({
  expenseId,
  open,
  onOpenChange,
}: DeleteExpenseDialogProps) {
  const deleteExpense = useDeleteExpense()

  const handleDelete = async () => {
    await deleteExpense.mutateAsync(expenseId)
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Expense</AlertDialogTitle>

          <AlertDialogDescription>
            Are you sure you want to delete this expense? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteExpense.isPending}>Cancel</AlertDialogCancel>

          <AlertDialogAction
            disabled={deleteExpense.isPending}
            onClick={(e) => {
              e.preventDefault()
              void handleDelete()
            }}
          >
            {deleteExpense.isPending ? 'Deleting...' : 'Delete Expense'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
