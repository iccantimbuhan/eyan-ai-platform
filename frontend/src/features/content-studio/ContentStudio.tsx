import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ContentPipeline } from './components/ContentPipeline'
import { DashboardHeader } from './components/DashboardHeader'
import { NewProjectDialog } from './components/NewProjectDialog'
import { QuickActions } from './components/QuickActions'
import { RecentProjects } from './components/RecentProjects'

export function ContentStudio() {
  return (
    <>
      <Header>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main>
        <div className='mb-8 flex items-start justify-between'>
          <DashboardHeader />

          <NewProjectDialog />
        </div>

        <div className='space-y-6'>
          <QuickActions />

          <RecentProjects />

          <ContentPipeline />
        </div>
      </Main>
    </>
  )
}
