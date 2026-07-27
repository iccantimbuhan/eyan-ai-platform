import type { BrandKit } from "../generated/prisma/client.js";

// Shared by ContentService and ImageService: turns a Brand Kit row into a
// short guidance block folded into a generation prompt. Deliberately
// advisory text appended to the prompt, not an enforcement/validation
// layer — restrictedWords are asked to be avoided, not scanned for and
// rejected. See docs/ASSET_LIBRARY.md.
export function buildContentBrandGuidance(kit: BrandKit): string {
  const lines: string[] = [`Follow this brand's guidance for "${kit.name}":`];

  if (kit.toneOfVoice) lines.push(`Tone of voice: ${kit.toneOfVoice}`);
  if (kit.writingStyle) lines.push(`Writing style: ${kit.writingStyle}`);
  if (kit.audience) lines.push(`Audience: ${kit.audience}`);
  if (kit.ctaStyle) lines.push(`Call-to-action style: ${kit.ctaStyle}`);
  if (kit.approvedTerminology.length > 0) {
    lines.push(`Prefer this terminology: ${kit.approvedTerminology.join(", ")}`);
  }
  if (kit.restrictedWords.length > 0) {
    lines.push(`Avoid these words/phrases: ${kit.restrictedWords.join(", ")}`);
  }
  if (kit.brandGuidelines) lines.push(`Additional guidelines: ${kit.brandGuidelines}`);

  return lines.join("\n");
}

export function buildImageBrandGuidance(kit: BrandKit): string | null {
  return kit.imageStyle ? `Brand image style for "${kit.name}": ${kit.imageStyle}` : null;
}
