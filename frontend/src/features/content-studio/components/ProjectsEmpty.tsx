import { FolderOpen } from 'lucide-react'

export function ProjectsEmpty() {
  return (
    <div className='flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center'>
      <FolderOpen className='mb-4 h-12 w-12 text-muted-foreground' />

      <h3 className='text-lg font-semibold'>No projects yet</h3>

      <p className='mt-2 text-sm text-muted-foreground'>
        Click "New Project" to create your first content workspace.
      </p>
    </div>
  )
}
