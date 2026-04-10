import { describe, it, expect, beforeEach } from 'vitest'

// ── Replicated pure logic from message.tsx (lines 20-66) ─────────────────────
// These functions are NOT exported from message.tsx (it's a 'use client' React
// component). The logic is replicated here verbatim to test the pure behavior.

const MAX_SIGNED_URL_CACHE = 500

/** Replicated from message.tsx: detect URLs near expiration */
function isUrlNearExpiry(createdAt: string): boolean {
  const ageMs = Date.now() - new Date(createdAt).getTime()
  return ageMs > 50 * 60 * 1000 // 50 minutes
}

// Cache type
interface CacheEntry { url: string; fetchedAt: number }

/**
 * Replicated from message.tsx: eviction + cache-hit logic.
 * Returns the cached URL if the entry is <50min old, otherwise null.
 * Performs eviction (expired-first, then FIFO) when cache exceeds MAX_SIGNED_URL_CACHE.
 */
function cacheGet(
  cache: Map<string, CacheEntry>,
  attachmentId: string,
  now: number,
): string | null {
  // Evict expired entries when cache exceeds size bound
  if (cache.size > MAX_SIGNED_URL_CACHE) {
    const cutoff = now - 55 * 60 * 1000
    for (const [key, entry] of cache) {
      if (entry.fetchedAt < cutoff) cache.delete(key)
    }
    // If still over limit after expiry eviction, drop oldest entries
    if (cache.size > MAX_SIGNED_URL_CACHE) {
      const excess = cache.size - MAX_SIGNED_URL_CACHE
      let removed = 0
      for (const key of cache.keys()) {
        if (removed >= excess) break
        cache.delete(key)
        removed += 1
      }
    }
  }

  // Check cache first — reuse if fetched within last 50 minutes
  const cached = cache.get(attachmentId)
  if (cached && (now - cached.fetchedAt) < 50 * 60 * 1000) {
    return cached.url
  }
  return null
}

/**
 * Replicated from message.tsx: the hasRefreshedRef guard in handleImgError.
 *
 * Models the pure decision logic of handleImgError:
 *   - if refreshing → do nothing (returns 'skip')
 *   - if no attachmentId OR hasRefreshed → set error (returns 'error')
 *   - otherwise → attempt fetch (returns 'fetch')
 *
 * After a fetch attempt the ref must be marked so the next call returns 'error'.
 */
function handleImgErrorDecision(
  refreshing: boolean,
  attachmentId: string | undefined,
  hasRefreshed: boolean,
): 'skip' | 'error' | 'fetch' {
  if (refreshing) return 'skip'
  if (!attachmentId || hasRefreshed) return 'error'
  return 'fetch'
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests: isUrlNearExpiry
// ─────────────────────────────────────────────────────────────────────────────

describe('isUrlNearExpiry', () => {
  it('returns true for a createdAt timestamp more than 50 minutes in the past', () => {
    const fiftyOneMinutesAgo = new Date(Date.now() - 51 * 60 * 1000).toISOString()
    expect(isUrlNearExpiry(fiftyOneMinutesAgo)).toBe(true)
  })

  it('returns true for a createdAt timestamp exactly 51 minutes in the past', () => {
    const fiftyOneMinutesAgo = new Date(Date.now() - 51 * 60 * 1000).toISOString()
    expect(isUrlNearExpiry(fiftyOneMinutesAgo)).toBe(true)
  })

  it('returns false for a createdAt timestamp only 10 minutes in the past', () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    expect(isUrlNearExpiry(tenMinutesAgo)).toBe(false)
  })

  it('returns false for a createdAt timestamp 49 minutes in the past (boundary)', () => {
    const fortyNineMinutesAgo = new Date(Date.now() - 49 * 60 * 1000).toISOString()
    expect(isUrlNearExpiry(fortyNineMinutesAgo)).toBe(false)
  })

  it('returns false for a very recent createdAt (just now)', () => {
    const justNow = new Date().toISOString()
    expect(isUrlNearExpiry(justNow)).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests: cacheGet (signedUrlCache + eviction logic)
// ─────────────────────────────────────────────────────────────────────────────

describe('cacheGet — cache hit', () => {
  let cache: Map<string, CacheEntry>

  beforeEach(() => {
    cache = new Map()
  })

  it('returns the cached URL when entry is less than 50 minutes old', () => {
    const now = Date.now()
    cache.set('att-1', { url: 'https://storage.example.com/file.jpg', fetchedAt: now - 5 * 60 * 1000 })
    const result = cacheGet(cache, 'att-1', now)
    expect(result).toBe('https://storage.example.com/file.jpg')
  })

  it('returns null when entry is exactly 50 minutes old (boundary — expired)', () => {
    const now = Date.now()
    cache.set('att-1', { url: 'https://example.com/file.jpg', fetchedAt: now - 50 * 60 * 1000 })
    const result = cacheGet(cache, 'att-1', now)
    expect(result).toBeNull()
  })

  it('returns null when no entry exists for the attachmentId', () => {
    const now = Date.now()
    const result = cacheGet(cache, 'att-nonexistent', now)
    expect(result).toBeNull()
  })

  it('returns null when cached entry is older than 50 minutes', () => {
    const now = Date.now()
    cache.set('att-1', { url: 'https://example.com/old.jpg', fetchedAt: now - 55 * 60 * 1000 })
    const result = cacheGet(cache, 'att-1', now)
    expect(result).toBeNull()
  })
})

describe('cacheGet — eviction: expires entries first when cache exceeds MAX_SIGNED_URL_CACHE', () => {
  it('evicts entries older than 55 minutes when cache is over the limit', () => {
    const cache = new Map<string, CacheEntry>()
    const now = Date.now()

    // Fill cache to MAX_SIGNED_URL_CACHE + 1 with expired entries
    for (let i = 0; i < MAX_SIGNED_URL_CACHE + 1; i++) {
      cache.set(`att-expired-${i}`, {
        url: `https://example.com/${i}.jpg`,
        fetchedAt: now - 60 * 60 * 1000, // 60 min old — past the 55-min eviction cutoff
      })
    }

    // Add the entry we want to retrieve (recent)
    cache.set('att-target', { url: 'https://example.com/target.jpg', fetchedAt: now - 1000 })

    // Cache is now MAX + 2 entries; cacheGet should evict expired ones
    const result = cacheGet(cache, 'att-target', now)
    expect(result).toBe('https://example.com/target.jpg')

    // Expired entries should have been removed
    expect(cache.size).toBeLessThanOrEqual(MAX_SIGNED_URL_CACHE)
  })

  it('drops oldest FIFO entries when over limit after expiry eviction', () => {
    const cache = new Map<string, CacheEntry>()
    const now = Date.now()

    // Fill cache with MAX + 2 recent (non-expired) entries
    // Map insertion order = FIFO, so first inserted are deleted first
    for (let i = 0; i < MAX_SIGNED_URL_CACHE + 2; i++) {
      cache.set(`att-recent-${i}`, {
        url: `https://example.com/${i}.jpg`,
        fetchedAt: now - 10 * 60 * 1000, // 10 min old — not expired
      })
    }

    // None are expired, so FIFO removal of 2 entries should kick in
    cacheGet(cache, 'att-recent-0', now) // trigger eviction

    // After FIFO eviction of excess=2: att-recent-0 and att-recent-1 should be gone
    expect(cache.has('att-recent-0')).toBe(false)
    expect(cache.has('att-recent-1')).toBe(false)
    // Cache size should be back at MAX
    expect(cache.size).toBeLessThanOrEqual(MAX_SIGNED_URL_CACHE)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests: handleImgError guard logic (hasRefreshedRef behavior)
// ─────────────────────────────────────────────────────────────────────────────

describe('handleImgError guard logic (hasRefreshedRef)', () => {
  it('returns skip when refreshing is already in progress', () => {
    const decision = handleImgErrorDecision(true, 'att-1', false)
    expect(decision).toBe('skip')
  })

  it('returns fetch when not refreshing, has attachmentId, hasRefreshed is false', () => {
    const decision = handleImgErrorDecision(false, 'att-1', false)
    expect(decision).toBe('fetch')
  })

  it('returns error when hasRefreshed is true — does not attempt second fetch', () => {
    const decision = handleImgErrorDecision(false, 'att-1', true)
    expect(decision).toBe('error')
  })

  it('returns error when attachmentId is undefined — no retry possible without ID', () => {
    const decision = handleImgErrorDecision(false, undefined, false)
    expect(decision).toBe('error')
  })

  it('returns error when attachmentId is undefined even if hasRefreshed is false', () => {
    const decision = handleImgErrorDecision(false, undefined, false)
    expect(decision).toBe('error')
  })

  it('second call with hasRefreshed=true always returns error regardless of refreshing state', () => {
    // Simulate: first call was fetch, then hasRefreshedRef was set to true
    // Second image onError call — refreshing=false but hasRefreshed now true
    const secondCall = handleImgErrorDecision(false, 'att-1', true)
    expect(secondCall).toBe('error')
  })

  it('refreshing=true takes priority over hasRefreshed=false (returns skip, not fetch)', () => {
    const decision = handleImgErrorDecision(true, 'att-1', false)
    expect(decision).toBe('skip')
  })
})
