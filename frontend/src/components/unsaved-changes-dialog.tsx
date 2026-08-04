import { ConfirmDialog } from '@/components/confirm-dialog'

type UnsavedChangesDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function UnsavedChangesDialog({
  open,
  onOpenChange,
  onConfirm,
}: UnsavedChangesDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title='Unsaved changes'
      desc='You have unsaved changes. Are you sure you want to leave without saving?'
      confirmText='Leave'
      cancelBtnText='Stay'
      destructive
      handleConfirm={onConfirm}
    />
  )
}
