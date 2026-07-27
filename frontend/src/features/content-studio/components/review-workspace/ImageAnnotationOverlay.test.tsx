import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'

import type { AssetComment } from '../../types/review-workspace'
import { ImageAnnotationOverlay } from './ImageAnnotationOverlay'

const useAssetCommentsMock = vi.fn()

vi.mock('../../hooks/use-asset-comments', () => ({
  useAssetComments: (...args: unknown[]) => useAssetCommentsMock(...args),
  useAddComment: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const regionComment: AssetComment = {
  id: 'comment-1',
  assetType: 'IMAGE',
  sourceId: 'image-1',
  authorId: 'user-1',
  authorName: 'Ada Lovelace',
  body: 'Fix the horizon line',
  isInternal: false,
  region: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
  timestampMs: null,
  resolvedAt: null,
  resolvedBy: null,
  createdAt: '2026-01-10T00:00:00.000Z',
  updatedAt: '2026-01-10T00:00:00.000Z',
}

describe('ImageAnnotationOverlay', () => {
  it('renders the image', async () => {
    useAssetCommentsMock.mockReturnValue({ data: [], isLoading: false, isError: false })

    const screen = await render(
      <ImageAnnotationOverlay
        projectId='project-1'
        assetType='IMAGE'
        sourceId='image-1'
        imageUrl='https://example.test/image.png'
        alt='A lighthouse'
      />
    )

    await expect.element(screen.getByAltText('A lighthouse')).toBeInTheDocument()
  })

  it('renders an overlay box for an existing region comment, positioned by its stored region', async () => {
    useAssetCommentsMock.mockReturnValue({
      data: [regionComment],
      isLoading: false,
      isError: false,
    })

    const screen = await render(
      <ImageAnnotationOverlay
        projectId='project-1'
        assetType='IMAGE'
        sourceId='image-1'
        imageUrl='https://example.test/image.png'
        alt='A lighthouse'
      />
    )

    const overlay = screen.getByTitle('Fix the horizon line')
    await expect.element(overlay).toBeInTheDocument()
    expect(overlay.element().getAttribute('style')).toContain('left: 10%')
    expect(overlay.element().getAttribute('style')).toContain('top: 20%')
  })
})
