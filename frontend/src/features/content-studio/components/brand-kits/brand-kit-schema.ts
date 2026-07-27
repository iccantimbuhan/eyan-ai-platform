import { z } from 'zod'

import type { BrandKit, CreateBrandKitInput } from '../../types/brand-kit'

// Comma-separated free text in the form, split into arrays only at submit
// time (parseCommaList) — avoids needing a field-array/tag-input component
// for what are otherwise plain string[]/{hex}[]/{url}[] API fields.
export const brandKitSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(200),
  client: z.string().trim().max(200).optional(),
  logosText: z.string().trim().optional(),
  primaryColorsText: z.string().trim().optional(),
  secondaryColorsText: z.string().trim().optional(),
  fontsText: z.string().trim().optional(),
  typography: z.string().trim().max(200).optional(),
  toneOfVoice: z.string().trim().max(2000).optional(),
  writingStyle: z.string().trim().max(2000).optional(),
  audience: z.string().trim().max(2000).optional(),
  ctaStyle: z.string().trim().max(2000).optional(),
  approvedTerminologyText: z.string().trim().optional(),
  restrictedWordsText: z.string().trim().optional(),
  brandGuidelines: z.string().trim().max(8000).optional(),
  imageStyle: z.string().trim().max(2000).optional(),
  socialMediaGuidelines: z.string().trim().max(8000).optional(),
})

export type BrandKitFormValues = z.infer<typeof brandKitSchema>

export const defaultBrandKitValues: BrandKitFormValues = {
  name: '',
  client: '',
  logosText: '',
  primaryColorsText: '',
  secondaryColorsText: '',
  fontsText: '',
  typography: '',
  toneOfVoice: '',
  writingStyle: '',
  audience: '',
  ctaStyle: '',
  approvedTerminologyText: '',
  restrictedWordsText: '',
  brandGuidelines: '',
  imageStyle: '',
  socialMediaGuidelines: '',
}

function parseCommaList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function brandKitValuesToInput(
  values: BrandKitFormValues,
  projectId: string
): CreateBrandKitInput {
  return {
    projectId,
    name: values.name,
    client: values.client || undefined,
    logos: parseCommaList(values.logosText).map((url) => ({ url })),
    primaryColors: parseCommaList(values.primaryColorsText).map((hex) => ({ hex })),
    secondaryColors: parseCommaList(values.secondaryColorsText).map((hex) => ({ hex })),
    fonts: parseCommaList(values.fontsText),
    typography: values.typography || undefined,
    toneOfVoice: values.toneOfVoice || undefined,
    writingStyle: values.writingStyle || undefined,
    audience: values.audience || undefined,
    ctaStyle: values.ctaStyle || undefined,
    approvedTerminology: parseCommaList(values.approvedTerminologyText),
    restrictedWords: parseCommaList(values.restrictedWordsText),
    brandGuidelines: values.brandGuidelines || undefined,
    imageStyle: values.imageStyle || undefined,
    socialMediaGuidelines: values.socialMediaGuidelines || undefined,
  }
}

export function brandKitToFormValues(brandKit: BrandKit): BrandKitFormValues {
  return {
    name: brandKit.name,
    client: brandKit.client ?? '',
    logosText: (brandKit.logos ?? []).map((logo) => logo.url).join(', '),
    primaryColorsText: (brandKit.primaryColors ?? [])
      .map((color) => color.hex)
      .join(', '),
    secondaryColorsText: (brandKit.secondaryColors ?? [])
      .map((color) => color.hex)
      .join(', '),
    fontsText: (brandKit.fonts ?? []).join(', '),
    typography: brandKit.typography ?? '',
    toneOfVoice: brandKit.toneOfVoice ?? '',
    writingStyle: brandKit.writingStyle ?? '',
    audience: brandKit.audience ?? '',
    ctaStyle: brandKit.ctaStyle ?? '',
    approvedTerminologyText: brandKit.approvedTerminology.join(', '),
    restrictedWordsText: brandKit.restrictedWords.join(', '),
    brandGuidelines: brandKit.brandGuidelines ?? '',
    imageStyle: brandKit.imageStyle ?? '',
    socialMediaGuidelines: brandKit.socialMediaGuidelines ?? '',
  }
}
