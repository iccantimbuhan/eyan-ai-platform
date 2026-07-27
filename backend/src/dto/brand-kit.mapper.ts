import type { BrandKit } from "../generated/prisma/client.js";
import type {
  BrandKitColorDto,
  BrandKitLogoDto,
  BrandKitResponseDto,
} from "./brand-kit.dto.js";

export function mapBrandKitToResponse(row: BrandKit): BrandKitResponseDto {
  return {
    id: row.id,
    projectId: row.projectId,
    createdBy: row.createdBy,
    name: row.name,
    client: row.client,
    logos: (row.logos as BrandKitLogoDto[] | null) ?? null,
    primaryColors: (row.primaryColors as BrandKitColorDto[] | null) ?? null,
    secondaryColors: (row.secondaryColors as BrandKitColorDto[] | null) ?? null,
    fonts: (row.fonts as string[] | null) ?? null,
    typography: row.typography,
    toneOfVoice: row.toneOfVoice,
    writingStyle: row.writingStyle,
    audience: row.audience,
    ctaStyle: row.ctaStyle,
    approvedTerminology: row.approvedTerminology,
    restrictedWords: row.restrictedWords,
    brandGuidelines: row.brandGuidelines,
    imageStyle: row.imageStyle,
    socialMediaGuidelines: row.socialMediaGuidelines,
    isDefault: row.isDefault,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
