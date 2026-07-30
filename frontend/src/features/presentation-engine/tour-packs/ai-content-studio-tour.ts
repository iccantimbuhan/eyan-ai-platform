import type { TourPack } from '../types/tour-pack'

/**
 * The flagship presentation: a cinematic, single-story walkthrough of the
 * AI Content Studio's complete production lifecycle — plan, generate,
 * brand, produce, review, publish, measure — narrated for business value,
 * not as a page-by-page navigation tour. See ADR-0016 (Phase 2B).
 */
export const aiContentStudioTour: TourPack = {
  id: 'ai-content-studio',
  title: 'AI Content Studio',
  audience: 'feature',
  description: 'The complete content production lifecycle — from first draft to published, measured results.',
  defaultNarrationProviderId: 'pre-recorded',
  scenes: [
    { sceneId: 'content-studio.overview' },
    { sceneId: 'content-studio.new-project' },
    { sceneId: 'content-studio.workspace.intro' },
    { sceneId: 'content-studio.workspace.content.templates' },
    { sceneId: 'content-studio.workspace.content.generate' },
    { sceneId: 'content-studio.workspace.content.history' },
    { sceneId: 'content-studio.workspace.images.generate' },
    { sceneId: 'content-studio.workspace.images.gallery' },
    { sceneId: 'content-studio.workspace.brand.kit' },
    { sceneId: 'content-studio.workspace.video.generate' },
    { sceneId: 'content-studio.workspace.video.assets' },
    { sceneId: 'content-studio.workspace.assets.library' },
    { sceneId: 'content-studio.workspace.review.queue' },
    { sceneId: 'content-studio.workspace.publishing.queue' },
    { sceneId: 'content-studio.workspace.analytics.overview' },
    { sceneId: 'content-studio.prompt-library' },
    { sceneId: 'content-studio.dashboard-stats' },
    { sceneId: 'content-studio.dashboard-activity' },
  ],
  metadata: {
    tags: ['content-studio', 'flagship'],
  },
}
