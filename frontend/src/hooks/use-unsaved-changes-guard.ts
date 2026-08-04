import { useState } from 'react'

type UseUnsavedChangesGuardOptions = {
  isDirty: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Wraps a dialog's onOpenChange so closing it while the form is dirty shows
 * a confirmation instead of silently discarding edits. Use `guardedOnOpenChange`
 * everywhere the dialog itself would normally call `onOpenChange` (the Dialog's
 * own prop, an explicit Cancel button, etc).
 */
export function useUnsavedChangesGuard({
  isDirty,
  onOpenChange,
}: UseUnsavedChangesGuardOptions) {
  const [pendingClose, setPendingClose] = useState(false)

  const guardedOnOpenChange = (open: boolean) => {
    if (!open && isDirty) {
      setPendingClose(true)
      return
    }
    onOpenChange(open)
  }

  const confirmDiscard = () => {
    setPendingClose(false)
    onOpenChange(false)
  }

  const cancelDiscard = () => setPendingClose(false)

  return {
    guardedOnOpenChange,
    unsavedChangesDialogProps: {
      open: pendingClose,
      onOpenChange: (open: boolean) => {
        if (!open) cancelDiscard()
      },
      onConfirm: confirmDiscard,
    },
  }
}
