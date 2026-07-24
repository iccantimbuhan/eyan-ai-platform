import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import type { useGenerateImage } from '../../hooks/use-generate-image'
import { ImageOutputViewer } from './ImageOutputViewer'

type GenerateMutation = ReturnType<typeof useGenerateImage>

function createMutation(
  overrides: Partial<GenerateMutation> = {}
): GenerateMutation {
  return {
    isPending: false,
    data: undefined,
    ...overrides,
  } as GenerateMutation
}

describe('ImageOutputViewer', () => {
  it('shows a skeleton while pending', async () => {
    const screen = await render(
      <ImageOutputViewer generateImage={createMutation({ isPending: true })} />
    )

    await expect.element(screen.getByText('Output')).toBeInTheDocument()
  })

  it('shows an empty-state placeholder before anything has been generated', async () => {
    const screen = await render(
      <ImageOutputViewer generateImage={createMutation()} />
    )

    await expect
      .element(screen.getByText(/Generated images will appear here/i))
      .toBeInTheDocument()
  })

  it('renders the generated image with a provider badge once completed', async () => {
    const screen = await render(
      <ImageOutputViewer
        generateImage={createMutation({
          data: {
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
            createdAt: '',
            updatedAt: '',
          },
        })}
      />
    )

    await expect.element(screen.getByText('gemini')).toBeInTheDocument()

    const image = screen.getByRole('img', { name: /A lighthouse at sunset/i })
    await expect.element(image).toBeInTheDocument()
    await expect
      .element(image)
      .toHaveAttribute('src', '/uploads/images/project-1/abc.png')
  })

  it("shows the failure reason and a Failed badge when generation didn't complete", async () => {
    const screen = await render(
      <ImageOutputViewer
        generateImage={createMutation({
          data: {
            id: 'image-2',
            projectId: 'project-1',
            prompt: 'A lighthouse at sunset',
            negativePrompt: null,
            provider: 'comfyui',
            model: null,
            width: 1024,
            height: 1024,
            format: 'png',
            storagePath: null,
            thumbnailPath: null,
            status: 'FAILED',
            errorMessage:
              'Image generation failed. Please try again, or try a different provider.',
            createdAt: '',
            updatedAt: '',
          },
        })}
      />
    )

    await expect
      .element(screen.getByText('Failed', { exact: true }))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText(/Image generation failed/i))
      .toBeInTheDocument()
  })
})
