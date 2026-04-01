import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing'

/**
 * Computes a fractional-indexing sort key for a card dropped between `before` and `after`.
 *
 * Pass null for open-ended boundaries (prepend / append).
 * Empty strings ('') are coerced to null — existing cards in the DB have sort_order = ''
 * because fractional-indexing was not used before Phase 68.
 *
 * IMPORTANT: Use native < / > string comparison for ordering, NOT localeCompare().
 * Fractional-indexing keys are case-sensitive ASCII.
 *
 * NOTE: This utility is created in Phase 68 for consumption by Phase 69 (Zustand store)
 * and Phase 70 (page wiring). Pages are NOT migrated to use sortKeyBetween in Phase 68 —
 * they continue using generateSortOrder from @/lib/sort-order until Phase 70.
 */
export function sortKeyBetween(
  before: string | null,
  after: string | null,
): string {
  const a = before === '' ? null : before
  const b = after === '' ? null : after
  return generateKeyBetween(a, b)
}

export { generateKeyBetween, generateNKeysBetween }
