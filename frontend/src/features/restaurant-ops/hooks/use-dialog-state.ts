import { useState } from 'react'

// Identical shape to finance's use-expense-dialog.ts — shared here across
// Restaurant/Branch/Menu Category/Menu Item's four otherwise-independent
// create dialogs instead of copy-pasting the same 8 lines four times.
export function useDialogState() {
  const [open, setOpen] = useState(false)

  return {
    open,
    setOpen,
    openDialog: () => setOpen(true),
    closeDialog: () => setOpen(false),
  }
}
