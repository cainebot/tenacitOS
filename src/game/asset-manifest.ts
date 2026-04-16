import type { OfficeMapDocument } from '@/features/office/types'
import {
  TILESET,
  PLAYER_SPRITE,
  CHAR_SPRITES,
} from './constants'
import {
  EMOTE_SPRITESHEET_KEY,
  EMOTE_SPRITESHEET_PATH,
} from './entities/emote-display'

export interface AssetManifest {
  tilemap: { key: string; url: string }
  tilesets: Array<{ key: string; mapName: string; url: string }>
  spritesheets: Array<{
    key: string
    url: string
    frameWidth: number
    frameHeight: number
  }>
}

/**
 * Build asset manifest from map document.
 * Pass null for hardcoded fallback (backward compatible).
 */
export function buildManifest(mapDoc: OfficeMapDocument | null): AssetManifest {
  const tilemapUrl = mapDoc?.tiledMapUrl ?? '/assets/maps/office-v3.json'

  return {
    tilemap: { key: 'office', url: tilemapUrl },
    tilesets: [
      { key: TILESET.key, mapName: TILESET.mapName, url: TILESET.path },
    ],
    spritesheets: [
      // Player
      { key: PLAYER_SPRITE.key, url: PLAYER_SPRITE.path, frameWidth: 48, frameHeight: 96 },
      // Agent characters
      ...CHAR_SPRITES.map((s) => ({
        key: s.key,
        url: s.path,
        frameWidth: 48,
        frameHeight: 96,
      })),
      // Emotes
      { key: EMOTE_SPRITESHEET_KEY, url: EMOTE_SPRITESHEET_PATH, frameWidth: 48, frameHeight: 48 },
    ],
  }
}
