import { SavePromptDialog } from '../prompt-library/SavePromptDialog'

interface NewPromptTemplateDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

// A thin, named entry point for the Asset Library's "New Prompt Template"
// action — reuses SavePromptDialog (and all of its form/mutation logic)
// entirely, just always in create mode and always scoped to this project.
// No form logic is duplicated here.
export function NewPromptTemplateDialog({
  projectId,
  open,
  onOpenChange,
}: NewPromptTemplateDialogProps) {
  return (
    <SavePromptDialog
      open={open}
      onOpenChange={onOpenChange}
      prompt={null}
      projectId={projectId}
    />
  )
}
