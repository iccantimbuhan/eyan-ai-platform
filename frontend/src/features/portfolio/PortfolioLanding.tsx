import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Loader2, LogIn, Mail, Play } from 'lucide-react'
import { IconGithub } from '@/assets/brand-icons'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeSwitch } from '@/components/theme-switch'
import { useLogin } from '@/features/auth/hooks/use-login'
import { startTourPack } from '@/features/presentation-engine/lib/start-tour'

const GITHUB_URL = 'https://github.com/iccantimbuhan/eyan-ai-platform'

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
  { sprint: 'Sprint 8', title: 'Interactive Portfolio Experience' },
  { sprint: 'Presentation Engine', title: 'Guided, Narrated Product Tours', current: true },
]

const CASE_STUDY = [
  {
    title: 'Problem',
    body: 'A recruiter looking at a deployed AI platform has no way to understand what it actually does without a live walkthrough — screenshots and a feature list ask for trust instead of demonstrating it.',
  },
  {
    title: 'Solution',
    body: 'A Presentation Engine that narrates over the real, live application — real navigation, real UI, real data — driven entirely by data-defined scenes rather than a separate demo build. The application is the presentation; nothing is duplicated or mocked.',
  },
  {
    title: 'Architecture',
    body: "The engine's action vocabulary is fixed (navigate, highlight, narrate, wait) and never calls a business mutation. Presenting a new module — Dashboard, AI Chat, Content Studio — only ever requires new scene data; the engine itself never changes.",
  },
  {
    title: 'Challenges',
    body: 'This codebase had no convention for targeting one specific UI instance for a spotlight, and no way to pace a scene once narration has no audio yet — both needed a new, additive `data-presentation-target` attribute and a real-time-based pacing fix, found during live browser verification.',
  },
  {
    title: 'Future Roadmap',
    body: 'Real text-to-speech narration providers, full platform scene coverage, and branching, interactive presentations for guided onboarding.',
  },
]

export function PortfolioLanding() {
  const navigate = useNavigate()
  const login = useLogin()

  const [isStarting, setIsStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)

  const watchPresentation = async () => {
    setIsStarting(true)
    setStartError(null)

    try {
      await login('demo@eyanstudio.dev', 'EyanStudioDemo!2026')

      if (!startTourPack('recruiter-tour', navigate)) {
        throw new Error('Recruiter tour is not available.')
      }
    } catch {
      setStartError('Could not start the presentation. Please try again in a moment.')
      setIsStarting(false)
    }
  }

  return (
    <div className='min-h-svh bg-background'>
      <header className='flex items-center justify-between px-6 py-4'>
        <span className='text-lg font-bold tracking-tight'>EYAN Studio</span>
        <div className='flex items-center gap-2'>
          <ThemeSwitch />
          <Button asChild variant='ghost'>
            <Link to='/contact'>
              <Mail className='h-4 w-4' />
              Contact
            </Link>
          </Button>
          <Button asChild variant='ghost'>
            <Link to='/sign-in'>
              <LogIn className='h-4 w-4' />
              Login
            </Link>
          </Button>
        </div>
      </header>

      <main className='mx-auto max-w-5xl space-y-24 px-6 pb-24'>
        <section className='space-y-6 py-16 text-center'>
          <h1 className='text-4xl font-bold tracking-tight sm:text-6xl'>Experience EYAN Studio</h1>
          <p className='mx-auto max-w-2xl text-lg text-muted-foreground'>
            An AI-powered Content Production Platform designed to automate content creation,
            review, editing and publishing workflows.
          </p>

          <div className='flex flex-col items-center gap-3'>
            <div className='flex flex-wrap justify-center gap-3'>
              <Button size='lg' className='gap-2 px-8' onClick={watchPresentation} disabled={isStarting}>
                {isStarting ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <Play className='h-4 w-4' />
                )}
                Watch Presentation
              </Button>

              <Button asChild size='lg' variant='outline' className='gap-2 px-8'>
                <a href={GITHUB_URL} target='_blank' rel='noreferrer'>
                  <IconGithub className='h-4 w-4' />
                  GitHub
                </a>
              </Button>

              <Button asChild size='lg' variant='outline' className='gap-2 px-8'>
                <Link to='/contact'>
                  <Mail className='h-4 w-4' />
                  Get in Touch
                </Link>
              </Button>
            </div>

            {startError && <p className='text-sm text-destructive'>{startError}</p>}
          </div>
        </section>

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
