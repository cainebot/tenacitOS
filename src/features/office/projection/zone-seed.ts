// ── Hardcoded POIs for Phase 83+ MVP ──
// HARDCODED_ZONE_BINDINGS removed in Phase 84: bindings now come from
// office_zone_bindings Supabase table via useZoneBindings hook.
// useZoneBindings falls back to the hardcoded list if the DB query fails
// (see viewer/hooks/use-zone-bindings.ts).
//
// POIs remain hardcoded here because they are map-level data
// (part of OfficeMapDocument.pois in the Phase 3 Map Builder spec).
// Consumers: idle-scheduler.ts, idle-behavior.ts, idle-scheduler.test.ts

import type { POI } from '../types'

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
