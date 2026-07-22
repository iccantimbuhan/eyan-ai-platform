import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

export function NewProjectDialog() {
  const [name, setName] = useState('')

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus className='mr-2 h-4 w-4' />
          New Project
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>

          <DialogDescription>Create a new content workspace.</DialogDescription>
        </DialogHeader>

        <Input
          placeholder='Project name'
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <DialogFooter>
          <Button disabled={!name}>Create Project</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
