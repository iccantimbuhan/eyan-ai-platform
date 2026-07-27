export interface BrandKitLogo {
  url: string
  label?: string
}

export interface BrandKitColor {
  hex: string
  label?: string
}

export interface BrandKit {
  id: string
  projectId: string
  createdBy: string
  name: string
  client: string | null
  logos: BrandKitLogo[] | null
  primaryColors: BrandKitColor[] | null
  secondaryColors: BrandKitColor[] | null
  fonts: string[] | null
  typography: string | null
  toneOfVoice: string | null
  writingStyle: string | null
  audience: string | null
  ctaStyle: string | null
  approvedTerminology: string[]
  restrictedWords: string[]
  brandGuidelines: string | null
  imageStyle: string | null
  socialMediaGuidelines: string | null
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateBrandKitInput {
  projectId: string
  name: string
  client?: string
  logos?: BrandKitLogo[]
  primaryColors?: BrandKitColor[]
  secondaryColors?: BrandKitColor[]
  fonts?: string[]
  typography?: string
  toneOfVoice?: string
  writingStyle?: string
  audience?: string
  ctaStyle?: string
  approvedTerminology?: string[]
  restrictedWords?: string[]
  brandGuidelines?: string
  imageStyle?: string
  socialMediaGuidelines?: string
}

export type UpdateBrandKitInput = Omit<CreateBrandKitInput, 'projectId'>
