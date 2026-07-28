import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Loader2, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeSwitch } from '@/components/theme-switch'
import { useLogin } from '@/features/auth/hooks/use-login'
import { projectsApi } from '@/features/content-studio/api/projects.api'

import { TourRecap } from './components/TourRecap'
import { useTourStore } from './store/tour-store'

const TECH_STACK = [
  'React',
  'TypeScript',
  'TanStack Router',
  'TanStack Query',
  'Express',
  'Prisma',
  'PostgreSQL',
  'FFmpeg',
  'Faster Whisper',
  'Ollama',
  'Docker',
]

const TIMELINE = [
  { sprint: 'Sprint 1', title: 'Engineering Foundation & Authentication' },
  { sprint: 'Sprint 3', title: 'Content Studio & Prompt Library' },
  { sprint: 'Sprint 4', title: 'AI Image Studio & Provider Architecture' },
  { sprint: 'Sprint 6', title: 'Enterprise Creative Production Suite' },
  { sprint: 'Sprint 7.1', title: 'MCP Automation Foundation' },
  { sprint: 'Sprint 7.2', title: 'AI Video Production Pipeline' },
  { sprint: 'Sprint 8', title: 'Interactive Portfolio Experience', current: true },
]

const CASE_STUDY = [
  {
    title: 'Problem',
    body: 'A recruiter looking at a deployed AI platform has no way to understand what it actually does without a live walkthrough — screenshots and a feature list ask for trust instead of demonstrating it.',
  },
  {
    title: 'Solution',
    body: 'A guided tour that drives the real application end-to-end: real upload, a real AI-generated FFmpeg plan, real FFmpeg + Faster Whisper execution, a real review approval, and a real publishing-ready state — narrated by a thin orchestration layer, not a separate demo build.',
  },
  {
    title: 'Architecture',
    body: 'The tour adds zero duplicated business logic. It reuses the existing upload mutation, planner mutation, execution mutation, and review mutation as-is, and only decides when to call them and which tab should be visible.',
  },
  {
    title: 'Challenges',
    body: 'The app had no public route, no unauthenticated API, and no bundled demo asset. Solving that meant moving the authenticated app under /app to free the root path, seeding one fixed demo account that logs in through the real /auth/login endpoint, and bundling a short sample clip so live FFmpeg + Whisper execution finishes in well under a minute.',
  },
  {
    title: 'Future Roadmap',
    body: 'A real narrated sample clip for more meaningful subtitle output, and backend progress events so the execution step can report genuine per-stage status instead of an honest "still running" indicator.',
  },
]

export function PortfolioLanding() {
  const navigate = useNavigate()
  const login = useLogin()
  const tour = useTourStore()

  const [isStarting, setIsStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)

  const startDemo = async () => {
    setIsStarting(true)
    setStartError(null)

    try {
      await login('demo@eyanstudio.dev', 'EyanStudioDemo!2026')

      const project = await projectsApi.createProject({
        name: `Portfolio Demo — ${new Date().toLocaleString()}`,
      })

      tour.start(project.id)

      await navigate({
        to: '/app/content-studio/$projectId',
        params: { projectId: project.id },
        search: { tab: 'video' },
      })
    } catch {
      setStartError('Could not start the demo. Please try again in a moment.')
    } finally {
      setIsStarting(false)
    }
  }

  return (
    <div className='min-h-svh bg-background'>
      <header className='flex items-center justify-between px-6 py-4'>
        <span className='text-lg font-bold tracking-tight'>EYAN Studio</span>
        <ThemeSwitch />
      </header>

      <main className='mx-auto max-w-5xl space-y-24 px-6 pb-24'>
        {tour.step === 'recap' ? (
          <TourRecap />
        ) : (
          <section className='space-y-6 py-16 text-center'>
            <h1 className='text-4xl font-bold tracking-tight sm:text-6xl'>
              Experience EYAN Studio
            </h1>
            <p className='mx-auto max-w-2xl text-lg text-muted-foreground'>
              An AI-powered Content Production Platform designed to automate content creation,
              review, editing and publishing workflows.
            </p>

            <div className='flex flex-col items-center gap-3'>
              <Button size='lg' className='gap-2 px-8' onClick={startDemo} disabled={isStarting}>
                {isStarting ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <Play className='h-4 w-4' />
                )}
                Start Interactive Demo
              </Button>

              {startError && <p className='text-sm text-destructive'>{startError}</p>}
            </div>
          </section>
        )}

        <section className='space-y-8'>
          <h2 className='text-center text-2xl font-bold tracking-tight'>Case Study</h2>
          <div className='grid gap-4 sm:grid-cols-2'>
            {CASE_STUDY.map(({ title, body }) => (
              <Card key={title}>
                <CardHeader>
                  <CardTitle className='text-base'>{title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className='text-sm text-muted-foreground'>{body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className='space-y-6 text-center'>
          <h2 className='text-2xl font-bold tracking-tight'>Tech Stack</h2>
          <div className='flex flex-wrap justify-center gap-2'>
            {TECH_STACK.map((tech) => (
              <span
                key={tech}
                className='rounded-full border bg-card px-4 py-1.5 text-sm font-medium'
              >
                {tech}
              </span>
            ))}
          </div>
        </section>

        <section className='space-y-8'>
          <h2 className='text-center text-2xl font-bold tracking-tight'>Platform Evolution</h2>
          <ol className='mx-auto max-w-2xl space-y-4 border-s ps-6'>
            {TIMELINE.map(({ sprint, title, current }) => (
              <li key={sprint} className='relative'>
                <span
                  className={`absolute -start-[1.65rem] mt-1.5 h-2.5 w-2.5 rounded-full ${
                    current ? 'bg-primary' : 'bg-muted-foreground/40'
                  }`}
                />
                <p className='text-xs font-medium text-primary'>{sprint}</p>
                <p className={current ? 'font-semibold' : 'text-muted-foreground'}>{title}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  )
}
