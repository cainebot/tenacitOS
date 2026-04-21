import { describe, it, expect } from 'vitest'
import { generateSlug } from './projects'

describe('generateSlug', () => {
  it('converts simple name to lowercase hyphenated slug', () => {
    expect(generateSlug('Sales Pipeline')).toBe('sales-pipeline')
  })

  it('strips special characters', () => {
    expect(generateSlug('My Project!')).toBe('my-project')
  })

  it('collapses multiple separators into single hyphen', () => {
    expect(generateSlug('Hello   World---Test')).toBe('hello-world-test')
  })

  it('strips leading and trailing hyphens', () => {
    expect(generateSlug('--leading-trailing--')).toBe('leading-trailing')
  })

  it('handles single word', () => {
    expect(generateSlug('Testing')).toBe('testing')
  })

  it('handles numbers in name', () => {
    expect(generateSlug('Q2 2026 Marketing')).toBe('q2-2026-marketing')
  })

  it('handles unicode/accented characters by stripping them', () => {
    expect(generateSlug('Cafe Resume')).toBe('cafe-resume')
  })

  it('handles empty-ish input gracefully', () => {
    expect(generateSlug('---')).toBe('')
  })

  it('matches known backfill slugs from D-06', () => {
    expect(generateSlug('Sales Pipeline')).toBe('sales-pipeline')
    expect(generateSlug('Task Management')).toBe('task-management')
    expect(generateSlug('Testing')).toBe('testing')
  })
})
