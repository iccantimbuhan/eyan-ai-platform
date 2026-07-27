import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

import type { BrandKit } from '../../types/brand-kit'
import { useCreateBrandKit } from '../../hooks/use-create-brand-kit'
import { useUpdateBrandKit } from '../../hooks/use-update-brand-kit'
import {
  brandKitSchema,
  brandKitToFormValues,
  brandKitValuesToInput,
  defaultBrandKitValues,
  type BrandKitFormValues,
} from './brand-kit-schema'

interface BrandKitFormDialogProps {
  projectId: string
  mode: 'create' | 'edit'
  brandKit?: BrandKit
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BrandKitFormDialog({
  projectId,
  mode,
  brandKit,
  open,
  onOpenChange,
}: BrandKitFormDialogProps) {
  const create = useCreateBrandKit(projectId)
  const update = useUpdateBrandKit(projectId)

  const form = useForm<BrandKitFormValues>({
    resolver: zodResolver(brandKitSchema),
    defaultValues: defaultBrandKitValues,
  })

  useEffect(() => {
    if (open) {
      form.reset(brandKit ? brandKitToFormValues(brandKit) : defaultBrandKitValues)
    }
  }, [form, open, brandKit])

  async function submit(values: BrandKitFormValues) {
    try {
      if (mode === 'create') {
        await create.mutateAsync(brandKitValuesToInput(values, projectId))
        toast.success('Brand kit created successfully.')
      } else if (brandKit) {
        const { projectId: _projectId, ...payload } = brandKitValuesToInput(
          values,
          projectId
        )
        await update.mutateAsync({ id: brandKit.id, payload })
        toast.success('Brand kit updated successfully.')
      }

      onOpenChange(false)
    } catch {
      toast.error(
        mode === 'create'
          ? 'Failed to create brand kit.'
          : 'Failed to update brand kit.'
      )
    }
  }

  const pending = create.isPending || update.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create Brand Kit' : 'Edit Brand Kit'}
          </DialogTitle>
          <DialogDescription>
            Define the brand guidance generated content and images for this
            project should follow.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className='space-y-6'>
            <div className='grid gap-4 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand Name</FormLabel>
                    <FormControl>
                      <Input placeholder='Acme' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='client'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <FormControl>
                      <Input placeholder='Acme Corp' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='grid gap-4 sm:grid-cols-3'>
              <FormField
                control={form.control}
                name='logosText'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logos (URLs, comma-separated)</FormLabel>
                    <FormControl>
                      <Input placeholder='https://.../logo.png' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='primaryColorsText'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Colors (hex, comma-separated)</FormLabel>
                    <FormControl>
                      <Input placeholder='#1D4ED8, #0F172A' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='secondaryColorsText'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secondary Colors (hex, comma-separated)</FormLabel>
                    <FormControl>
                      <Input placeholder='#F59E0B' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='grid gap-4 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='fontsText'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fonts (comma-separated)</FormLabel>
                    <FormControl>
                      <Input placeholder='Inter, Georgia' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='typography'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Typography Notes</FormLabel>
                    <FormControl>
                      <Input placeholder='Bold headlines, sentence case' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='grid gap-4 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='toneOfVoice'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tone of Voice</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='Confident, friendly, expert'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='writingStyle'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Writing Style</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='Short sentences, active voice'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='grid gap-4 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='audience'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Audience</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='Small business owners aged 30-50'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='ctaStyle'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CTA Style</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='Direct, action-first: "Get started"'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='grid gap-4 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='approvedTerminologyText'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Approved Terminology (comma-separated)</FormLabel>
                    <FormControl>
                      <Textarea placeholder='Acme, AcmeCloud' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='restrictedWordsText'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Restricted Words (comma-separated)</FormLabel>
                    <FormControl>
                      <Textarea placeholder='cheap, discount' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='imageStyle'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image Style</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Bright, minimalist product photography'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='brandGuidelines'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brand Guidelines</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Additional guidance for AI-generated content'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='socialMediaGuidelines'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Social Media Guidelines</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Hashtag usage, posting cadence, platform tone'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={pending}>
                {pending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
