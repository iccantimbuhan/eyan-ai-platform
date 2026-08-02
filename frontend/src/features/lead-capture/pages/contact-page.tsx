import { Link } from '@tanstack/react-router'
import { ThemeSwitch } from '@/components/theme-switch'
import { LeadCaptureForm } from '../components/lead-capture-form'

export function ContactPage() {
  return (
    <div className='min-h-svh bg-background'>
      <header className='flex items-center justify-between px-6 py-4'>
        <Link to='/' className='text-lg font-bold tracking-tight'>
          EYAN Studio
        </Link>
        <ThemeSwitch />
      </header>

      <main className='mx-auto max-w-2xl space-y-8 px-6 pb-24 pt-8'>
        <div className='space-y-2 text-center'>
          <h1 className='text-3xl font-bold tracking-tight sm:text-4xl'>
            Let&apos;s Talk
          </h1>
          <p className='text-muted-foreground'>
            Interested in working together? Send us a few details and we&apos;ll
            follow up.
          </p>
        </div>

        <LeadCaptureForm />
      </main>
    </div>
  )
}
