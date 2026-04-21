import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing'

/**
 * Returns true if `key` is a valid fractional-indexing key that generateKeyBetween accepts.
 *
 * Uses a try-catch probe rather than regex — the library's own validation is the authority.
 * Any key the library rejects returns false regardless of format.
 */
function isValidOrderKey(key: string): boolean {
  try {
    generateKeyBetween(key, null)
    return true
  } catch {
    return false
  }
}

/**
 * Computes a fractional-indexing sort key for a card dropped between `before` and `after`.
 *
 * Pass null for open-ended boundaries (prepend / append).
 *
 * Three-layer coercion handles all known legacy sort_order formats:
 *
 * Layer 1 — Empty strings: coerced to null.
 *   Existing cards in the DB may have sort_order = '' because fractional-indexing
 *   was not used before Phase 68.
 *
 * Layer 2 — Numeric strings: fast-path regex coercion to null.
 *   Legacy integer sort_order values (e.g., '0', '1', '1.5', '-1') crash
 *   generateKeyBetween with "invalid order key head: 1". The regex /^-?\d/ catches
 *   all numeric formats cheaply before hitting the try-catch overhead.
 *   The SQL migration (21-fractional-index-data-migration.sql) fixes existing rows;
 *   this guard is the belt-and-suspenders fallback.
 *
 * Layer 3 — Universal try-catch validation via isValidOrderKey: any key the library
 *   rejects (e.g., alphabetic legacy keys 'd', 'bn', 'xn' from old sort-order.ts and
 *   04-seed-workflows.sql seed data) is coerced to null. These keys pass the numeric
 *   regex but violate the fractional-indexing key format constraints.
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
  // Layer 1: Coerce empty string — legacy DB default
  const a = before === '' ? null : before
  const b = after === '' ? null : after
  // Layer 2: Coerce numeric strings — fast-path regex guard
  // e.g., generateKeyBetween('1', null) throws "invalid order key head: 1"
  const numA = (a !== null && /^-?\d/.test(a)) ? null : a
  const numB = (b !== null && /^-?\d/.test(b)) ? null : b
  // Layer 3: Universal try-catch validation — catches alphabetic legacy keys ('d', 'bn', 'xn')
  // and any other format the library rejects that the numeric regex misses
  const safeA = (numA !== null && !isValidOrderKey(numA)) ? null : numA
  const safeB = (numB !== null && !isValidOrderKey(numB)) ? null : numB
  return generateKeyBetween(safeA, safeB)
}

export { generateKeyBetween, generateNKeysBetween }
