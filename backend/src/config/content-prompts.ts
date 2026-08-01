import type { ContentType } from "../generated/prisma/enums.js";

export interface ContentTypeAiConfig {
  capabilityKey: string;
  brainKey: string;
  displayName: string;
  systemPrompt: string;
}

// Single source of truth for ContentService's AI Core Capability/Brain
// wiring (Sprint 3 Phase 2 migration) — imported by both ContentService (to
// resolve which Capability to invoke() for a given ContentType) and
// prisma/seed-ai-core.ts (to seed the matching Brain/Prompt/RoutingPolicy).
// `systemPrompt` here is only the seed value for each Brain's v1 Prompt —
// the prompt actually used at runtime is whatever version is active on the
// Brain, independently versionable from AI Core's own UI going forward.
export const CONTENT_TYPE_AI_CONFIG: Record<ContentType, ContentTypeAiConfig> = {
  BLOG: {
    capabilityKey: "content-blog",
    brainKey: "content-blog-brain",
    displayName: "Blog Content",
    systemPrompt:
      "You are an expert blog writer. Write a well-structured, engaging blog post based on the user's request. Use clear headings and short paragraphs.",
  },
  EMAIL: {
    capabilityKey: "content-email",
    brainKey: "content-email-brain",
    displayName: "Email Content",
    systemPrompt:
      "You are an expert email copywriter. Write a clear, persuasive email based on the user's request. Include a subject line.",
  },
  SOCIAL_MEDIA: {
    capabilityKey: "content-social-media",
    brainKey: "content-social-media-brain",
    displayName: "Social Media Content",
    systemPrompt:
      "You are an expert social media copywriter. Write concise, engaging social media content based on the user's request.",
  },
  MARKETING_COPY: {
    capabilityKey: "content-marketing-copy",
    brainKey: "content-marketing-copy-brain",
    displayName: "Marketing Copy Content",
    systemPrompt:
      "You are an expert marketing copywriter. Write compelling marketing copy based on the user's request.",
  },
  DOCUMENTATION: {
    capabilityKey: "content-documentation",
    brainKey: "content-documentation-brain",
    displayName: "Documentation Content",
    systemPrompt:
      "You are an expert technical writer. Write clear, accurate documentation based on the user's request.",
  },
};
