import { resolveImageUrl } from '../api/images.api'
import { ASSET_TYPE_OPTIONS, type AssetDetail, type AssetSummary } from '../types/asset'

// Client-side only, by design (Sprint 5 decision) — Markdown/JSON exports
// are built entirely from data already fetched by the app; images already
// have a real downloadable URL via the existing static file serving
// (resolveImageUrl). No new backend export endpoints exist or are needed.

function assetTypeLabel(assetType: AssetDetail['assetType']): string {
  return (
    ASSET_TYPE_OPTIONS.find((option) => option.value === assetType)?.label ??
    assetType
  )
}

// content accepts a Blob directly (binary downloads, e.g. images) as well
// as a string (text downloads, e.g. Markdown/JSON) — never round-trips
// binary bytes through a string, which would corrupt them.
export function downloadBlob(
  filename: string,
  content: string | Blob,
  mimeType: string
): void {
  const blob =
    content instanceof Blob ? content : new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

export function exportAssetAsMarkdown(asset: AssetDetail): string {
  const lines = [
    `# ${asset.title}`,
    '',
    `- **Type:** ${assetTypeLabel(asset.assetType)}`,
    `- **Status:** ${asset.status}`,
    `- **Provider:** ${asset.provider ?? '—'}`,
    `- **Model:** ${asset.model ?? '—'}`,
    `- **Version:** ${asset.version}`,
    `- **Project:** ${asset.projectName}`,
    `- **Created:** ${asset.createdAt}`,
    '',
    '## Prompt',
    '',
    asset.prompt,
  ]

  if (asset.negativePrompt) {
    lines.push('', '## Negative Prompt', '', asset.negativePrompt)
  }

  if (asset.output) {
    lines.push('', '## Output', '', asset.output)
  }

  if (asset.notes) {
    lines.push('', '## Review Notes', '', asset.notes)
  }

  return lines.join('\n')
}

export function exportAssetsAsJson(
  assets: (AssetSummary | AssetDetail)[]
): string {
  return JSON.stringify(assets, null, 2)
}

// Images download via their existing, already-generated stored file — fetched
// as a blob (rather than a plain <a download> to the resolved URL) so the
// download is forced even when the storage origin differs from the app's
// own origin in local dev, where browsers ignore the download attribute on
// cross-origin links. Text-shaped assets (content, prompt templates) have
// no separate stored file, so they download as a generated Markdown file
// instead.
export async function downloadAsset(asset: AssetDetail): Promise<void> {
  if (asset.assetType === 'IMAGE' && asset.thumbnailUrl) {
    const extension = asset.thumbnailUrl.split('.').pop() ?? 'png'
    const response = await fetch(resolveImageUrl(asset.thumbnailUrl))
    const blob = await response.blob()
    downloadBlob(`${asset.title}.${extension}`, blob, blob.type)
    return
  }

  downloadBlob(`${asset.title}.md`, exportAssetAsMarkdown(asset), 'text/markdown')
}
