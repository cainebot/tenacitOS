import { PLAYER_SPEED } from '@/game/constants'

export type ArrivalBehavior = 'idle' | 'emote' | 'working'

/** Movement speed in pixels per second (matches player speed) */
export function getMovementSpeed(): number {
  return PLAYER_SPEED  // 360 px/s
}

/** What animation to play when agent arrives at zone */
export function getArrivalBehavior(zoneType: string): ArrivalBehavior {
  switch (zoneType) {
    case 'agent_desk': return 'idle'
    case 'project_board': return 'working'
    default: return 'emote'  // POIs, meeting rooms, etc.
  }
}
