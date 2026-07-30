import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { hashPassword } from '../src/utils/password'

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })

// Fixed credentials for the public "Experience EYAN Studio" portfolio tour
// (see frontend/src/features/portfolio) — the landing page's CTA logs in
// as this user through the normal /auth/login endpoint, so a recruiter
// never needs an account of their own.
const DEMO_USER_EMAIL = 'demo@eyanstudio.dev'
const DEMO_USER_PASSWORD = 'EyanStudioDemo!2026'
const DEMO_USER_NAME = 'Portfolio Demo'

const roles = [
  { name: 'Owner', description: 'Full system owner' },
  { name: 'Admin', description: 'System administrator' },
  { name: 'Developer', description: 'Software developer' },
  { name: 'QA Engineer', description: 'Quality Assurance' },
  { name: 'Viewer', description: 'Read-only user' },
]

// Page-level permissions. Granular keys can be added later without a schema change.
const permissions = [
  ['dashboard', 'View the dashboard'], ['chat', 'Use AI Chat'], ['models', 'View models'],
  ['conversations', 'View conversations'], ['users', 'Access users'], ['roles', 'Access roles'],
  ['providers', 'Access AI providers'], ['settings', 'Access settings'], ['apikeys', 'Access API keys'],
  ['analytics', 'View analytics'], ['auditlogs', 'View audit logs'],
  ['automation', 'Access the MCP automation foundation'],
  ['automationcredentials', 'Manage automation connection credentials'],
  ['finance', 'Access Finance Management'],
  ['presentation-engine', 'Access the Presentation Engine'],
] as const

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
  for (const role of roles) await prisma.role.upsert({ where: { name: role.name }, update: {}, create: role })
  for (const [name, description] of permissions) await prisma.permission.upsert({ where: { name }, update: { description }, create: { name, description } })
  const owner = await prisma.role.findUniqueOrThrow({ where: { name: 'Owner' } })
  for (const [name] of permissions) {
    const permission = await prisma.permission.findUniqueOrThrow({ where: { name } })
    await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: owner.id, permissionId: permission.id } }, update: {}, create: { roleId: owner.id, permissionId: permission.id } })
  }
  for (const template of promptTemplates) await prisma.promptTemplate.upsert({ where: { name: template.name }, update: template, create: template })

  // The public demo/presentation account is read-only by design (a publicly
  // documented credential must never carry admin/owner access) — Viewer
  // gets just enough view permissions for the Presentation Engine's
  // Recruiter Tour (Dashboard + AI Chat + Content Studio) to render cleanly
  // instead of 403-ing on e.g. the models list.
  const viewer = await prisma.role.findUniqueOrThrow({ where: { name: 'Viewer' } })
  const viewerPermissionNames = ['dashboard', 'chat', 'models', 'conversations'] as const
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
}
main().catch((error) => { console.error(error); process.exit(1) }).finally(() => prisma.$disconnect())
