import { randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { deflateSync } from 'node:zlib'
import type { PrismaClient } from '../src/generated/prisma/client'

// Fixed id so the Presentation Engine's AI Content Studio Tour Pack can route
// directly to a known project's workspace (see frontend/src/features/
// presentation-engine/scenes/content-studio.scenes.ts, which references this
// exact literal as a routeParam) — ContentProject rows are otherwise always
// DB-generated cuids, so this one is deliberately hardcoded on both sides
// instead of looked up at runtime.
export const DEMO_CONTENT_STUDIO_PROJECT_ID = 'demo-content-studio-project'

const DEMO_BRAND_KIT_ID = 'demo-content-studio-brand-kit'
const DEMO_VIDEO_GROUP_ID = 'demo-content-studio-video-group'

// Mirrors LocalDiskStorageProvider's default root (backend/src/config/env.ts
// storageLocalRoot) exactly, so these seeded rows' storagePath values
// resolve through the real /uploads/images static route with no change to
// the storage provider or its config.
const STORAGE_ROOT = path.join(process.cwd(), 'storage', 'images')

function crc32(buf: Buffer): number {
  let crc = 0xffffffff
  for (const byte of buf) {
    crc ^= byte
    for (let i = 0; i < 8; i++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typeAndData))
  return Buffer.concat([length, typeAndData, crc])
}

/**
 * Encodes a solid-color PNG from scratch (signature + IHDR + IDAT + IEND) so
 * seeded GeneratedImage/VideoAsset rows point at a real, viewable file
 * instead of a broken image link — no image-processing dependency needed
 * for a placeholder this simple.
 */
function makeSolidPng(width: number, height: number, rgb: [number, number, number]): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(width, 0)
  ihdrData.writeUInt32BE(height, 4)
  ihdrData[8] = 8 // bit depth
  ihdrData[9] = 2 // color type: truecolor (RGB)
  const ihdr = pngChunk('IHDR', ihdrData)

  const row = Buffer.alloc(1 + width * 3) // leading filter-type byte (0 = none)
  for (let x = 0; x < width; x++) {
    row.writeUInt8(rgb[0], 1 + x * 3)
    row.writeUInt8(rgb[1], 1 + x * 3 + 1)
    row.writeUInt8(rgb[2], 1 + x * 3 + 2)
  }
  const raw = Buffer.concat(Array.from({ length: height }, () => row))
  const idat = pngChunk('IDAT', deflateSync(raw))
  const iend = pngChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdr, idat, iend])
}

function saveDemoImage(rgb: [number, number, number], width = 1024, height = 1024): string {
  const relativePath = path.join(DEMO_CONTENT_STUDIO_PROJECT_ID, `${randomUUID()}.png`)
  const absolutePath = path.join(STORAGE_ROOT, relativePath)
  mkdirSync(path.dirname(absolutePath), { recursive: true })
  writeFileSync(absolutePath, makeSolidPng(width, height, rgb))
  return relativePath
}

const NIMBUS_ROAST: [number, number, number] = [58, 33, 22]
const NIMBUS_LATTE: [number, number, number] = [200, 159, 101]
const NIMBUS_CREAM: [number, number, number] = [237, 228, 211]

type AnalyticsSeedRow = {
  assetType: 'BLOG' | 'SOCIAL_MEDIA' | 'EMAIL' | 'IMAGE' | 'VIDEO'
  sourceId: string
  provider: string
  model: string
  generationTimeMs: number
}

/**
 * Seeds one fully-populated ContentProject ("Nimbus Coffee Co. — Spring
 * Launch") so the Presentation Engine's AI Content Studio Tour Pack can
 * demonstrate every workspace tab with real, non-empty data — generated
 * content, generated images (real placeholder PNGs on disk), brand
 * guidance, video production artifacts, review/QA state, and a publishing
 * queue — instead of navigating to empty states. Bypasses every real AI
 * provider entirely (no generation call, no cost, no wall-clock wait).
 * Idempotent: a second seed run is a no-op once the project exists.
 */
export async function seedDemoContentStudioProject(
  prisma: PrismaClient,
  demoUserId: string
): Promise<void> {
  const existing = await prisma.contentProject.findUnique({
    where: { id: DEMO_CONTENT_STUDIO_PROJECT_ID },
  })
  if (existing) return

  const project = await prisma.contentProject.create({
    data: {
      id: DEMO_CONTENT_STUDIO_PROJECT_ID,
      userId: demoUserId,
      name: 'Nimbus Coffee Co. — Spring Launch',
      description: 'A seasonal product launch campaign for a specialty coffee brand.',
      status: 'IN_PROGRESS',
    },
  })

  const brandKit = await prisma.brandKit.create({
    data: {
      id: DEMO_BRAND_KIT_ID,
      projectId: project.id,
      createdBy: demoUserId,
      name: 'Nimbus Coffee Co.',
      client: 'Nimbus Coffee Co.',
      logos: [{ url: 'https://nimbus.example.com/logo.png', label: 'Primary' }],
      primaryColors: [
        { hex: '#3A2116', label: 'Roast' },
        { hex: '#C89F65', label: 'Latte' },
        { hex: '#EDE4D3', label: 'Cream' },
      ],
      secondaryColors: [{ hex: '#8A5A34', label: 'Cinnamon' }],
      fonts: ['Söhne', 'Inter'],
      typography: 'Bold serif display type paired with a clean grotesk body face.',
      toneOfVoice:
        'Warm, confident, a little adventurous — like a knowledgeable friend, never corporate.',
      writingStyle: 'Short sentences. Sensory language. Avoid jargon.',
      audience: 'Urban professionals aged 25–40 who care about quality and provenance.',
      ctaStyle: 'Direct and inviting, e.g. "Taste the difference."',
      approvedTerminology: ['single-origin', 'small-batch', 'direct trade'],
      restrictedWords: ['cheap', 'instant'],
      brandGuidelines:
        'Nimbus is a specialty coffee brand built on traceability and craft. Every piece of content should feel personal, never mass-produced.',
      imageStyle: 'Warm natural light, shallow depth of field, earthy tones.',
      socialMediaGuidelines: 'Always credit the origin farm. Never show plastic packaging.',
      isDefault: true,
    },
  })

  const [blogPost, socialPost, launchEmail] = await Promise.all([
    prisma.generatedContent.create({
      data: {
        projectId: project.id,
        brandKitId: brandKit.id,
        type: 'BLOG',
        prompt: 'Write a blog post announcing our new single-origin Spring roast.',
        output:
          "Spring arrives early this year — in a cup.\n\nOur new single-origin Spring roast comes from a direct-trade partnership with a small farm we've worked with for three seasons running. Bright, floral, and unmistakably fresh, it's the kind of coffee that makes a Tuesday morning feel like an occasion.\n\nWe roast in small batches, every week, so what you're drinking was beans a matter of days ago — not months. That's the whole point of doing this ourselves.\n\nAvailable now, while the season lasts.",
        model: 'gpt-4o',
        generationTimeMs: 3200,
      },
    }),
    prisma.generatedContent.create({
      data: {
        projectId: project.id,
        brandKitId: brandKit.id,
        type: 'SOCIAL_MEDIA',
        prompt: 'Write an Instagram caption for the Spring roast launch.',
        output:
          'Some things are worth the wait. 🌱☕\nOur Spring single-origin just landed — small-batch, direct-trade, and bright enough to wake up a whole season.\nTaste the difference. Link in bio.\n#nimbuscoffee #singleorigin #smallbatch',
        model: 'gpt-4o',
        generationTimeMs: 1400,
      },
    }),
    prisma.generatedContent.create({
      data: {
        projectId: project.id,
        brandKitId: brandKit.id,
        type: 'EMAIL',
        prompt: 'Write a launch email to our newsletter subscribers.',
        output:
          "Subject: Your next favorite coffee is here\n\nHi there,\n\nWe've been sitting on this one for weeks, waiting for the beans to arrive from the farm. Today, it's finally ready: our Spring single-origin roast.\n\nDirect-trade, small-batch, roasted the week you order — this is Nimbus coffee at its most Nimbus.\n\nTaste the difference.\n\n— The Nimbus Coffee Co. team",
        model: 'gpt-4o',
        generationTimeMs: 2100,
      },
    }),
  ])

  const heroImage = await prisma.generatedImage.create({
    data: {
      projectId: project.id,
      brandKitId: brandKit.id,
      prompt: 'A vibrant hero shot of a steaming cup of coffee in warm morning light.',
      provider: 'gemini',
      model: 'gemini-2.5-flash-image',
      width: 1024,
      height: 1024,
      format: 'PNG',
      storagePath: saveDemoImage(NIMBUS_ROAST),
      status: 'COMPLETED',
      generationTimeMs: 2450,
    },
  })
  const productImage = await prisma.generatedImage.create({
    data: {
      projectId: project.id,
      brandKitId: brandKit.id,
      prompt: 'Minimalist product photography of the Spring roast bag on a wooden table.',
      provider: 'gemini',
      model: 'gemini-2.5-flash-image',
      width: 1024,
      height: 1024,
      format: 'PNG',
      storagePath: saveDemoImage(NIMBUS_LATTE),
      status: 'COMPLETED',
      generationTimeMs: 2200,
    },
  })
  const lifestyleImage = await prisma.generatedImage.create({
    data: {
      projectId: project.id,
      brandKitId: brandKit.id,
      prompt: 'Lifestyle photo of a barista pouring latte art at the Nimbus counter.',
      provider: 'gemini',
      model: 'gemini-2.5-flash-image',
      width: 1024,
      height: 1024,
      format: 'PNG',
      storagePath: saveDemoImage(NIMBUS_CREAM),
      status: 'COMPLETED',
      generationTimeMs: 2600,
    },
  })

  const videoScript = await prisma.videoAsset.create({
    data: {
      projectId: project.id,
      brandKitId: brandKit.id,
      videoGroupId: DEMO_VIDEO_GROUP_ID,
      kind: 'SCRIPT',
      prompt: 'Write a 30-second video script for the Spring roast launch.',
      output:
        '0:00 — Close on beans pouring into a roaster.\n0:05 — "Every batch, roasted the week you order."\n0:12 — Barista pouring latte art, steam rising.\n0:20 — Product shot: the Spring roast bag on a wooden table.\n0:25 — "Taste the difference. Nimbus Coffee Co."',
      model: 'gpt-4o',
      status: 'COMPLETED',
      generationTimeMs: 1900,
      createdBy: demoUserId,
    },
  })
  const videoStoryboard = await prisma.videoAsset.create({
    data: {
      projectId: project.id,
      brandKitId: brandKit.id,
      videoGroupId: DEMO_VIDEO_GROUP_ID,
      kind: 'STORYBOARD',
      prompt: 'Storyboard frame: opening shot of coffee beans being poured into a roaster.',
      provider: 'gemini',
      model: 'gemini-2.5-flash-image',
      width: 1024,
      height: 1024,
      format: 'PNG',
      storagePath: saveDemoImage(NIMBUS_LATTE),
      status: 'COMPLETED',
      generationTimeMs: 2300,
      createdBy: demoUserId,
    },
  })
  await prisma.videoAsset.create({
    data: {
      projectId: project.id,
      brandKitId: brandKit.id,
      videoGroupId: DEMO_VIDEO_GROUP_ID,
      kind: 'THUMBNAIL',
      prompt: 'Thumbnail frame for the Spring launch video.',
      provider: 'gemini',
      model: 'gemini-2.5-flash-image',
      width: 1280,
      height: 720,
      format: 'PNG',
      storagePath: saveDemoImage(NIMBUS_ROAST, 1280, 720),
      status: 'COMPLETED',
      generationTimeMs: 2000,
      createdBy: demoUserId,
    },
  })

  await prisma.assetReview.create({
    data: { projectId: project.id, assetType: 'BLOG', sourceId: blogPost.id, status: 'NEEDS_REVIEW' },
  })
  await prisma.assetReview.create({
    data: {
      projectId: project.id,
      assetType: 'SOCIAL_MEDIA',
      sourceId: socialPost.id,
      status: 'APPROVED',
      reviewerId: demoUserId,
      reviewedAt: new Date(),
      notes: 'Great tone — approved for scheduling.',
      qaScore: 9,
    },
  })
  await prisma.assetReview.create({
    data: {
      projectId: project.id,
      assetType: 'EMAIL',
      sourceId: launchEmail.id,
      status: 'APPROVED',
      reviewerId: demoUserId,
      reviewedAt: new Date(),
      notes: 'Approved and sent.',
      qaScore: 8,
    },
  })
  await prisma.assetReview.create({
    data: {
      projectId: project.id,
      assetType: 'IMAGE',
      sourceId: heroImage.id,
      status: 'REVISION_REQUESTED',
      reviewerId: demoUserId,
      reviewedAt: new Date(),
      notes: 'Please warm up the color grade slightly.',
    },
  })

  await prisma.assetComment.create({
    data: {
      projectId: project.id,
      assetType: 'IMAGE',
      sourceId: heroImage.id,
      authorId: demoUserId,
      body: 'Can we push the color grade a little warmer to match the Roast palette?',
      isInternal: true,
    },
  })

  await prisma.publishingRecord.create({
    data: {
      projectId: project.id,
      assetType: 'SOCIAL_MEDIA',
      sourceId: socialPost.id,
      platform: 'instagram',
      status: 'SCHEDULED',
      scheduledFor: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      createdById: demoUserId,
    },
  })
  await prisma.publishingRecord.create({
    data: {
      projectId: project.id,
      assetType: 'EMAIL',
      sourceId: launchEmail.id,
      platform: 'email',
      status: 'PUBLISHED',
      publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      externalUrl: 'https://example.com/campaigns/nimbus-spring-launch',
      createdById: demoUserId,
    },
  })

  const analyticsRows: AnalyticsSeedRow[] = [
    { assetType: 'BLOG', sourceId: blogPost.id, provider: 'openai', model: 'gpt-4o', generationTimeMs: 3200 },
    { assetType: 'SOCIAL_MEDIA', sourceId: socialPost.id, provider: 'openai', model: 'gpt-4o', generationTimeMs: 1400 },
    { assetType: 'EMAIL', sourceId: launchEmail.id, provider: 'openai', model: 'gpt-4o', generationTimeMs: 2100 },
    { assetType: 'IMAGE', sourceId: heroImage.id, provider: 'gemini', model: 'gemini-2.5-flash-image', generationTimeMs: 2450 },
    { assetType: 'IMAGE', sourceId: productImage.id, provider: 'gemini', model: 'gemini-2.5-flash-image', generationTimeMs: 2200 },
    { assetType: 'IMAGE', sourceId: lifestyleImage.id, provider: 'gemini', model: 'gemini-2.5-flash-image', generationTimeMs: 2600 },
    { assetType: 'VIDEO', sourceId: videoScript.id, provider: 'openai', model: 'gpt-4o', generationTimeMs: 1900 },
    { assetType: 'VIDEO', sourceId: videoStoryboard.id, provider: 'gemini', model: 'gemini-2.5-flash-image', generationTimeMs: 2300 },
  ]
  for (const row of analyticsRows) {
    await prisma.analyticsEvent.create({
      data: {
        projectId: project.id,
        assetType: row.assetType,
        sourceId: row.sourceId,
        type: 'GENERATED',
        actorId: demoUserId,
        provider: row.provider,
        model: row.model,
        generationTimeMs: row.generationTimeMs,
        brandKitId: brandKit.id,
      },
    })
  }
}
