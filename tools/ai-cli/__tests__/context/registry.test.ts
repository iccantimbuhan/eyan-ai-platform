import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { allContextEntries, findContextEntry } from '../../core/context/registry.js'
import { REPO_ROOT } from '../../core/repository.js'

const ALLOWED_CATEGORIES = new Set(['domain', 'standard', 'reference', 'operations'])

describe('context registry', () => {
  it('registers 12 entries', () => {
    expect(allContextEntries()).toHaveLength(12)
  })

  it('every entry path exists on disk', () => {
    for (const entry of allContextEntries()) {
      expect(existsSync(path.join(REPO_ROOT, entry.path))).toBe(true)
    }
  })

  it('every entry has a unique id', () => {
    const ids = allContextEntries().map((entry) => entry.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every entry category is one of the four allowed values', () => {
    for (const entry of allContextEntries()) {
      expect(ALLOWED_CATEGORIES.has(entry.category)).toBe(true)
    }
  })

  it('every included id is itself a registered id', () => {
    const ids = new Set(allContextEntries().map((entry) => entry.id))
    for (const entry of allContextEntries()) {
      for (const includedId of entry.includes ?? []) {
        expect(ids.has(includedId)).toBe(true)
      }
    }
  })

  it('throws on an unknown id', () => {
    expect(() => findContextEntry('does-not-exist')).toThrow(/Unknown context id/)
  })
})
