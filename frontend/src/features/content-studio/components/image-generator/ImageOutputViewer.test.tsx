import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import type { useGenerateImage } from '../../hooks/use-generate-image'
import type { GeneratedImageItem } from '../../types/image'
import { ImageOutputViewer } from './ImageOutputViewer'

type GenerateMutation = ReturnType<typeof useGenerateImage>
type ImagesQueryState = {
  data: { items: GeneratedImageItem[] } | undefined
  isLoading: boolean
  isError: boolean
}

function createMutation(
  overrides: Partial<GenerateMutation> = {}
): GenerateMutation {
  return {
    isPending: false,
    ...overrides,
  } as GenerateMutation
}

let mockUseImages: () => ImagesQueryState

vi.mock('../../hooks/use-images', () => ({
  useImages: () => mockUseImages(),
}))

function setImagesState(overrides: Partial<ImagesQueryState> = {}) {
  mockUseImages = () => ({
    data: { items: [] },
    isLoading: false,
    isError: false,
    ...overrides,
  })
}

const completedImage: GeneratedImageItem = {
  id: 'image-1',
  projectId: 'project-1',
  prompt: 'A lighthouse at sunset',
  negativePrompt: null,
  provider: 'gemini',
  model: 'gemini-2.5-flash-image',
  width: 1024,
  height: 1024,
  format: 'png',
  storagePath: 'project-1/abc.png',
  thumbnailPath: null,
  status: 'COMPLETED',
  errorMessage: null,
  createdAt: '2026-07-24T00:00:01.000Z',
  updatedAt: '2026-07-24T00:00:01.000Z',
}

const failedImage: GeneratedImageItem = {
  id: 'image-2',
  projectId: 'project-1',
  prompt: 'A broken render',
  negativePrompt: null,
  provider: 'huggingface',
  model: null,
  width: 1024,
  height: 1024,
  format: 'png',
  storagePath: null,
  thumbnailPath: null,
  status: 'FAILED',
  errorMessage:
    'Image generation failed. Please try again, or try a different provider.',
  createdAt: '2026-07-24T00:00:00.000Z',
  updatedAt: '2026-07-24T00:00:00.000Z',
}

describe('ImageOutputViewer', () => {
  beforeEach(() => {
    setImagesState()
  })

  it('shows a skeleton while the mutation is pending, regardless of query state', async () => {
    const screen = await render(
      <ImageOutputViewer
        projectId='project-1'
        generateImage={createMutation({ isPending: true })}
        provider='auto'
      />
    )

    await expect.element(screen.getByText('Output')).toBeInTheDocument()
  })

  it('shows a provider-specific hint while pending on ComfyUI', async () => {
    const screen = await render(
      <ImageOutputViewer
        projectId='project-1'
        generateImage={createMutation({ isPending: true })}
        provider='comfyui'
      />
    )

    await expect
      .element(screen.getByText(/ComfyUI can take a minute or more/i))
      .toBeInTheDocument()
  })

  it('shows a provider-specific hint while pending on Hugging Face', async () => {
    const screen = await render(
      <ImageOutputViewer
        projectId='project-1'
        generateImage={createMutation({ isPending: true })}
        provider='huggingface'
      />
    )

    await expect
      .element(screen.getByText(/Hugging Face is usually fast/i))
      .toBeInTheDocument()
  })

  it('shows no provider-specific hint while pending for "fake"', async () => {
    const screen = await render(
      <ImageOutputViewer
        projectId='project-1'
        generateImage={createMutation({ isPending: true })}
        provider='fake'
      />
    )

    await expect
      .element(screen.getByText(/ComfyUI can take a minute or more/i))
      .not.toBeInTheDocument()
    await expect
      .element(screen.getByText(/Hugging Face is usually fast/i))
      .not.toBeInTheDocument()
  })

  it('shows a loading status while the images query is fetching', async () => {
    setImagesState({ isLoading: true, data: undefined })

    const screen = await render(
      <ImageOutputViewer
        projectId='project-1'
        generateImage={createMutation()}
        provider='auto'
      />
    )

    await expect
      .element(screen.getByRole('status', { name: 'Loading generated images' }))
      .toBeInTheDocument()
  })

  it('shows an error message when the images query fails', async () => {
    setImagesState({ isError: true, data: undefined })

    const screen = await render(
      <ImageOutputViewer
        projectId='project-1'
        generateImage={createMutation()}
        provider='auto'
      />
    )

    await expect
      .element(screen.getByText(/Failed to load generated images/i))
      .toBeInTheDocument()
  })

  it('shows an empty-state placeholder when there are no images yet', async () => {
    setImagesState({ data: { items: [] } })

    const screen = await render(
      <ImageOutputViewer
        projectId='project-1'
        generateImage={createMutation()}
        provider='auto'
      />
    )

    await expect
      .element(screen.getByText(/Generated images will appear here/i))
      .toBeInTheDocument()
  })

  it('renders the newest image (first item from the query) with a provider badge', async () => {
    setImagesState({ data: { items: [completedImage] } })

    const screen = await render(
      <ImageOutputViewer
        projectId='project-1'
        generateImage={createMutation()}
        provider='gemini'
      />
    )

    await expect.element(screen.getByText('gemini')).toBeInTheDocument()

    const image = screen.getByRole('img', { name: /A lighthouse at sunset/i })
    await expect.element(image).toBeInTheDocument()
    await expect
      .element(image)
      .toHaveAttribute('src', '/uploads/images/project-1/abc.png')
  })

  it("shows the failure reason and a Failed badge when the newest image didn't complete", async () => {
    setImagesState({ data: { items: [failedImage] } })

    const screen = await render(
      <ImageOutputViewer
        projectId='project-1'
        generateImage={createMutation()}
        provider='huggingface'
      />
    )

    await expect
      .element(screen.getByText('Failed', { exact: true }))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText(/Image generation failed/i))
      .toBeInTheDocument()
  })

  it('survives a browser refresh: shows the persisted newest image straight from the query, with no mutation ever having run', async () => {
    setImagesState({ data: { items: [completedImage] } })

    // generateImage here has never been used (isPending: false, no
    // successful mutation this session) — simulating a fresh page load
    // after a refresh, where mutation state is gone but the query isn't.
    const screen = await render(
      <ImageOutputViewer
        projectId='project-1'
        generateImage={createMutation({ isPending: false })}
        provider='auto'
      />
    )

    const image = screen.getByRole('img', { name: /A lighthouse at sunset/i })
    await expect.element(image).toBeInTheDocument()
  })

  it('shows the newest image as the main output while keeping previous images visible below', async () => {
    const olderImage: GeneratedImageItem = {
      ...completedImage,
      id: 'image-0',
      prompt: 'An older render',
      storagePath: 'project-1/older.png',
      createdAt: '2026-07-23T00:00:00.000Z',
      updatedAt: '2026-07-23T00:00:00.000Z',
    }
    // Newest first, matching the backend's createdAt-desc ordering.
    setImagesState({ data: { items: [completedImage, olderImage] } })

    const screen = await render(
      <ImageOutputViewer
        projectId='project-1'
        generateImage={createMutation()}
        provider='auto'
      />
    )

    await expect
      .element(screen.getByRole('img', { name: /A lighthouse at sunset/i }))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText('Previous images'))
      .toBeInTheDocument()
    await expect
      .element(screen.getByRole('img', { name: /An older render/i }))
      .toBeInTheDocument()
  })

  it('shows a failed-generation placeholder among previous images instead of a broken thumbnail', async () => {
    setImagesState({ data: { items: [completedImage, failedImage] } })

    const screen = await render(
      <ImageOutputViewer
        projectId='project-1'
        generateImage={createMutation()}
        provider='auto'
      />
    )

    await expect
      .element(screen.getByText('Previous images'))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText('Failed', { exact: true }))
      .toBeInTheDocument()
  })

  it('does not show a "Previous images" section when there is only one image', async () => {
    setImagesState({ data: { items: [completedImage] } })

    const screen = await render(
      <ImageOutputViewer
        projectId='project-1'
        generateImage={createMutation()}
        provider='auto'
      />
    )

    await expect
      .element(screen.getByText('Previous images'))
      .not.toBeInTheDocument()
  })
})
