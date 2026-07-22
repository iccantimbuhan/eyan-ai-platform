import { FolderOpen } from 'lucide-react'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function ContentStudio() {
  return (
    <>
      <Header>
        <Search className="me-auto" />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main>
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">
            Content Studio
          </h1>

          <p className="text-muted-foreground">
            Create, organize, generate, and publish AI-powered content.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome to Content Studio</CardTitle>

            <CardDescription>
              This workspace will become the central hub for all content
              operations inside EYAN Studio.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FolderOpen className="mb-4 h-14 w-14 text-muted-foreground/40" />

            <h2 className="text-lg font-semibold">
              Sprint 1 Started 🚀
            </h2>

            <p className="mt-2 max-w-lg text-sm text-muted-foreground">
              In the next sprints we'll add Projects, Brand Kits, Blog,
              Social, Video Scripts, AI Video, Thumbnail generation,
              Publishing, and Analytics.
            </p>
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
