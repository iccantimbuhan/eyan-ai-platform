import { useNavigate } from '@tanstack/react-router'
import { Play } from 'lucide-react'
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
import { usePresentationStore } from '@/stores/presentation-store'
import { resolveRoute } from '../engine/resolve-route'
import { resolveTourPackScenes, TOUR_PACKS } from '../tour-packs/registry'

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

  const startTour = (packId: string) => {
    const pack = TOUR_PACKS[packId]
    if (!pack) return

    const scenes = resolveTourPackScenes(pack)
    if (scenes.length === 0) return

    usePresentationStore.getState().start(pack.id, scenes)

    const firstScene = scenes[0]
    navigate({
      to: resolveRoute(firstScene.route),
      params: firstScene.routeParams,
    } as Parameters<typeof navigate>[0])
  }

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
          <h1 className='text-2xl font-bold tracking-tight'>Presentation Engine</h1>
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
                  <Button className='w-full' onClick={() => startTour(pack.id)}>
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
