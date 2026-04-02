import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing'

/**
 * Computes a fractional-indexing sort key for a card dropped between `before` and `after`.
 *
 * Pass null for open-ended boundaries (prepend / append).
 * Empty strings ('') are coerced to null — existing cards in the DB have sort_order = ''
 * because fractional-indexing was not used before Phase 68.
 * Numeric strings ('0', '1', '1.5', '-1', etc.) are coerced to null — legacy integer
 * sort_order values crash generateKeyBetween (e.g., "invalid order key head: 1").
 * The SQL migration (21-fractional-index-data-migration.sql) fixes existing rows;
 * this coercion is the belt-and-suspenders guard against any remaining or future numeric values.
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
  // Coerce empty string — legacy DB default
  const a = before === '' ? null : before
  const b = after === '' ? null : after
  // Coerce numeric strings — legacy integer sort_order values crash generateKeyBetween
  // e.g., generateKeyBetween('1', null) throws "invalid order key head: 1"
  const safeA = (a !== null && /^-?\d/.test(a)) ? null : a
  const safeB = (b !== null && /^-?\d/.test(b)) ? null : b
  return generateKeyBetween(safeA, safeB)
}

export { generateKeyBetween, generateNKeysBetween }
