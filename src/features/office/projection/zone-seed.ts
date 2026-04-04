// ── Hardcoded zone bindings and POIs for Phase 83 MVP ──
// Supabase tables (office_maps, office_zone_bindings) are deferred.
// These constants replace DB queries until the office_maps table exists.
//
// COORDINATE CONSISTENCY: grid_x/grid_y match SPAWN_POSITIONS tileX/tileY exactly
// from control-panel/src/game/constants.ts:
//   pomni:   { tileX: 48, tileY: 42 }
//   kinger:  { tileX: 58, tileY: 38 }
//   ragatha: { tileX: 68, tileY: 42 }
//   jax:     { tileX: 42, tileY: 55 }
//   gangle:  { tileX: 90, tileY: 38 }
//   kaufmo:  { tileX: 55, tileY: 60 }
//   zooble:  { tileX: 82, tileY: 55 }
//
// Map bounds: 136 x 97 tiles (from office-v3.json)

import type { ZoneBinding, POI } from '../types'

export const HARDCODED_ZONE_BINDINGS: ZoneBinding[] = [
  {
    binding_id: 'desk-pomni',
    zone_id: 'zone-pomni-desk',
    binding_type: 'agent_desk',
    agent_id: 'pomni',
    project_id: null,
    board_id: null,
    grid_x: 48,
    grid_y: 42,
  },
  {
    binding_id: 'desk-kinger',
    zone_id: 'zone-kinger-desk',
    binding_type: 'agent_desk',
    agent_id: 'kinger',
    project_id: null,
    board_id: null,
    grid_x: 58,
    grid_y: 38,
  },
  {
    binding_id: 'desk-ragatha',
    zone_id: 'zone-ragatha-desk',
    binding_type: 'agent_desk',
    agent_id: 'ragatha',
    project_id: null,
    board_id: null,
    grid_x: 68,
    grid_y: 42,
  },
  {
    binding_id: 'desk-jax',
    zone_id: 'zone-jax-desk',
    binding_type: 'agent_desk',
    agent_id: 'jax',
    project_id: null,
    board_id: null,
    grid_x: 42,
    grid_y: 55,
  },
  {
    binding_id: 'desk-gangle',
    zone_id: 'zone-gangle-desk',
    binding_type: 'agent_desk',
    agent_id: 'gangle',
    project_id: null,
    board_id: null,
    grid_x: 90,
    grid_y: 38,
  },
  {
    binding_id: 'desk-kaufmo',
    zone_id: 'zone-kaufmo-desk',
    binding_type: 'agent_desk',
    agent_id: 'kaufmo',
    project_id: null,
    board_id: null,
    grid_x: 55,
    grid_y: 60,
  },
  {
    binding_id: 'desk-zooble',
    zone_id: 'zone-zooble-desk',
    binding_type: 'agent_desk',
    agent_id: 'zooble',
    project_id: null,
    board_id: null,
    grid_x: 82,
    grid_y: 55,
  },
]

export const HARDCODED_POIS: POI[] = [
  {
    id: 'poi-coffee',
    type: 'coffee',
    gridX: 45,
    gridY: 45,
    flavorTexts: [
      'Just what I needed — third espresso before 10am.',
      'The machine always makes it perfect. Unlike Kaufmo.',
      'Brewing... loading... compiling...',
    ],
  },
  {
    id: 'poi-whiteboard',
    type: 'whiteboard',
    gridX: 70,
    gridY: 35,
    flavorTexts: [
      'Someone drew a flowchart with no exit condition. Classic.',
      'This is where the good ideas happen. And also the bad ones.',
    ],
  },
  {
    id: 'poi-plant',
    type: 'plant',
    gridX: 35,
    gridY: 50,
    flavorTexts: [
      'Still alive. Somehow. Unlike the last sprint.',
      'I named it Claude. It never argues back.',
    ],
  },
  {
    id: 'poi-water-cooler',
    type: 'water_cooler',
    gridX: 50,
    gridY: 50,
    flavorTexts: [
      'Did you hear? They added a sixth standup. Per day.',
      'Hydration is important. So is avoiding Pomni when she is in planning mode.',
    ],
  },
  {
    id: 'poi-bookshelf',
    type: 'bookshelf',
    gridX: 85,
    gridY: 40,
    flavorTexts: [
      'Thinking About Thinking, Volume 3. Still unread.',
      'Every book here has "system" or "scale" in the title.',
    ],
  },
]
