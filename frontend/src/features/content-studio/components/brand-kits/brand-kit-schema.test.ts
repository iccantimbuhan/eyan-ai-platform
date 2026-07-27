import { describe, expect, it } from 'vitest'

import type { BrandKit } from '../../types/brand-kit'
import {
  brandKitToFormValues,
  brandKitValuesToInput,
  defaultBrandKitValues,
} from './brand-kit-schema'

describe('brandKitValuesToInput', () => {
  it('splits comma-separated text fields into trimmed arrays, dropping empty entries', () => {
    const input = brandKitValuesToInput(
      {
        ...defaultBrandKitValues,
        name: 'Acme',
        approvedTerminologyText: 'Acme, AcmeCloud,  , Acme Inc',
        restrictedWordsText: 'cheap,discount',
        fontsText: '',
        primaryColorsText: '#1D4ED8, #0F172A',
      },
      'project-1'
    )

    expect(input.approvedTerminology).toEqual(['Acme', 'AcmeCloud', 'Acme Inc'])
    expect(input.restrictedWords).toEqual(['cheap', 'discount'])
    expect(input.fonts).toEqual([])
    expect(input.primaryColors).toEqual([{ hex: '#1D4ED8' }, { hex: '#0F172A' }])
    expect(input.projectId).toBe('project-1')
  })

  it('omits empty optional text fields rather than sending empty strings', () => {
    const input = brandKitValuesToInput(
      { ...defaultBrandKitValues, name: 'Acme', toneOfVoice: '' },
      'project-1'
    )

    expect(input.toneOfVoice).toBeUndefined()
  })
})

describe('brandKitToFormValues', () => {
  it('round-trips a brand kit into comma-joined text fields', () => {
    const brandKit: BrandKit = {
      id: 'bk-1',
      projectId: 'project-1',
      createdBy: 'user-1',
      name: 'Acme',
      client: null,
      logos: [{ url: 'https://cdn.example.com/logo.png' }],
      primaryColors: [{ hex: '#1D4ED8' }],
      secondaryColors: null,
      fonts: ['Inter', 'Georgia'],
      typography: null,
      toneOfVoice: 'Confident',
      writingStyle: null,
      audience: null,
      ctaStyle: null,
      approvedTerminology: ['Acme'],
      restrictedWords: [],
      brandGuidelines: null,
      imageStyle: null,
      socialMediaGuidelines: null,
      isDefault: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }

    const values = brandKitToFormValues(brandKit)

    expect(values.logosText).toBe('https://cdn.example.com/logo.png')
    expect(values.primaryColorsText).toBe('#1D4ED8')
    expect(values.fontsText).toBe('Inter, Georgia')
    expect(values.approvedTerminologyText).toBe('Acme')
    expect(values.restrictedWordsText).toBe('')
  })
})
