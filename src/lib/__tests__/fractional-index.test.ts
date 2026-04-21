import { describe, it, expect } from 'vitest'
import { sortKeyBetween } from '../fractional-index'

describe('sortKeyBetween', () => {
  describe('legacy alphabetic keys', () => {
    it('sortKeyBetween("d", null) returns a string instead of throwing', () => {
      expect(() => sortKeyBetween('d', null)).not.toThrow()
      expect(typeof sortKeyBetween('d', null)).toBe('string')
      expect(sortKeyBetween('d', null).length).toBeGreaterThan(0)
    })

    it('sortKeyBetween("bn", null) returns a string instead of throwing', () => {
      expect(() => sortKeyBetween('bn', null)).not.toThrow()
      expect(typeof sortKeyBetween('bn', null)).toBe('string')
    })

    it('sortKeyBetween("xn", null) returns a string instead of throwing', () => {
      expect(() => sortKeyBetween('xn', null)).not.toThrow()
      expect(typeof sortKeyBetween('xn', null)).toBe('string')
    })

    it('sortKeyBetween(null, "xn") returns a string instead of throwing — legacy alpha as "after" param', () => {
      expect(() => sortKeyBetween(null, 'xn')).not.toThrow()
      expect(typeof sortKeyBetween(null, 'xn')).toBe('string')
    })

    it('sortKeyBetween("d", "xn") returns a string instead of throwing — both params legacy alpha', () => {
      expect(() => sortKeyBetween('d', 'xn')).not.toThrow()
      expect(typeof sortKeyBetween('d', 'xn')).toBe('string')
    })
  })

  describe('legacy numeric keys', () => {
    it('sortKeyBetween("0", null) returns a string — existing numeric guard still works', () => {
      expect(() => sortKeyBetween('0', null)).not.toThrow()
      expect(typeof sortKeyBetween('0', null)).toBe('string')
    })

    it('sortKeyBetween("1.5", null) returns a string — numeric float guard', () => {
      expect(() => sortKeyBetween('1.5', null)).not.toThrow()
      expect(typeof sortKeyBetween('1.5', null)).toBe('string')
    })

    it('sortKeyBetween("-1", null) returns a string — negative numeric guard', () => {
      expect(() => sortKeyBetween('-1', null)).not.toThrow()
      expect(typeof sortKeyBetween('-1', null)).toBe('string')
    })
  })

  describe('empty strings', () => {
    it('sortKeyBetween("", null) returns a string — empty string guard', () => {
      expect(() => sortKeyBetween('', null)).not.toThrow()
      expect(typeof sortKeyBetween('', null)).toBe('string')
    })
  })

  describe('null boundaries', () => {
    it('sortKeyBetween(null, null) returns "a0" — base case', () => {
      expect(sortKeyBetween(null, null)).toBe('a0')
    })
  })

  describe('valid fractional-index keys', () => {
    it('sortKeyBetween("a0", null) returns a valid key greater than "a0"', () => {
      const result = sortKeyBetween('a0', null)
      expect(typeof result).toBe('string')
      expect(result > 'a0').toBe(true)
    })

    it('sortKeyBetween(null, "a0") returns a valid key less than "a0"', () => {
      const result = sortKeyBetween(null, 'a0')
      expect(typeof result).toBe('string')
      expect(result < 'a0').toBe(true)
    })

    it('sortKeyBetween("a0", "a1") returns a valid key between them', () => {
      const result = sortKeyBetween('a0', 'a1')
      expect(typeof result).toBe('string')
      expect(result > 'a0').toBe(true)
      expect(result < 'a1').toBe(true)
    })
  })
})
