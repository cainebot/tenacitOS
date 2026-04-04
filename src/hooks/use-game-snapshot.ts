'use client'

import { useSyncExternalStore } from 'react'
import { subscribe, getSnapshot, type GameSnapshot } from '@/game/state-snapshot'

/** Subscribe to the full game snapshot. Re-renders on every Phaser frame notify. */
export function useGameSnapshot(): GameSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/** Subscribe with a selector — only re-renders when selected value changes. */
export function useGameSnapshotSelector<T>(selector: (s: GameSnapshot) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(getSnapshot()),
    () => selector(getSnapshot()),
  )
}
