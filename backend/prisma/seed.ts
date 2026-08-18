import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { hashPassword } from '../src/utils/password'
import { seedDemoContentStudioProject } from './seed-demo-content'
import {
  seedAiCoreFoundation,
  seedGeneralChatBrain,
  seedContentBrains,
  seedVideoPlanningBrain,
  seedVideoTextBrains,
  seedFinanceBrains,
  seedFinanceQuestionBrain,
} from './seed-ai-core'
import { bootstrapPlatform } from './bootstrap'

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })

// Fixed credentials for the public "Experience EYAN Studio" portfolio tour
// (see frontend/src/features/portfolio) — the landing page's CTA logs in
// as this user through the normal /auth/login endpoint, so a recruiter
// never needs an account of their own.
const DEMO_USER_EMAIL = 'demo@eyanstudio.dev'
const DEMO_USER_PASSWORD = 'EyanStudioDemo!2026'
const DEMO_USER_NAME = 'Portfolio Demo'

const promptTemplates = [
  { name: 'Blog Post', category: 'Blogging', contentType: 'BLOG', promptBody: 'Write a blog post about {{topic}} for {{business}}. Target audience: {{audience}}. Tone: {{tone}}. Write in {{language}}.' },
  { name: 'SEO Description', category: 'Blogging', contentType: 'MARKETING_COPY', promptBody: 'Write an SEO meta description for {{business}} about {{topic}}. Include these keywords naturally: {{keywords}}. Keep it under 160 characters.' },
  { name: 'Facebook Post', category: 'Social Media', contentType: 'SOCIAL_MEDIA', promptBody: 'Write a Facebook post for {{business}} about {{topic}}. Audience: {{audience}}. Tone: {{tone}}.' },
  { name: 'Instagram Caption', category: 'Social Media', contentType: 'SOCIAL_MEDIA', promptBody: 'Write an Instagram caption for {{business}} about {{topic}}. Tone: {{tone}}. Include hashtags related to {{keywords}}.' },
  { name: 'LinkedIn Post', category: 'Social Media', contentType: 'SOCIAL_MEDIA', promptBody: 'Write a LinkedIn post for {{business}} about {{topic}}, targeting {{audience}}. Tone: {{tone}}. Goal: {{goal}}.' },
  { name: 'Product Description', category: 'Marketing', contentType: 'MARKETING_COPY', promptBody: "Write a product description for {{business}}'s product: {{topic}}. Target audience: {{audience}}. Highlight benefits related to: {{keywords}}." },
  { name: 'Email', category: 'Business Communication', contentType: 'EMAIL', promptBody: 'Write an email from {{business}} to {{audience}} about {{topic}}. Tone: {{tone}}. Goal: {{goal}}.' },
  { name: 'Cold Outreach', category: 'Business Communication', contentType: 'EMAIL', promptBody: 'Write a cold outreach email from {{business}} to {{audience}} about {{topic}}. Goal: {{goal}}. Keep the tone {{tone}} and concise.' },
  { name: 'Meeting Summary', category: 'Business Communication', contentType: 'DOCUMENTATION', promptBody: 'Summarize a meeting about {{topic}} for {{audience}}. Include key decisions and next steps. Tone: {{tone}}.' },
] as const

async function main() {
  // Platform-required bootstrap (roles, permissions, Restaurant tenancy
  // foundation) — the same function deploy.sh now runs automatically via
  // `pnpm db:bootstrap`. Called here too so `pnpm db:seed` remains a
  // complete one-command setup for a fresh local/dev database. See
  // bootstrap.ts for why this is a separate function, not inlined here.
  await bootstrapPlatform(prisma)

  for (const template of promptTemplates) await prisma.promptTemplate.upsert({ where: { name: template.name }, update: template, create: template })

  // The public demo/presentation account is read-only by design (a publicly
  // documented credential must never carry admin/owner access) — Viewer
  // gets just enough view permissions for the Presentation Engine's
  // Recruiter Tour (Dashboard + AI Chat + Content Studio) to render cleanly
  // instead of 403-ing on e.g. the models list. 'presentation-engine' was
  // added in Phase 2B so the same account can also reach the Presentation
  // Library directly and start the AI Content Studio Tour Pack itself — it
  // only gates a read-only launcher page, so it stays within the same
  // least-privilege posture as the rest of this list.
  const viewer = await prisma.role.findUniqueOrThrow({ where: { name: 'Viewer' } })
  const viewerPermissionNames = [
    'dashboard',
    'chat',
    'models',
    'conversations',
    'presentation-engine',
  ] as const
  for (const name of viewerPermissionNames) {
    const permission = await prisma.permission.findUniqueOrThrow({ where: { name } })
    await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: viewer.id, permissionId: permission.id } }, update: {}, create: { roleId: viewer.id, permissionId: permission.id } })
  }

  const existingDemoUser = await prisma.user.findUnique({ where: { email: DEMO_USER_EMAIL } })
  const demoUser =
    existingDemoUser ??
    (await prisma.user.create({
      data: {
        name: DEMO_USER_NAME,
        email: DEMO_USER_EMAIL,
        passwordHash: await hashPassword(DEMO_USER_PASSWORD),
        emailVerified: true,
      },
    }))
  await prisma.userRole.upsert({ where: { userId_roleId: { userId: demoUser.id, roleId: viewer.id } }, update: {}, create: { userId: demoUser.id, roleId: viewer.id } })

  // Seeds a fully-populated ContentProject so the Presentation Engine's AI
  // Content Studio Tour Pack has real generated content/images/brand kit/
  // video assets/review/publishing state to show — see seed-demo-content.ts.
  await seedDemoContentStudioProject(prisma, demoUser.id)

  // AI Core Sprint 2 — the first production Capability/Brain pair, config
  // relocated verbatim from ADR-0020 — see seed-ai-core.ts.
  await seedAiCoreFoundation(prisma)
  await seedGeneralChatBrain(prisma)
  await seedContentBrains(prisma)
  await seedVideoPlanningBrain(prisma)
  await seedVideoTextBrains(prisma)

  // Finance AI Core migration — see seed-ai-core.ts's own comment on
  // seedFinanceBrains() for the full rationale.
  await seedFinanceBrains(prisma)

  // GET_FINANCE_QUESTION — a new, standalone Finance capability (not a
  // migration of an existing n8n-embedded call); see seed-ai-core.ts's own
  // comment on seedFinanceQuestionBrain() for the full rationale.
  await seedFinanceQuestionBrain(prisma)
}
main().catch((error) => { console.error(error); process.exit(1) }).finally(() => prisma.$disconnect())
