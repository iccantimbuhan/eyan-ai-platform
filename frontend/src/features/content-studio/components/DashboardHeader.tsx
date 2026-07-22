import { Button } from '@/components/ui/button'

export function DashboardHeader() {
  return (
    <div className='mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>Content Studio</h1>

        <p className='mt-2 text-muted-foreground'>
          Create blogs, social media, scripts and videos from one place.
        </p>
      </div>

      <Button>+ New Project</Button>
    </div>
  )
}
