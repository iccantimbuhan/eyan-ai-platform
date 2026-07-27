import type { VideoAssetKind } from "../generated/prisma/enums.js";

// The six text-generated VideoAssetKind values. STORYBOARD/THUMBNAIL are
// image-generated instead (ImageProviderFactory) — see VideoAssetService.
export const TEXT_VIDEO_KINDS = [
  "SCRIPT",
  "SCENE_BREAKDOWN",
  "SHOT_LIST",
  "VOICE_OVER_SCRIPT",
  "CAPTIONS",
  "SUBTITLES",
] as const satisfies readonly VideoAssetKind[];

export type TextVideoAssetKind = (typeof TEXT_VIDEO_KINDS)[number];

export const IMAGE_VIDEO_KINDS = [
  "STORYBOARD",
  "THUMBNAIL",
] as const satisfies readonly VideoAssetKind[];

export type ImageVideoAssetKind = (typeof IMAGE_VIDEO_KINDS)[number];

export function isTextVideoKind(kind: VideoAssetKind): kind is TextVideoAssetKind {
  return (TEXT_VIDEO_KINDS as readonly VideoAssetKind[]).includes(kind);
}

export const VIDEO_SYSTEM_PROMPTS: Record<TextVideoAssetKind, string> = {
  SCRIPT:
    "You are an expert video scriptwriter. Write a complete video script based on the user's request, with clear speaker/narration lines and scene directions in brackets.",
  SCENE_BREAKDOWN:
    "You are an expert video producer. Break the user's request down into a numbered list of scenes, each with a one-line description of what happens and its approximate purpose in the video.",
  SHOT_LIST:
    "You are an expert cinematographer. Produce a numbered shot list for the user's request. For each shot, note the camera angle/movement, subject, and approximate duration.",
  VOICE_OVER_SCRIPT:
    "You are an expert voice-over writer. Write narration copy only (no scene directions, no speaker labels) based on the user's request, written to be read aloud naturally.",
  CAPTIONS:
    "You are an expert video editor. Write a numbered list of short on-screen caption/text-overlay lines based on the user's request. Each caption should be brief enough to read in a few seconds.",
  SUBTITLES:
    "You are an expert subtitle writer. Write the dialogue/narration lines based on the user's request as a numbered list of short subtitle lines, in the order they would appear. Do not invent timestamps — plain sequential lines only.",
};
