import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft, FolderOpen } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { GenerateForm } from '../../components/generator/GenerateForm'
import { GenerationHistory } from '../../components/generator/GenerationHistory'
import { OutputViewer } from '../../components/generator/OutputViewer'
import { ImageGenerateForm } from '../../components/image-generator/ImageGenerateForm'
import { ImageOutputViewer } from '../../components/image-generator/ImageOutputViewer'
import { AssetLibrary } from '../../components/assets/AssetLibrary'
import { ReviewQueue } from '../../components/assets/ReviewQueue'
import { useGenerateContent } from '../../hooks/use-generate-content'
import { useGenerateImage } from '../../hooks/use-generate-image'
import { useImageProviderPreference } from '../../hooks/use-image-provider-preference'
import { useProject } from '../../hooks/use-project'

function ProjectWorkspaceShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main>{children}</Main>
    </>
  )
}

export function ProjectWorkspace() {
  const { projectId } = useParams({
    from: '/_authenticated/content-studio/$projectId',
  })

  const { data: project, isLoading, error } = useProject(projectId)
  const generateContent = useGenerateContent(projectId)
  const generateImage = useGenerateImage(projectId)
  const { provider: imageProvider, setProvider: setImageProvider } =
    useImageProviderPreference()

  if (isLoading) {
    return (
      <ProjectWorkspaceShell>
        <div className='flex items-center justify-center py-20'>
          <p className='text-muted-foreground'>Loading project...</p>
        </div>
      </ProjectWorkspaceShell>
    )
  }

  if (error || !project) {
    return (
      <ProjectWorkspaceShell>
        <div className='flex items-center justify-center py-20'>
          <p className='text-destructive'>Unable to load project.</p>
        </div>
      </ProjectWorkspaceShell>
    )
  }

  return (
    <ProjectWorkspaceShell>
      <div className='space-y-6'>
        <Link
          to='/content-studio'
          className='inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground'
        >
          <ArrowLeft className='h-4 w-4' />
          Back to Projects
        </Link>

        <Card>
          <CardContent className='py-8'>
            <div className='flex items-start gap-4'>
              <FolderOpen className='mt-1 h-8 w-8 text-primary' />

              <div className='space-y-2'>
                <h1 className='text-3xl font-bold tracking-tight'>
                  {project.title}
                </h1>

                <p className='text-muted-foreground'>
                  AI Content Studio Project
                </p>

                <p className='text-sm text-muted-foreground'>
                  Status: {project.status}
                </p>

                <p className='text-sm text-muted-foreground'>
                  Last Updated: {new Date(project.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue='content'>
          <TabsList>
            <TabsTrigger value='content'>Content</TabsTrigger>
            <TabsTrigger value='images'>Images</TabsTrigger>
            <TabsTrigger value='assets'>Assets</TabsTrigger>
            <TabsTrigger value='review'>Review</TabsTrigger>
          </TabsList>

          <TabsContent value='content' className='space-y-6'>
            <GenerateForm
              projectId={projectId}
              generateContent={generateContent}
            />

            <OutputViewer generateContent={generateContent} />

            <GenerationHistory projectId={projectId} />
          </TabsContent>

          <TabsContent value='images' className='space-y-6'>
            <ImageGenerateForm
              projectId={projectId}
              generateImage={generateImage}
              provider={imageProvider}
              onProviderChange={setImageProvider}
            />

            <ImageOutputViewer
              projectId={projectId}
              generateImage={generateImage}
              provider={imageProvider}
            />
          </TabsContent>

          <TabsContent value='assets' className='space-y-6'>
            <AssetLibrary projectId={projectId} />
          </TabsContent>

          <TabsContent value='review' className='space-y-6'>
            <ReviewQueue projectId={projectId} />
          </TabsContent>
        </Tabs>
      </div>
    </ProjectWorkspaceShell>
  )
}
