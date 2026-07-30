import { useNavigate } from '@tanstack/react-router'
import { Play } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { useCan } from '@/features/auth/hooks/use-can'
import { ForbiddenError } from '@/features/errors/forbidden'
import { startTourPack } from '../lib/start-tour'
import { TOUR_PACKS } from '../tour-packs/registry'

/**
 * Not yet built as real Tour Packs — shown so the library reads as a
 * complete map of the platform, not just what happens to exist today.
 * Deliberately static data, not a stub TourPack: an empty-scenes pack
 * would silently no-op on click rather than communicating "not yet".
 */
const COMING_SOON_PRESENTATIONS = [
  { id: 'ai-chat-deep-dive', title: 'AI Chat', description: 'A dedicated walkthrough of the AI Chat experience.' },
  { id: 'finance', title: 'Finance', description: 'A guided tour of budgeting and expense tracking.' },
]

/**
 * The engine's only dedicated route — a picker/launcher, never presented
 * content. Starting a tour hands off to the first scene's real route and
 * this page is immediately left behind, the same way the Cmd+K palette
 * is a picker rather than a destination.
 */
export function PresentationLauncher() {
  const can = useCan()
  const navigate = useNavigate()

  if (!can('presentation-engine')) return <ForbiddenError />

  const packs = Object.values(TOUR_PACKS).filter((pack) => can(pack.metadata?.permission))

  return (
    <>
      <Header>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main>
        <div className='mb-6 space-y-1'>
          <h1 className='text-2xl font-bold tracking-tight'>Presentation Library</h1>
          <p className='text-muted-foreground'>
            Automatically presents EYAN Studio — narration, highlights, and guided navigation
            over the real application.
          </p>
        </div>

        {packs.length === 0 ? (
          <Card>
            <CardContent className='py-12 text-center text-muted-foreground'>
              No tours are available yet.
            </CardContent>
          </Card>
        ) : (
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {packs.map((pack) => (
              <Card key={pack.id}>
                <CardHeader>
                  <CardTitle>{pack.title}</CardTitle>
                  <CardDescription>{pack.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className='w-full' onClick={() => startTourPack(pack.id, navigate)}>
                    <Play className='me-2 h-4 w-4' />
                    Start Tour
                  </Button>
                </CardContent>
              </Card>
            ))}

            {COMING_SOON_PRESENTATIONS.map((placeholder) => (
              <Card key={placeholder.id} className='opacity-60'>
                <CardHeader>
                  <div className='flex items-center justify-between gap-2'>
                    <CardTitle>{placeholder.title}</CardTitle>
                    <Badge variant='secondary'>Coming Soon</Badge>
                  </div>
                  <CardDescription>{placeholder.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className='w-full' disabled>
                    <Play className='me-2 h-4 w-4' />
                    Start Tour
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </Main>
    </>
  )
}
