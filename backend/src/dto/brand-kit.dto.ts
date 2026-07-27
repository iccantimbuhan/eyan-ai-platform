export interface BrandKitLogoDto {
  url: string;
  label?: string;
}

export interface BrandKitColorDto {
  hex: string;
  label?: string;
}

export interface BrandKitResponseDto {
  id: string;
  projectId: string;
  createdBy: string;
  name: string;
  client: string | null;
  logos: BrandKitLogoDto[] | null;
  primaryColors: BrandKitColorDto[] | null;
  secondaryColors: BrandKitColorDto[] | null;
  fonts: string[] | null;
  typography: string | null;
  toneOfVoice: string | null;
  writingStyle: string | null;
  audience: string | null;
  ctaStyle: string | null;
  approvedTerminology: string[];
  restrictedWords: string[];
  brandGuidelines: string | null;
  imageStyle: string | null;
  socialMediaGuidelines: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBrandKitDto {
  projectId: string;
  name: string;
  client?: string;
  logos?: BrandKitLogoDto[];
  primaryColors?: BrandKitColorDto[];
  secondaryColors?: BrandKitColorDto[];
  fonts?: string[];
  typography?: string;
  toneOfVoice?: string;
  writingStyle?: string;
  audience?: string;
  ctaStyle?: string;
  approvedTerminology?: string[];
  restrictedWords?: string[];
  brandGuidelines?: string;
  imageStyle?: string;
  socialMediaGuidelines?: string;
  isDefault?: boolean;
}

export interface UpdateBrandKitDto {
  name?: string;
  client?: string;
  logos?: BrandKitLogoDto[];
  primaryColors?: BrandKitColorDto[];
  secondaryColors?: BrandKitColorDto[];
  fonts?: string[];
  typography?: string;
  toneOfVoice?: string;
  writingStyle?: string;
  audience?: string;
  ctaStyle?: string;
  approvedTerminology?: string[];
  restrictedWords?: string[];
  brandGuidelines?: string;
  imageStyle?: string;
  socialMediaGuidelines?: string;
  isDefault?: boolean;
}
