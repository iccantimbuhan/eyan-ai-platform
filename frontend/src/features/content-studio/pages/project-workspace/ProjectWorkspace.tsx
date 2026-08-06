import { useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { FolderOpen } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BackButton } from '@/components/back-button'
import { Breadcrumbs } from '@/components/breadcrumbs'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { useCan } from '@/features/auth/hooks/use-can'
import { ForbiddenError } from '@/features/errors/forbidden'
import { TourOverlay } from '@/features/portfolio/components/TourOverlay'
import { VideoComparisonPlayer } from '@/features/portfolio/components/VideoComparisonPlayer'
import { useTourRunner } from '@/features/portfolio/hooks/use-tour-runner'
import { ProjectAnalytics } from '../../components/analytics/ProjectAnalytics'
import { AssetLibrary } from '../../components/assets/AssetLibrary'
import { ReviewQueue } from '../../components/assets/ReviewQueue'
import { BrandKitList } from '../../components/brand-kits/BrandKitList'
import { GenerateForm } from '../../components/generator/GenerateForm'
import { GenerationHistory } from '../../components/generator/GenerationHistory'
import { OutputViewer } from '../../components/generator/OutputViewer'
import { ImageGenerateForm } from '../../components/image-generator/ImageGenerateForm'
import { ImageOutputViewer } from '../../components/image-generator/ImageOutputViewer'
import { PublishingQueue } from '../../components/publishing/PublishingQueue'
import { VideoAssetList } from '../../components/video-studio/VideoAssetList'
import { VideoGenerateForm } from '../../components/video-studio/VideoGenerateForm'
import { VideoSourceUpload } from '../../components/video-studio/VideoSourceUpload'
import { VideoWorkflowExecutor } from '../../components/video-studio/VideoWorkflowExecutor'
import { VideoWorkflowPlanner } from '../../components/video-studio/VideoWorkflowPlanner'
import { useExecuteWorkflow } from '../../hooks/use-execute-workflow'
import { useGenerateContent } from '../../hooks/use-generate-content'
import { useGenerateImage } from '../../hooks/use-generate-image'
import { useGenerateVideoAsset } from '../../hooks/use-generate-video-asset'
import { useImageProviderPreference } from '../../hooks/use-image-provider-preference'
import { usePlanVideoWorkflow } from '../../hooks/use-plan-video-workflow'
import { useProject } from '../../hooks/use-project'
import { useReviewAsset } from '../../hooks/use-review-asset'
import { useUploadVideoSource } from '../../hooks/use-upload-video-source'

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
  const can = useCan()
  const { projectId } = useParams({
    from: '/app/_authenticated/content-studio/$projectId',
  })
  const { tab } = useSearch({
    from: '/app/_authenticated/content-studio/$projectId',
  })
  const navigate = useNavigate({
    from: '/app/content-studio/$projectId',
  })

  const activeTab = tab ?? 'content'
  const setActiveTab = (value: string) =>
    navigate({ search: (prev) => ({ ...prev, tab: value as typeof tab }) })

  const { data: project, isLoading, error } = useProject(projectId)
  const generateContent = useGenerateContent(projectId)
  const generateImage = useGenerateImage(projectId)
  const generateVideoAsset = useGenerateVideoAsset(projectId)
  const uploadVideoSource = useUploadVideoSource(projectId)
  const planVideoWorkflow = usePlanVideoWorkflow(projectId)
  const executeWorkflow = useExecuteWorkflow(projectId)
  const reviewAsset = useReviewAsset(projectId)
  const { provider: imageProvider, setProvider: setImageProvider } =
    useImageProviderPreference()

  const tour = useTourRunner({
    projectId,
    uploadVideoSource,
    planVideoWorkflow,
    executeWorkflow,
    reviewAsset,
    activeTab,
    setActiveTab,
  })

  if (!can('dashboard')) return <ForbiddenError />

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
        <div className='space-y-2'>
          <Breadcrumbs
            items={[
              { label: 'Content Studio', to: '/app/content-studio' },
              { label: project.title },
            ]}
          />
          <BackButton to='/app/content-studio' label='Back to Projects' />
        </div>

        <Card data-presentation-target='content-studio.workspace.header'>
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

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value='content'>Content</TabsTrigger>
            <TabsTrigger value='images'>Images</TabsTrigger>
            <TabsTrigger value='brand-kits'>Brand Kit</TabsTrigger>
            <TabsTrigger value='video'>Video</TabsTrigger>
            <TabsTrigger value='assets'>Assets</TabsTrigger>
            <TabsTrigger value='review'>Review</TabsTrigger>
            <TabsTrigger value='publishing'>Publishing</TabsTrigger>
            <TabsTrigger value='analytics'>Analytics</TabsTrigger>
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

          <TabsContent value='brand-kits' className='space-y-6'>
            <BrandKitList projectId={projectId} />
          </TabsContent>

          <TabsContent value='video' className='space-y-6'>
            <VideoSourceUpload
              projectId={projectId}
              uploadVideoSource={uploadVideoSource}
              autoUploadFile={tour.autoUploadFile}
            />

            <VideoWorkflowPlanner
              projectId={projectId}
              planWorkflow={planVideoWorkflow}
              initialVideoAssetId={tour.initialVideoAssetId}
              initialPrompt={tour.initialPrompt}
            />

            <VideoWorkflowExecutor
              projectId={projectId}
              executeWorkflow={executeWorkflow}
              initialWorkflowPlanId={tour.initialWorkflowPlanId}
            />

            <VideoGenerateForm
              projectId={projectId}
              generateVideoAsset={generateVideoAsset}
            />

            <VideoAssetList projectId={projectId} />
          </TabsContent>

          <TabsContent value='assets' className='space-y-6'>
            <AssetLibrary projectId={projectId} />
          </TabsContent>

          <TabsContent value='review' className='space-y-6'>
            {tour.isActive && (
              <VideoComparisonPlayer
                projectId={projectId}
                originalAssetId={tour.sourceVideoAssetId}
                processedAssetId={tour.resultVideoAssetId}
              />
            )}

            <ReviewQueue projectId={projectId} />
          </TabsContent>

          <TabsContent value='publishing' className='space-y-6'>
            <PublishingQueue projectId={projectId} />
          </TabsContent>

          <TabsContent value='analytics' className='space-y-6'>
            <ProjectAnalytics projectId={projectId} />
          </TabsContent>
        </Tabs>
      </div>

      {tour.isActive && (
        <TourOverlay
          step={tour.step}
          error={tour.error}
          uploadPending={uploadVideoSource.isPending}
          planPending={planVideoWorkflow.isPending}
          executePending={executeWorkflow.isPending}
          planSteps={planVideoWorkflow.data?.workflow.steps}
          reviewIsPending={tour.reviewIsPending}
          onContinueToPublish={tour.continueToPublish}
          onFinishTour={tour.finishTour}
        />
      )}
    </ProjectWorkspaceShell>
  )
}
