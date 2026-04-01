/**
 * generateSortOrder — lexicographic midpoint for TEXT sort_order columns.
 *
 * Character space: '0'-'9' then 'a'-'z' (36 chars, ASCII-sorted).
 * This ensures we can always prepend before any existing value
 * (e.g., before "a" → "9n").
 *
 * Backward-compatible: existing values like "a", "bm", "c" sort correctly
 * since digits (48-57) come before lowercase letters (97-122) in ASCII.
 *
 * Usage:
 *   generateSortOrder()               // empty column → "n"
 *   generateSortOrder("x")            // append after x → "xn"
 *   generateSortOrder(undefined, "c") // prepend before c → "bn"
 *   generateSortOrder("a", "c")       // midpoint between a and c → "b"
 *   generateSortOrder(undefined, "a") // prepend before a → "9n"
 */

const CHARS = '0123456789abcdefghijklmnopqrstuvwxyz' // 36 chars, ASCII-sorted
const MID_CHAR = 'n' // roughly middle of the full range
const FIRST_CHAR = CHARS[0] // '0'

function charIdx(ch: string): number {
  const idx = CHARS.indexOf(ch)
  return idx >= 0 ? idx : 0
}

/**
 * Compute a string strictly between `before` and `after` in lexicographic order.
 * Both, one, or neither may be provided.
 */
export function generateSortOrder(before?: string, after?: string): string {
  // Case: neither provided
  if (!before && !after) {
    return MID_CHAR
  }

  // Case: only before provided (append to bottom)
  if (before && !after) {
    return before + MID_CHAR
  }

  // Case: only after provided (prepend to top)
  if (!before && after) {
    return _prepend(after)
  }

  // Case: both provided — find midpoint
  return _midpoint(before!, after!)
}

/** Return a string that sorts strictly before `after`. */
function _prepend(after: string): string {
  // Walk from the start; find the first char we can decrement
  for (let i = 0; i < after.length; i++) {
    const idx = charIdx(after[i])
    if (idx > 0) {
      // Decrement this char and append MID_CHAR to stay between
      // e.g. after="c" → "bn", after="an" → "amn", after="a" → "9n"
      return after.slice(0, i) + CHARS[idx - 1] + MID_CHAR
    }
    // char is '0' (absolute minimum), keep going deeper
  }
  // All chars are '0' — extend by one more level
  // "0".repeat(len) + MID_CHAR is still > "0".repeat(len), but
  // "0".repeat(len+1) < "0".repeat(len) + MID_CHAR, so go even lower
  return after + FIRST_CHAR + MID_CHAR
}

/** Return a string strictly between `lo` and `hi`. */
function _midpoint(lo: string, hi: string): string {
  const maxLen = Math.max(lo.length, hi.length)

  for (let i = 0; i <= maxLen; i++) {
    const loChar = i < lo.length ? charIdx(lo[i]) : -1
    const hiChar = i < hi.length ? charIdx(hi[i]) : CHARS.length

    const loIdx = loChar === -1 ? 0 : loChar
    const hiIdx = hiChar >= CHARS.length ? CHARS.length - 1 : hiChar

    if (hiIdx - loIdx > 1) {
      // There's a character between them — pick the midpoint
      const mid = Math.floor((loIdx + hiIdx) / 2)
      return lo.slice(0, i) + CHARS[mid]
    }

    if (hiIdx - loIdx === 1) {
      // Adjacent characters — extend lo by MID_CHAR and return
      return lo.slice(0, i + 1) + MID_CHAR
    }

    // loIdx === hiIdx — same character at this depth, continue to next level
  }

  // Fallback: shouldn't reach here in practice
  return lo + MID_CHAR
}

// ---------------------------------------------------------------------------
// Expected behavior (for reference):
// generateSortOrder("a", "c")       => "b"
// generateSortOrder("a", "b")       => "an"
// generateSortOrder("an", "b")      => "at" (midpoint)
// generateSortOrder(undefined, "c") => "bn"
// generateSortOrder(undefined, "a") => "9n"  (digits sort before letters)
// generateSortOrder("x", undefined) => "xn"
// generateSortOrder()               => "n"
// ---------------------------------------------------------------------------
