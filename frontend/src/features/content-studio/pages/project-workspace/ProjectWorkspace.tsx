import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft, FolderOpen } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { GenerateForm } from '../../components/generator/GenerateForm'
import { GenerationHistory } from '../../components/generator/GenerationHistory'
import { OutputViewer } from '../../components/generator/OutputViewer'
import { useGenerateContent } from '../../hooks/use-generate-content'
import { useProject } from '../../hooks/use-project'

export function ProjectWorkspace() {
  const { projectId } = useParams({
    from: '/_authenticated/content-studio/$projectId',
  })

  const { data: project, isLoading, error } = useProject(projectId)
  const generateContent = useGenerateContent(projectId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading project...</p>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-destructive">Unable to load project.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        to="/content-studio"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Projects
      </Link>

      <Card>
        <CardContent className="py-8">
          <div className="flex items-start gap-4">
            <FolderOpen className="mt-1 h-8 w-8 text-primary" />

            <div className="space-y-2">
              <h1 className="text-3xl font-bold">{project.title}</h1>

              <p className="text-muted-foreground">
                AI Content Studio Project
              </p>

              <p className="text-sm text-muted-foreground">
                Status: {project.status}
              </p>

              <p className="text-sm text-muted-foreground">
                Last Updated:{' '}
                {new Date(project.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <GenerateForm projectId={projectId} generateContent={generateContent} />

      <OutputViewer generateContent={generateContent} />

      <GenerationHistory projectId={projectId} />
    </div>
  )
}
