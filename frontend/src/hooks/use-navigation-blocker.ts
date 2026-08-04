import { useBlocker } from '@tanstack/react-router'

/**
 * Blocks route navigation (including tab close/refresh) while `isDirty` is
 * true, surfacing an UnsavedChangesDialog-compatible `{ open, onConfirm }` pair.
 */
export function useNavigationBlocker(isDirty: boolean) {
  const { status, proceed, reset } = useBlocker({
    shouldBlockFn: () => isDirty,
    enableBeforeUnload: isDirty,
    withResolver: true,
  })

  return {
    unsavedChangesDialogProps: {
      open: status === 'blocked',
      onOpenChange: (open: boolean) => {
        if (!open) reset?.()
      },
      onConfirm: () => proceed?.(),
    },
  }
}
