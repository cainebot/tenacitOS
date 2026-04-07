import { describe, it, expect } from 'vitest'

// Test the optimistic update logic for toggleReaction
// These test the pure state transformation that toggleReaction applies

interface ReactionData {
  emoji: string
  count: number
  selected: boolean
}

/** Replicate the optimistic update logic from useAgentChat.toggleReaction */
function applyOptimisticReaction(
  reactions: ReactionData[],
  emoji: string,
  isRemoving: boolean
): ReactionData[] {
  const updated = reactions.map((r) => {
    if (r.emoji !== emoji) return r
    return { ...r, count: r.count + (isRemoving ? -1 : 1), selected: !r.selected }
  })
  if (!isRemoving && !reactions.some((r) => r.emoji === emoji)) {
    updated.push({ emoji, count: 1, selected: true })
  }
  return updated.filter((r) => r.count > 0)
}

describe('toggleReaction optimistic update', () => {
  it('adds a new reaction when none exists for that emoji', () => {
    const result = applyOptimisticReaction([], '👍', false)
    expect(result).toEqual([{ emoji: '👍', count: 1, selected: true }])
  })

  it('increments count when adding to an existing reaction from others', () => {
    const existing: ReactionData[] = [{ emoji: '👍', count: 2, selected: false }]
    const result = applyOptimisticReaction(existing, '👍', false)
    expect(result).toEqual([{ emoji: '👍', count: 3, selected: true }])
  })

  it('decrements count when removing own reaction', () => {
    const existing: ReactionData[] = [{ emoji: '👍', count: 3, selected: true }]
    const result = applyOptimisticReaction(existing, '👍', true)
    expect(result).toEqual([{ emoji: '👍', count: 2, selected: false }])
  })

  it('removes reaction pill when count reaches 0', () => {
    const existing: ReactionData[] = [{ emoji: '👍', count: 1, selected: true }]
    const result = applyOptimisticReaction(existing, '👍', true)
    expect(result).toEqual([])
  })

  it('does not affect other emojis', () => {
    const existing: ReactionData[] = [
      { emoji: '👍', count: 1, selected: false },
      { emoji: '❤️', count: 2, selected: true },
    ]
    const result = applyOptimisticReaction(existing, '👍', false)
    expect(result).toHaveLength(2)
    expect(result.find((r) => r.emoji === '❤️')).toEqual({ emoji: '❤️', count: 2, selected: true })
    expect(result.find((r) => r.emoji === '👍')).toEqual({ emoji: '👍', count: 2, selected: true })
  })

  describe('revert (inverse of optimistic)', () => {
    it('reverts an add by decrementing and deselecting', () => {
      // After optimistic add: count=1, selected=true
      // Revert = remove (isRemoving=true)
      const afterAdd: ReactionData[] = [{ emoji: '👍', count: 1, selected: true }]
      const reverted = applyOptimisticReaction(afterAdd, '👍', true)
      expect(reverted).toEqual([])
    })

    it('reverts a remove by incrementing and reselecting', () => {
      // After optimistic remove: count=1, selected=false
      // Revert = add (isRemoving=false)
      const afterRemove: ReactionData[] = [{ emoji: '👍', count: 1, selected: false }]
      const reverted = applyOptimisticReaction(afterRemove, '👍', false)
      expect(reverted).toEqual([{ emoji: '👍', count: 2, selected: true }])
    })
  })
})
