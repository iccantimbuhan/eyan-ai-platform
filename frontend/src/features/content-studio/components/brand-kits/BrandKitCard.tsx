import { useState } from 'react'
import { MoreHorizontal, Palette, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import type { BrandKit } from '../../types/brand-kit'
import { useDeleteBrandKit } from '../../hooks/use-delete-brand-kit'
import { BrandKitFormDialog } from './BrandKitFormDialog'

interface BrandKitCardProps {
  brandKit: BrandKit
  projectId: string
}

export function BrandKitCard({ brandKit, projectId }: BrandKitCardProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const deleteBrandKit = useDeleteBrandKit(projectId)

  async function handleDelete() {
    try {
      await deleteBrandKit.mutateAsync(brandKit.id)
      toast.success('Brand kit deleted successfully.')
      setConfirmOpen(false)
    } catch {
      toast.error('Failed to delete brand kit.')
    }
  }

  return (
    <Card data-presentation-target='content-studio.workspace.brand.kit'>
      <CardContent className='space-y-3 p-4'>
        <div className='flex items-start justify-between gap-2'>
          <div className='flex items-start gap-3'>
            <Palette className='mt-1 h-6 w-6 text-primary' />
            <div>
              <p className='font-medium'>{brandKit.name}</p>
              {brandKit.client && (
                <p className='text-sm text-muted-foreground'>
                  {brandKit.client}
                </p>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type='button'
                className='rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                aria-label='Brand kit actions'
              >
                <MoreHorizontal className='h-4 w-4' />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil className='mr-2 h-4 w-4' />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setConfirmOpen(true)}
                className='text-destructive'
              >
                <Trash2 className='mr-2 h-4 w-4' />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {brandKit.toneOfVoice && (
          <p className='line-clamp-2 text-sm text-muted-foreground'>
            {brandKit.toneOfVoice}
          </p>
        )}

        <div className='flex flex-wrap gap-1'>
          {(brandKit.primaryColors ?? []).slice(0, 5).map((color) => (
            <Badge key={color.hex} variant='outline' className='font-mono'>
              {color.hex}
            </Badge>
          ))}
          {(brandKit.approvedTerminology ?? []).slice(0, 3).map((term) => (
            <Badge key={term} variant='secondary'>
              {term}
            </Badge>
          ))}
        </div>
      </CardContent>

      <BrandKitFormDialog
        projectId={projectId}
        mode='edit'
        brandKit={brandKit}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title='Delete brand kit?'
        desc={`This will permanently delete "${brandKit.name}". Content already generated with this kit is not affected.`}
        destructive
        confirmText='Delete'
        isLoading={deleteBrandKit.isPending}
        handleConfirm={handleDelete}
      />
    </Card>
  )
}
