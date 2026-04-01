/**
 * generateSortOrder — lexicographic midpoint for TEXT sort_order columns.
 *
 * Character space: lowercase a-z (26 chars). Midpoint char = 'n' (index 13).
 *
 * Usage:
 *   generateSortOrder()               // empty column → "n"
 *   generateSortOrder("x")            // append after x → "xn"
 *   generateSortOrder(undefined, "c") // prepend before c → "bn"
 *   generateSortOrder("a", "c")       // midpoint between a and c → "b"
 *   generateSortOrder("a", "b")       // adjacent, extend depth → "an"
 */

const CHARS = 'abcdefghijklmnopqrstuvwxyz'
const MID_CHAR = 'n' // index 13
const MID_IDX = CHARS.indexOf(MID_CHAR) // 13

function charIdx(ch: string): number {
  return CHARS.indexOf(ch)
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
    // Find a string that sorts before `after`
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
      // e.g. after="c" → "bn", after="an" → "amn"
      return after.slice(0, i) + CHARS[idx - 1] + MID_CHAR
    }
    // char is 'a', keep going deeper
  }
  // All chars are 'a' — prepend by going deeper: "a".repeat(len) + MID_CHAR
  return after + MID_CHAR
}

/** Return a string strictly between `lo` and `hi`. */
function _midpoint(lo: string, hi: string): string {
  const maxLen = Math.max(lo.length, hi.length)

  for (let i = 0; i <= maxLen; i++) {
    const loChar = i < lo.length ? charIdx(lo[i]) : -1 // -1 means "before 'a'"
    const hiChar = i < hi.length ? charIdx(hi[i]) : 26  // 26 means "after 'z'"

    // Actual index in CHARS for lo at this depth:
    const loIdx = loChar === -1 ? 0 : loChar
    const hiIdx = hiChar === 26 ? 25 : hiChar

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

  // Fallback: shouldn't reach here in practice; append MID_CHAR to lo
  return lo + MID_CHAR
}

// ---------------------------------------------------------------------------
// Expected behavior (for reference):
// generateSortOrder("a", "c")  => "b"
// generateSortOrder("a", "b")  => "an"
// generateSortOrder("an", "b") => "at"  (approx midpoint between n=13 and b's extension)
// generateSortOrder(undefined, "c") => "bn"
// generateSortOrder("x", undefined) => "xn"
// generateSortOrder() => "n"
// ---------------------------------------------------------------------------
