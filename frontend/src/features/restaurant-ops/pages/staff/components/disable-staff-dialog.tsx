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
import { useDisableStaff } from '../../../hooks/use-staff'

type DisableStaffDialogProps = {
  organizationId: string
  userId: string
  name: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DisableStaffDialog({
  organizationId,
  userId,
  name,
  open,
  onOpenChange,
}: DisableStaffDialogProps) {
  const disableStaff = useDisableStaff(organizationId)

  const handleDisable = async () => {
    await disableStaff.mutateAsync(userId)
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Disable Staff Member</AlertDialogTitle>

          <AlertDialogDescription>
            This removes every access grant {name} has under this organization — every
            Restaurant and Branch they were assigned to. Their account itself isn&rsquo;t
            deleted, and this doesn&rsquo;t affect any other business they may work for on this
            platform. This action cannot be undone from here.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={disableStaff.isPending}>Cancel</AlertDialogCancel>

          <AlertDialogAction
            disabled={disableStaff.isPending}
            onClick={(e) => {
              e.preventDefault()
              void handleDisable()
            }}
          >
            {disableStaff.isPending ? 'Disabling...' : 'Disable Staff Member'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
