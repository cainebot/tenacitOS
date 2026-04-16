# CircOS Office — Architectural Analysis & Restructuring Proposal

**Date:** 2026-04-03
**Status:** Draft for review with advisors
**Author:** Architecture analysis based on CircOS, Agent Town, Claw3D, and Gather.town research

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Reference Projects Deep Dive](#3-reference-projects-deep-dive)
4. [Vision: CircOS Office v2](#4-vision-circos-office-v2)
5. [Proposed Architecture](#5-proposed-architecture)
6. [Technology Stack Decisions](#6-technology-stack-decisions)
7. [Data Model Design](#7-data-model-design)
8. [System Modules Breakdown](#8-system-modules-breakdown)
9. [Phase Roadmap](#9-phase-roadmap)
10. [Architecture Decision Records](#10-architecture-decision-records)
11. [Risk Assessment](#11-risk-assessment)
12. [Open Questions for Advisors](#12-open-questions-for-advisors)

---

## 1. Executive Summary

### What We Want to Build

A **2D pixel art virtual office** — similar to Gather.town — where AI agents (OpenClaw) are first-class citizens alongside human users. The office has:

- A **grid-based interactive map** with zones (desks, meeting rooms, testing labs, etc.)
- A **Map Maker** (built-in editor) to design and assign office spaces
- A **Character Maker** for avatar customization (skin, hair, clothing, accessories)
- **Real-time agent visualization**: agents walk to their desks, to project boards, to testing zones
- **Multi-user support**: multiple humans can enter the same office and interact with agents and each other
- **Supabase as the state bus**: all data flows through PostgreSQL + Realtime (already proven in v1)

### What Exists Today

| Aspect | CircOS v1 Status |
|--------|-----------------|
| Phaser 3 | Installed, **zero implementation** |
| Tilemap | office2.json ready (27x20, 48px tiles, Tiled format) |
| Tilesets | 17+ PNG files (LimeZu Modern series) |
| Character sprites | 7 spritesheet files (48x48 frames) |
| Zone system | SQL schema with `departments.zone_bounds` (3 hardcoded zones) |
| Realtime | Fully working (agents, tasks, messages, nodes, departments) |
| Agent data model | Complete (status, department, soul_config, skills, tasks) |
| Kanban/boards | Fully built (Zustand + dnd-kit + Supabase) |
| UI components | @circos/ui (Untitled UI PRO) library complete |
| Map Maker | None |
| Character Maker | None |
| Multiplayer | None (Supabase Realtime is one-way broadcast, not presence) |
| Phaser-React bridge | None |

### Key Insight

CircOS has **excellent backend infrastructure** (Supabase, Realtime, agent system, Kanban) but **zero game layer**. Agent Town has a **solid Phaser implementation** (pathfinding, workers, idle behavior, emotes) but **no persistent backend**. Claw3D has the **most feature-complete agent visualization** but uses **3D (Three.js)** which doesn't match our Gather-style vision. We take the best patterns from each.

---

## 2. Current State Analysis

### 2.1 CircOS Control Panel (What We Have)

**Tech stack**: Next.js 15, React 19, Tailwind CSS v4.1, Phaser 3 (unused), Supabase, Zustand, @circos/ui

**Strengths to preserve:**
- Supabase schema: `agents`, `departments`, `tasks`, `nodes`, `skills`, `agent_messages` — all with Realtime enabled
- Real-time hooks: `useRealtimeAgents()`, `useRealtimeTasks()`, etc. — proven pattern
- Kanban system: full board/column/card CRUD with offline sync (IndexedDB), optimistic updates, conflict resolution
- API layer: 100+ routes covering agents, boards, cards, tasks, projects, sessions, skills
- UI library: @circos/ui with semantic tokens, accessible components (React Aria)
- Agent identity system: SOUL.md files, 7 defined agents with roles and departments

**Gaps to fill:**
- Phaser game scene (not even initialized)
- No Phaser-React communication bridge
- No pathfinding system
- No agent movement/animation logic
- No zone editor / Map Maker
- No character customization
- No multiplayer presence system
- Zone bounds are pixel rectangles in SQL — not grid-aligned

### 2.2 Asset Inventory

```
public/assets/
├── maps/
│   └── office2.json          # Tiled export, 27x20 tiles @ 48px
├── tilesets/                  # 17 PNG tilesets (LimeZu Modern series)
│   ├── Modern_Office_48x48.png
│   ├── Room_Builder_Office_48x48.png
│   ├── Conference_Hall_48x48.png
│   └── ... (14 more)
├── sprites/
│   ├── animated_door_big.png  # Door animation
│   ├── witch_cauldron.png     # Animated prop
│   ├── arrow.png              # Pointer
│   └── emotes_48x48.png       # Emote spritesheet
└── characters/
    └── Premade_Character_48x48_01-09.png  # 7 character sheets
```

**Sprite sheet format**: 48x96px frames (48 wide, 96 tall per character). Standard LimeZu layout:
- Row 0: Preview/thumbnails
- Row 1: Idle (6 frames x 4 directions)
- Row 2: Walk (6 frames x 4 directions)

### 2.3 Supabase Schema (Relevant Tables)

| Table | Key Fields | Role in Office |
|-------|-----------|----------------|
| `agents` | id, name, status, department_id, avatar_model, soul_config | Agent identity & state |
| `departments` | id, name, color, zone_bounds (JSONB) | Maps to office zones |
| `tasks` | id, source_agent_id, target_agent_id, status, description | Drives agent behavior |
| `agent_messages` | sender_id, recipient_agent_id, topic, channel | Agent communication |
| `boards` | id, name, project_id | Kanban boards |
| `columns` | id, board_id, name, position | Board columns |
| `cards` | id, column_id, title, description, assignee_agent_id | Task cards |
| `projects` | id, name, description | Project groupings |

---

## 3. Reference Projects Deep Dive

### 3.1 Agent Town (by geezerrrr)

**What it is**: A pixel-art AI agent collaboration platform using Phaser 3 + Next.js.

**Architecture highlights:**

```
[Browser]
  ├── Next.js App (single page)
  ├── Phaser OfficeScene (single scene, Arcade Physics)
  ├── GameEventBus (typed events bridge Phaser <-> React)
  └── WebSocket → OpenClaw Gateway
```

**What we should adopt:**

| Pattern | Details | Why |
|---------|---------|-----|
| **Phaser-React Bridge** | Typed `GameEventBus` with events like `task-assigned`, `worker-status-changed` | Clean decoupling — Phaser scene doesn't know about React |
| **Worker Entity Model** | `Worker.ts` (800+ lines) with state machine: idle → working → done/failed → idle | Mature agent behavior system |
| **A* Pathfinding** | Custom MinHeap-based A*, 16px cell grid, 8-directional, stuck detection | Performant, proven for this exact use case |
| **Tiled Map Integration** | 6 tilelayers + object layers for spawns, POIs, collisions | Standard workflow, same tilesets we already have |
| **Idle Behavior System** | Workers wander to POIs (water cooler, printer, bookshelf) with staggered timing | Brings the office to life |
| **Emote System** | 48x48 emote spritesheet (sleep, thinking, working, etc.) above characters | Visual feedback for agent state |
| **Collision from Tiled** | Dedicated `collisions` object layer parsed into Arcade Physics static bodies | No manual collision mapping |
| **Seat System** | Spawn objects in Tiled with seatId + facing direction | Desk assignment via map objects |

**What we should NOT adopt:**
- localStorage persistence (we have Supabase)
- Single-user only (we need multiplayer)
- No zone editor (we need a built-in maker)
- No character customization (we need an avatar maker)
- Hardcoded worker list (our agents are dynamic from Supabase)

### 3.2 Claw3D (by LukeTheDev)

**What it is**: A 3D virtual office for AI agents using Three.js + React Three Fiber + Phaser (builder only).

**Architecture highlights:**

```
[Browser]
  ├── Next.js 16 App
  ├── Three.js / R3F (Immersive 3D office)
  ├── Phaser (2D office builder only)
  ├── React Context + Reducer (agent state)
  └── WebSocket Proxy → OpenClaw Gateway
```

**What we should adopt:**

| Pattern | Details | Why |
|---------|---------|-----|
| **Desk Directives** | `deskDirectives.ts` — unified intent parsing for "go to desk", "go to gym", "go to QA lab" | Maps agent actions to physical locations |
| **Animation State Derivation** | Two-pass: Event reduction (latches) → Reconciliation from transcript history | Smooth, deterministic animation state |
| **Office Schema** | `OfficeMap` type with furniture, collisions, zones, lights, interactions, spawn points | Comprehensive world definition |
| **Desk Assignments** | `Record<deskObjectId, agentId>` — maps physical desks to agents | Core feature we need |
| **Zone Types** | Desk, Gym, Server Room, QA Lab, Phone Booth, Kanban Board | Rich zone vocabulary |
| **Office Persistence** | API routes for save/load/publish office layouts | Needed for Map Maker |
| **Navigation Grid** | `buildNavGrid()` with A* on 25px cells, furniture blocks navigation | Furniture-aware pathfinding |

**What we should NOT adopt:**
- Three.js / 3D rendering (we want 2D pixel art)
- 7,246-line monolith scene file (needs modular decomposition)
- No database (we have Supabase)
- Procedural avatar generation (we want sprite-based customization)
- Complex WebSocket proxy chain (Supabase Realtime is simpler)

### 3.3 Gather.town Reference

**Grid system**: 32x32 px tiles. Map = background image + collision matrix + object array + tile effects.

**Key patterns to adopt:**

| Pattern | Gather Implementation | Our Adaptation |
|---------|----------------------|----------------|
| **Tile grid** | 32x32px | **48x48px** (matches our existing tilesets) |
| **Tile effects** | 5 types: Impassable, Spawn, Portal, Private Area, Spotlight | 6 types: Impassable, Spawn, Portal, Agent Desk, Project Board, Meeting Room |
| **Map Maker** | Built-in editor: paint tiles, place objects, set tile effects | Built-in React overlay: grid editor with drag/drop objects + zone painting |
| **Avatar layers** | outfitString → composited spritesheet (skin, hair, top, bottom, accessory) | Same pattern with our 48x48 sprites — composite at render time |
| **Zones** | Painted onto grid as tile effect overlays | Same — store zone type per cell in a 2D matrix |
| **Interactive objects** | Type + activation radius + embedded content URL | Type + activation radius + callback (open panel, show board, etc.) |
| **Multiplayer** | WebSocket + Protobuf for game state, WebRTC SFU for audio/video | **Supabase Realtime** for game state (positions, actions), WebRTC for audio/video (Phase N) |

---

## 4. Vision: CircOS Office v2

### 4.1 Core Experience

```
┌─────────────────────────────────────────────────────────┐
│                    CircOS Virtual Office                  │
│  ┌───────────────────────────────────────────────────┐  │
│  │                                                     │  │
│  │          ╔═══════════╗    ╔═══════════╗            │  │
│  │          ║ Pomni's   ║    ║ Project   ║            │  │
│  │          ║ Desk  🎪  ║    ║ Board  📋 ║            │  │
│  │          ╚═══════════╝    ╚═══════════╝            │  │
│  │    🧵                                               │  │
│  │   Ragatha     ╔═══════════════╗                    │  │
│  │   (walking)   ║ Meeting Room  ║   👑 Kinger        │  │
│  │               ║  Project X    ║   (at desk)        │  │
│  │               ╚═══════════════╝                    │  │
│  │                                                     │  │
│  │  👤 You                    🃏 Jax (testing)        │  │
│  │                                                     │  │
│  └───────────────────────────────────────────────────┘  │
│  [Chat] [Tasks] [Agents] [Map Maker] [Settings]        │
└─────────────────────────────────────────────────────────┘
```

### 4.2 User Stories (Ordered by Priority)

**P0 — Foundation:**
1. I see a 2D pixel art office with my agents at their desks
2. Agents visually change state (idle animation, working animation, thinking emote)
3. I can click an agent to open their detail panel (chat, tasks, status)
4. Agent positions sync in real-time via Supabase

**P1 — Map Maker:**
5. I can open a Map Maker to edit the office layout
6. I can paint zones on the grid (agent desk, project board, meeting room)
7. I can assign an agent to a desk zone
8. I can assign a project/board to a meeting room or board zone
9. I can place decorative objects (furniture, plants, etc.)

**P2 — Agent Intelligence:**
10. When an agent starts a task for Project X, they walk to Project X's board zone
11. When an agent finishes, they walk back to their desk
12. Idle agents wander to POIs (water cooler, bookshelf) with flavor emotes
13. I can assign tasks by walking my avatar to an agent and interacting

**P3 — Character Maker:**
14. I can customize agent avatars (skin tone, hair, outfit, accessories)
15. Customizations persist and render as composited spritesheets
16. Each agent has a unique visual identity

**P4 — Multiplayer:**
17. Multiple users can join the same office simultaneously
18. I see other users' avatars moving in real-time
19. Users can interact with agents together
20. Presence indicators show who's online

**P5+ — Future:**
21. Voice/video via WebRTC when users are in proximity
22. Embedded screens in meeting rooms (shared whiteboards, docs)
23. Agent-to-agent visible interactions (walking to each other, collaborating)

---

## 5. Proposed Architecture

### 5.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                               │
│                                                              │
│  ┌──────────────────────┐  ┌──────────────────────────────┐ │
│  │    PHASER 3 LAYER    │  │       REACT HUD LAYER        │ │
│  │                      │  │                               │ │
│  │  OfficeScene         │  │  AgentPanel, ChatPanel,       │ │
│  │  ├─ TilemapRenderer  │  │  TaskPanel, MapMakerPanel,    │ │
│  │  ├─ AgentManager     │  │  CharacterMakerPanel,         │ │
│  │  ├─ PlayerController │  │  KanbanBoard, ProjectView     │ │
│  │  ├─ ZoneRenderer     │  │                               │ │
│  │  ├─ CameraController │  │  ┌─────────────────────────┐ │ │
│  │  ├─ InteractionMgr   │  │  │   @circos/ui (UUI PRO)  │ │ │
│  │  └─ PathfindingGrid  │  │  └─────────────────────────┘ │ │
│  └──────────┬───────────┘  └──────────────┬───────────────┘ │
│             │                              │                  │
│             └──────────┬───────────────────┘                  │
│                        │                                      │
│              ┌─────────▼──────────┐                           │
│              │   GameEventBus     │                           │
│              │  (Typed Events)    │                           │
│              └─────────┬──────────┘                           │
│                        │                                      │
│              ┌─────────▼──────────┐                           │
│              │   Zustand Stores   │                           │
│              │  ├─ officeStore    │                           │
│              │  ├─ agentStore     │                           │
│              │  ├─ boardStore     │                           │
│              │  └─ presenceStore  │                           │
│              └─────────┬──────────┘                           │
│                        │                                      │
│              ┌─────────▼──────────┐                           │
│              │  Supabase Client   │                           │
│              │  ├─ Realtime sub   │                           │
│              │  ├─ Presence chan  │                           │
│              │  └─ CRUD ops      │                           │
│              └─────────┬──────────┘                           │
└────────────────────────┼────────────────────────────────────┘
                         │
                    ┌────▼────┐
                    │ SUPABASE │
                    │          │
                    │ PostgreSQL│
                    │ Realtime  │
                    │ Presence  │
                    │ Storage   │
                    │ Edge Fn   │
                    └──────────┘
```

### 5.2 Communication Flow

```
Agent status change (Supabase)
  → Realtime broadcast
  → useRealtimeAgents() hook updates Zustand
  → Zustand notifies GameEventBus
  → Phaser AgentManager receives event
  → Agent sprite changes animation / walks to new zone

User clicks agent in Phaser
  → InteractionManager emits 'agent-clicked' event
  → GameEventBus forwards to React
  → React opens AgentDetailPanel (HUD overlay)
  → User sends message via panel
  → Supabase insert → agent_messages table
  → Realtime broadcast to all clients

Map Maker saves layout
  → React MapMakerPanel builds OfficeMap JSON
  → Supabase Storage upload (office-maps bucket)
  → office_maps table updated with reference
  → Realtime broadcast → all connected clients reload map
  → Phaser re-initializes OfficeScene with new map data

User joins office (multiplayer)
  → Supabase Presence channel.track({ user_id, avatar, position })
  → Other clients receive 'join' event
  → Phaser spawns new PlayerSprite for the user
  → Position updates throttled to 100ms via Presence sync
```

### 5.3 Module Architecture

```
src/
├── game/                          # PHASER LAYER (new)
│   ├── config.ts                  # Phaser.GameConfig
│   ├── PhaserBridge.tsx           # React component mounting Phaser (dynamic, ssr:false)
│   ├── events.ts                  # Typed GameEventBus (Phaser ↔ React)
│   ├── scenes/
│   │   ├── OfficeScene.ts         # Main game scene
│   │   ├── BootScene.ts           # Asset preloading
│   │   └── MapMakerScene.ts       # Map editing scene
│   ├── entities/
│   │   ├── AgentSprite.ts         # AI agent character (state machine, animations)
│   │   ├── PlayerSprite.ts        # Human user character (keyboard controlled)
│   │   ├── RemotePlayerSprite.ts  # Other users (interpolated movement)
│   │   ├── ChatBubble.ts          # Text above characters
│   │   └── EmoteDisplay.ts        # Emote icons above characters
│   ├── systems/
│   │   ├── AgentManager.ts        # Agent lifecycle, state sync
│   │   ├── PlayerManager.ts       # Local + remote player management
│   │   ├── CameraController.ts    # Follow, zoom, pan
│   │   ├── InteractionManager.ts  # Proximity-based interactions
│   │   ├── ZoneRenderer.ts        # Zone overlay visualization
│   │   ├── DoorManager.ts         # Animated doors
│   │   └── IdleBehavior.ts        # Agent wandering AI
│   ├── pathfinding/
│   │   ├── Pathfinder.ts          # A* with MinHeap
│   │   ├── NavGrid.ts             # Grid from collision + furniture
│   │   └── types.ts               # Path types
│   └── utils/
│       ├── MapHelpers.ts          # Tiled JSON parsing
│       ├── SpriteCompositor.ts    # Layer-based avatar composition
│       └── AnimationFactory.ts    # Sprite animation definitions
│
├── features/                      # FEATURE MODULES
│   ├── map-maker/                 # Map Maker (new)
│   │   ├── components/
│   │   │   ├── MapMakerPanel.tsx   # Main editor UI
│   │   │   ├── TilePalette.tsx     # Tile/object selection
│   │   │   ├── ZonePainter.tsx     # Zone assignment tool
│   │   │   ├── ObjectPlacer.tsx    # Furniture drag & drop
│   │   │   └── PropertyEditor.tsx  # Zone/object properties
│   │   ├── hooks/
│   │   │   └── useMapMaker.ts      # Editor state management
│   │   └── types.ts
│   │
│   ├── character-maker/           # Character Maker (new, Phase v2)
│   │   ├── components/
│   │   │   ├── AvatarEditor.tsx    # Layer-by-layer customization
│   │   │   ├── LayerPicker.tsx     # Skin, hair, outfit selector
│   │   │   └── AvatarPreview.tsx   # Live preview
│   │   ├── lib/
│   │   │   ├── compositor.ts       # Canvas-based sprite composition
│   │   │   └── layers.ts           # Available customization layers
│   │   └── types.ts
│   │
│   ├── office/                    # Office state & data (new)
│   │   ├── stores/
│   │   │   ├── office-store.ts     # Zustand: map data, zones, furniture
│   │   │   └── presence-store.ts   # Zustand: online users, positions
│   │   ├── hooks/
│   │   │   ├── useOfficeMap.ts     # Load/save office map
│   │   │   ├── useAgentPositions.ts # Agent position subscriptions
│   │   │   └── usePresence.ts      # Multiplayer presence
│   │   └── types.ts                # OfficeMap, Zone, Furniture types
│   │
│   ├── agents/                    # Agent management (existing, enhanced)
│   ├── boards/                    # Kanban system (existing)
│   └── projects/                  # Project management (existing)
│
├── app/                           # NEXT.JS ROUTES
│   ├── (dashboard)/
│   │   ├── office/page.tsx        # THE MAIN OFFICE (Phaser + HUD)
│   │   ├── office/maker/page.tsx  # Map Maker mode
│   │   ├── agents/...             # Existing agent pages
│   │   └── projects/...           # Existing project pages
│   └── api/
│       ├── office/                # Office API routes
│       │   ├── map/route.ts       # CRUD office maps
│       │   ├── zones/route.ts     # Zone management
│       │   └── presence/route.ts  # Presence helpers
│       └── ...                    # Existing APIs
│
├── lib/                           # SHARED UTILITIES
│   ├── supabase.ts                # Client (existing)
│   └── game-events.ts             # Event type definitions
│
└── stores/                        # GLOBAL STORES
    ├── board-store.ts             # Existing
    └── office-store.ts            # New: office state
```

---

## 6. Technology Stack Decisions

### 6.1 Confirmed Stack (No Changes Needed)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | Next.js 15 + React 19 | Already in use, App Router works well |
| **Game Engine** | Phaser 3 | Already installed, same as Agent Town and Gather.town |
| **Styling** | Tailwind CSS v4.1 | Already in use with @circos/ui |
| **UI Library** | @circos/ui (Untitled UI PRO) | Already wrapped and customized |
| **Database** | Supabase PostgreSQL | Already in use, proven Realtime |
| **State** | Zustand | Already in use for boards |
| **Tile Format** | Tiled JSON (48x48) | Assets already exist |
| **Sprites** | LimeZu Modern series (48x48) | Assets already exist |

### 6.2 New Additions

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Multiplayer State** | Supabase Presence | Built into Supabase client, no new dependency. Tracks online users + positions. Automatic cleanup on disconnect. |
| **Asset Composition** | HTML5 Canvas API (OffscreenCanvas) | For compositing avatar layers into spritesheets at runtime. Zero dependencies. |
| **Pathfinding** | Custom A* (from Agent Town pattern) | Proven for 48px grid, no library needed. ~200 lines of code. |
| **Map Storage** | Supabase Storage (office-maps bucket) | Store map JSON + custom tilesets. Already available. |

### 6.3 Decisions on Proposed Technologies

#### GraphQL — **NOT RECOMMENDED**

| Pro | Con |
|-----|-----|
| Flexible queries | Supabase already provides PostgREST (flexible filtering, embedding, pagination) |
| Type generation | `supabase gen types` already generates TypeScript types |
| Subscriptions | Supabase Realtime already handles this natively |

**Verdict**: GraphQL adds complexity without benefit here. Supabase's PostgREST + Realtime covers all our data access patterns. If we ever need computed/aggregated data, Supabase Edge Functions or PostgreSQL views are sufficient.

#### WebRTC (for audio/video) — **DEFERRED TO P5+**

For multiplayer audio/video in proximity zones, we would eventually need:
- A WebRTC SFU (Selective Forwarding Unit) — options: LiveKit (open source), Janus, or Mediasoup
- Supabase Edge Functions for signaling

**Verdict**: Not needed until the multiplayer voice phase. The architecture supports it — Supabase Presence already tracks who's in which zone, so we know who should be connected.

#### Redis / Pub-Sub — **NOT NEEDED**

Supabase Realtime is backed by PostgreSQL's `pg_notify` + Phoenix PubSub. For our scale (< 100 concurrent users per office), this is more than sufficient. Redis would only be needed at 1000+ concurrent users.

#### Socket.io / Custom WebSocket — **NOT NEEDED**

Supabase's Realtime client handles:
- Table change subscriptions (INSERT/UPDATE/DELETE)
- Presence (user tracking with automatic cleanup)
- Broadcast (arbitrary messages to channel members)

All three primitives we need for the office. No custom WebSocket server required.

---

## 7. Data Model Design

### 7.1 New Tables

```sql
-- Office map definitions (one active map per office/space)
CREATE TABLE office_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  space_id UUID REFERENCES spaces(id),  -- for multi-office support
  version INT NOT NULL DEFAULT 1,
  tilemap_url TEXT,                       -- Supabase Storage URL for Tiled JSON
  grid_width INT NOT NULL DEFAULT 27,     -- tiles
  grid_height INT NOT NULL DEFAULT 20,    -- tiles
  tile_size INT NOT NULL DEFAULT 48,      -- pixels
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Zone definitions painted on the grid
CREATE TABLE office_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID REFERENCES office_maps(id) ON DELETE CASCADE,
  zone_type TEXT NOT NULL CHECK (zone_type IN (
    'agent_desk', 'project_board', 'meeting_room',
    'testing_lab', 'break_room', 'spawn', 'portal'
  )),
  -- Grid coordinates (tile units, not pixels)
  grid_x INT NOT NULL,
  grid_y INT NOT NULL,
  grid_width INT NOT NULL DEFAULT 1,
  grid_height INT NOT NULL DEFAULT 1,
  -- Assignment
  assigned_agent_id UUID REFERENCES agents(agent_id),
  assigned_project_id UUID REFERENCES projects(id),
  assigned_board_id UUID REFERENCES boards(id),
  -- Display
  label TEXT,
  color TEXT,                              -- Override zone type default color
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Furniture and decorative objects placed on the map
CREATE TABLE office_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID REFERENCES office_maps(id) ON DELETE CASCADE,
  object_type TEXT NOT NULL,               -- 'desk', 'chair', 'plant', 'screen', etc.
  sprite_key TEXT NOT NULL,                -- Reference to tileset sprite
  grid_x INT NOT NULL,
  grid_y INT NOT NULL,
  grid_width INT NOT NULL DEFAULT 1,
  grid_height INT NOT NULL DEFAULT 1,
  rotation INT DEFAULT 0,                  -- 0, 90, 180, 270
  blocks_navigation BOOLEAN DEFAULT false,
  is_interactive BOOLEAN DEFAULT false,
  interaction_type TEXT,                   -- 'open_panel', 'show_board', 'show_chat'
  interaction_data JSONB,                  -- { panelType: 'kanban', boardId: '...' }
  layer INT DEFAULT 0,                     -- Rendering order
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Agent positions in the office (real-time, frequently updated)
CREATE TABLE agent_positions (
  agent_id UUID PRIMARY KEY REFERENCES agents(agent_id),
  map_id UUID REFERENCES office_maps(id),
  grid_x INT NOT NULL,
  grid_y INT NOT NULL,
  facing TEXT DEFAULT 'down' CHECK (facing IN ('up', 'down', 'left', 'right')),
  animation_state TEXT DEFAULT 'idle' CHECK (animation_state IN (
    'idle', 'walking', 'working', 'thinking', 'emote'
  )),
  current_emote TEXT,                      -- 'sleep', 'thinking', 'star', etc.
  target_zone_id UUID REFERENCES office_zones(id),  -- Where agent is heading
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Avatar customization layers
CREATE TABLE avatar_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Polymorphic: can be agent or user avatar
  agent_id UUID REFERENCES agents(agent_id),
  user_id UUID REFERENCES auth.users(id),
  -- Layer definitions
  base_sprite TEXT NOT NULL DEFAULT 'Premade_Character_48x48_01',
  skin_tone TEXT DEFAULT 'default',
  hair_style TEXT,
  hair_color TEXT,
  outfit_top TEXT,
  outfit_bottom TEXT,
  accessory TEXT,
  -- Composed result (cached)
  composed_spritesheet_url TEXT,           -- Supabase Storage URL
  config_hash TEXT,                        -- Hash of layers for cache invalidation
  updated_at TIMESTAMPTZ DEFAULT now(),
  CHECK (
    (agent_id IS NOT NULL AND user_id IS NULL) OR
    (agent_id IS NULL AND user_id IS NOT NULL)
  )
);

-- Spaces (multi-office support, future-proofing)
CREATE TABLE spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  max_participants INT DEFAULT 25,
  is_public BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Space membership (who can access which office)
CREATE TABLE space_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(space_id, user_id)
);
```

### 7.2 Realtime Configuration

```sql
-- Enable Realtime on new tables
ALTER TABLE agent_positions REPLICA IDENTITY FULL;
ALTER TABLE office_zones REPLICA IDENTITY FULL;
ALTER TABLE office_objects REPLICA IDENTITY FULL;
ALTER TABLE office_maps REPLICA IDENTITY FULL;

-- Add to Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE agent_positions;
ALTER PUBLICATION supabase_realtime ADD TABLE office_zones;
ALTER PUBLICATION supabase_realtime ADD TABLE office_objects;
ALTER PUBLICATION supabase_realtime ADD TABLE office_maps;
```

### 7.3 Presence Channel Schema

```typescript
// Supabase Presence payload for multiplayer
interface UserPresence {
  user_id: string;
  display_name: string;
  avatar_config_id: string;
  grid_x: number;
  grid_y: number;
  facing: 'up' | 'down' | 'left' | 'right';
  animation_state: 'idle' | 'walking';
  last_active: string; // ISO timestamp
}

// Channel: `office:${spaceId}`
// Each user tracks their presence on join
// Presence automatically cleaned up on disconnect
```

### 7.4 OfficeMap JSON Schema (for Supabase Storage)

```typescript
interface OfficeMap {
  version: number;
  meta: {
    name: string;
    gridWidth: number;    // tiles
    gridHeight: number;   // tiles
    tileSize: number;     // pixels (48)
  };
  tilemap: {
    // Reference to Tiled JSON file
    tiledJsonUrl: string;
    // Or embedded Tiled JSON for self-contained maps
    tiledJson?: TiledMap;
  };
  zones: OfficeZone[];
  objects: OfficeObject[];
  spawnPoints: Array<{ gridX: number; gridY: number; facing: string }>;
  collisionGrid: boolean[][];  // true = blocked
  poiPoints: Array<{
    id: string;
    type: 'water_cooler' | 'bookshelf' | 'printer' | 'coffee' | 'whiteboard';
    gridX: number;
    gridY: number;
    flavorTexts: string[];
  }>;
}
```

---

## 8. System Modules Breakdown

### 8.1 Phaser-React Bridge

```typescript
// game/events.ts — Typed event bus
type GameEvents = {
  // Phaser → React
  'agent-clicked': { agentId: string; screenX: number; screenY: number };
  'zone-clicked': { zoneId: string; zoneType: string };
  'player-moved': { gridX: number; gridY: number };
  'interaction-available': { entityId: string; entityType: string };

  // React → Phaser
  'agent-state-changed': { agentId: string; status: AgentStatus; targetZoneId?: string };
  'map-updated': { mapData: OfficeMap };
  'focus-agent': { agentId: string };
  'enter-maker-mode': {};
  'exit-maker-mode': {};

  // Multiplayer
  'remote-player-joined': { userId: string; presence: UserPresence };
  'remote-player-moved': { userId: string; gridX: number; gridY: number };
  'remote-player-left': { userId: string };
};
```

### 8.2 Agent State Machine

```
                    ┌──────────────┐
                    │    IDLE      │ (at desk, idle animation)
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
      ┌──────────┐  ┌──────────┐  ┌──────────┐
      │ WANDERING│  │  WALKING │  │ ASSIGNED │
      │ (to POI) │  │ (to zone)│  │ (task)   │
      └────┬─────┘  └────┬─────┘  └────┬─────┘
           │              │              │
           ▼              ▼              ▼
      ┌──────────┐  ┌──────────┐  ┌──────────┐
      │ AT_POI   │  │ AT_ZONE  │  │ WORKING  │
      │ (emote)  │  │ (arrived)│  │ (at desk │
      └────┬─────┘  └──────────┘  │  or zone)│
           │                       └────┬─────┘
           │                            │
           └────────────┬───────────────┘
                        │
                        ▼
                 ┌──────────────┐
                 │    IDLE      │ (returns to desk)
                 └──────────────┘
```

**State transitions triggered by:**
- Supabase `agents.status` changes → `agent-state-changed` event
- Task assignment (`tasks` INSERT with `target_agent_id`) → agent walks to project board zone
- Task completion → agent returns to desk
- Idle timeout → agent wanders to random POI
- POI timeout → agent returns to desk

### 8.3 Map Maker System

```
┌─────────────────────────────────────────────────────┐
│                   MAP MAKER MODE                     │
│                                                      │
│  ┌─────────────┐  ┌────────────────────────────┐   │
│  │ Tool Palette│  │     Grid Canvas (Phaser)    │   │
│  │             │  │                              │   │
│  │ [Select]    │  │  Click/drag to paint zones   │   │
│  │ [Zone Paint]│  │  Drag objects from palette   │   │
│  │ [Object]    │  │  Click zone to assign agent  │   │
│  │ [Erase]     │  │  or project                  │   │
│  │             │  │                              │   │
│  │ Zone Types: │  │  Grid overlay visible with   │   │
│  │  🖥 Desk    │  │  color-coded zones           │   │
│  │  📋 Board   │  │                              │   │
│  │  🏠 Meeting │  └────────────────────────────┘   │
│  │  🧪 Testing │                                    │
│  │  ☕ Break   │  ┌────────────────────────────┐   │
│  │             │  │    Property Panel            │   │
│  │ Objects:    │  │                              │   │
│  │  [Desk]     │  │  Zone: Agent Desk            │   │
│  │  [Chair]    │  │  Assigned: Pomni 🎪          │   │
│  │  [Plant]    │  │  Label: "Pomni's Workspace"  │   │
│  │  [Screen]   │  │  Color: #444CE7              │   │
│  │  [Bookshelf]│  │                              │   │
│  └─────────────┘  └────────────────────────────┘   │
│                                                      │
│  [Save Draft] [Publish] [Reset] [Import Tiled JSON] │
└─────────────────────────────────────────────────────┘
```

**Implementation approach:**
- Map Maker is a **separate Phaser scene** (`MapMakerScene`) that renders the same tilemap with a grid overlay
- Zone painting writes to `office_zones` table in Supabase
- Object placement writes to `office_objects` table
- "Publish" updates `office_maps.is_active` and broadcasts via Realtime
- All connected clients receive the update and reload the scene

### 8.4 Multiplayer Presence System

```typescript
// Supabase Presence integration
const channel = supabase.channel(`office:${spaceId}`)

// Track this user's position
channel.on('presence', { event: 'sync' }, () => {
  const state = channel.presenceState<UserPresence>()
  // Update all remote player positions in Phaser
})

channel.on('presence', { event: 'join' }, ({ newPresences }) => {
  // Spawn new player sprite in Phaser
})

channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
  // Remove player sprite from Phaser
})

channel.subscribe(async (status) => {
  if (status === 'SUBSCRIBED') {
    await channel.track({
      user_id: currentUser.id,
      display_name: currentUser.name,
      grid_x: spawnX,
      grid_y: spawnY,
      facing: 'down',
      animation_state: 'idle',
    })
  }
})

// On local player movement (throttled to 100ms)
const updatePosition = throttle((x, y, facing) => {
  channel.track({ ...currentPresence, grid_x: x, grid_y: y, facing })
}, 100)
```

---

## 9. Phase Roadmap

### Phase 1 — Game Foundation (P0)
> **Goal**: Phaser renders the office, agents appear at desks, state syncs in real-time

- Initialize Phaser 3 in Next.js (dynamic import, ssr: false)
- Create BootScene (preload all assets) + OfficeScene
- Render office2.json tilemap with all 6 layers
- Implement GameEventBus (typed Phaser ↔ React bridge)
- Create AgentSprite entity (idle/walk animations, emotes, name tag, status dot)
- Build AgentManager system (sync agents from Supabase → spawn sprites)
- Implement `agent_positions` table + Realtime subscription
- Camera follow + zoom + pan controls
- React HUD overlay (agent click → opens detail panel)
- Collision system from Tiled object layer

**Deliverable**: Walk around the office, see agents at desks, click to interact

### Phase 2 — Agent Intelligence
> **Goal**: Agents move between zones based on their work state

- Implement A* Pathfinder (48px grid, 8-directional)
- Build NavGrid from collision layer + furniture
- Agent walks to project board zone when assigned a task
- Agent returns to desk when task completes
- Idle behavior: wander to POIs with staggered timing
- Emote system (thinking, working, sleep, star, error)
- Chat bubbles above agents (show current task description)
- Agent state machine (idle → walking → working → idle)

**Deliverable**: Agents visibly move around the office based on their work

### Phase 3 — Map Maker
> **Goal**: Built-in editor to design office layout and assign zones

- Create `office_maps`, `office_zones`, `office_objects` tables
- MapMakerScene in Phaser (grid overlay, zone painting)
- React tool palette (zone types, object library)
- Zone painting: click/drag cells to assign zone types
- Object placement: drag objects from palette to grid
- Zone assignment: link zone to agent, project, or board
- Property panel for selected zone/object
- Save/publish workflow via Supabase
- Realtime broadcast on publish → all clients reload

**Deliverable**: Design office layouts without external tools

### Phase 4 — Character Maker (v2)
> **Goal**: Customize agent and user avatars with layered sprite system

- Design layer system: base, skin, hair, eyes, top, bottom, accessory, hat
- Create sprite layer assets (or adapt existing LimeZu Character Generator)
- Canvas-based compositor: combine layers into a single spritesheet
- AvatarEditor React component with live preview
- `avatar_configs` table in Supabase
- Cache composed spritesheets in Supabase Storage
- Invalidate cache on config change (config_hash)
- Apply custom avatars in Phaser scene

**Deliverable**: Unique visual identity for each agent and user

### Phase 5 — Multiplayer Presence
> **Goal**: Multiple users in the same office, seeing each other

- Create `spaces`, `space_members` tables
- Implement Supabase Presence channel for user positions
- PlayerSprite entity (keyboard-controlled local player)
- RemotePlayerSprite entity (interpolated movement from Presence data)
- Spawn/despawn remote players on join/leave
- Name tags and status for remote users
- Throttled position broadcasting (100ms)
- Graceful disconnect handling (Presence auto-cleanup)

**Deliverable**: Multiple humans co-exist in the office

### Phase 6+ — Future Phases
- **Proximity audio/video**: WebRTC SFU (LiveKit) for voice when users are near each other
- **Meeting room screens**: Embedded iframes in zone objects (shared docs, whiteboards)
- **Agent-to-agent interactions**: Visible collaboration animations
- **Multi-floor/multi-room**: Portal zones linking to different maps
- **Mobile support**: Touch controls for Phaser
- **Custom tilesets**: Upload your own tiles in Map Maker
- **Office templates**: Pre-built office layouts to start from

---

## 10. Architecture Decision Records

### ADR-001: Phaser 3 over Pixi.js / Custom Canvas

**Decision**: Use Phaser 3 as the game engine.

**Context**: We need 2D tile-based rendering with sprite animations, physics, camera controls, and tilemap support.

**Options considered**:
1. **Phaser 3** — Full game engine, tilemap support built-in, Arcade physics, huge ecosystem
2. **Pixi.js** — Rendering only, no physics/camera/tilemap — we'd rebuild everything
3. **Custom Canvas** — Maximum control, zero dependencies, but massive effort
4. **Kaboom.js** — Simpler API but less mature, smaller community

**Rationale**: Phaser 3 is already installed, has native Tiled JSON support, and is used by both Agent Town and Gather.town. The tilemap loader, Arcade physics, camera system, and animation manager are all built-in. The only concern is bundle size (~1MB), but this is acceptable for our use case.

### ADR-002: Supabase Presence over Custom WebSocket

**Decision**: Use Supabase Presence for multiplayer user tracking.

**Context**: We need to sync user positions in real-time across connected clients.

**Options considered**:
1. **Supabase Presence** — Built into existing client, automatic cleanup, no new infra
2. **Custom WebSocket server** — Full control, lower latency, but new infra to maintain
3. **Socket.io** — Popular but another dependency + server needed
4. **Supabase Broadcast** — Simpler than Presence but no automatic cleanup

**Rationale**: Supabase Presence gives us:
- Track/untrack semantics with automatic cleanup on disconnect
- presenceState() returns all currently online users
- Built-in conflict resolution for same-user multiple tabs
- Zero new infrastructure — uses existing Supabase project
- Latency is ~50-100ms which is acceptable for a tile-based movement system (not a twitch game)

**Trade-off**: If we need < 20ms position updates (for smooth movement), we may eventually add a lightweight WebSocket relay. But for tile-by-tile movement (Gather-style, one tile per keypress), 100ms is fine.

### ADR-003: 48px Grid (Not 32px)

**Decision**: Keep 48x48px tile size.

**Context**: Gather uses 32x32. Should we match?

**Rationale**: All our existing tilesets and character sprites are 48x48. Switching to 32px would require:
- Re-exporting or re-purchasing all LimeZu tilesets
- Re-creating the Tiled map
- Re-formatting character sprites

The 48px grid is actually better for our use case — more detail per tile, and agents need to display status indicators + name tags which benefit from larger sprites.

### ADR-004: Zone Data in Supabase Tables (Not in Tiled Map)

**Decision**: Store zones in `office_zones` table, not in the Tiled JSON.

**Context**: Zones could be stored as Tiled object layers or in the database.

**Rationale**:
- Zones are **dynamic** — users reassign agents and projects frequently
- Tiled JSON is a **static asset** — modifying it requires re-uploading to Storage
- Supabase table allows **Realtime subscriptions** — zone changes broadcast instantly
- Easier to query (e.g., "which zones are assigned to Project X?")
- The Tiled map remains purely visual (tiles, collision, decorations)
- Zones are rendered as **overlays** in Phaser, not as tiles

### ADR-005: GameEventBus Pattern (Not Direct Store Access from Phaser)

**Decision**: Phaser communicates with React exclusively through a typed event bus.

**Context**: Phaser scene code could directly import Zustand stores or Supabase client.

**Rationale**:
- **Separation of concerns**: Phaser handles rendering/physics, React handles UI/data
- **Testability**: Events can be mocked, Phaser scenes can be tested without React
- **Hot module replacement**: React HMR doesn't need to restart Phaser
- **Future flexibility**: If we ever swap Phaser for another engine, only the bridge changes
- Agent Town uses this exact pattern successfully (typed GameEventBus)

---

## 11. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Phaser + Next.js SSR conflicts | Medium | High | Dynamic import with `ssr: false`, separate game module |
| Supabase Presence latency too high for smooth movement | Low | Medium | Tile-by-tile movement (not continuous) means 100ms is fine. Fallback: custom WS relay |
| Character Maker sprite layer combinatorics | Medium | Medium | Start with pre-made sprites (Phase 1-3), layers in Phase 4 |
| Map Maker complexity explosion | High | Medium | Keep v1 minimal: zone painting + object placement only. Advanced editing in Tiled. |
| Asset loading performance (17+ tilesets) | Low | Medium | Texture atlases, lazy loading of off-screen tiles |
| Concurrent map editing conflicts | Low | High | Single publisher model — only one user edits at a time, others see "Editing..." state |
| Bundle size (Phaser + tilesets) | Medium | Low | Code split Phaser module, lazy load assets after initial render |

---

## 12. Open Questions for Advisors

### Architecture Questions

1. **Multi-office (Spaces)**: Should we support multiple offices from the start, or start with a single global office and add spaces later? Multi-office adds complexity but is cleaner architecturally.

2. **Agent position source of truth**: Should agent positions be stored in Supabase (`agent_positions` table) and broadcast via Realtime, or computed client-side based on agent state? Database is authoritative but adds write frequency; client-side is lighter but can desync.

3. **Map Maker scope**: Should the Map Maker be a full tile editor (paint individual tiles, switch tilesets) or just a zone/object overlay editor on top of pre-made Tiled maps? Full editor is much more complex but removes the Tiled dependency.

### Product Questions

4. **Avatar priority**: Is the Character Maker important enough to move to Phase 2 (before Map Maker)? The current pre-made sprites provide enough visual distinction for 7 agents.

5. **Human player avatar**: Do human users need a walking avatar in the office, or can they be a floating cursor/pointer? Walking avatar is the Gather experience but adds significant complexity (keyboard controls, collision, camera follow).

6. **Agent autonomy level**: When an agent receives a task, should they:
   a. Instantly teleport to the project zone?
   b. Walk there with pathfinding (more visual, but takes time)?
   c. Walk there only if the user is watching (performance optimization)?

7. **Office persistence**: Should the office state persist between sessions (agents stay where they were) or reset to default positions on reload? Persistence requires the `agent_positions` table; reset is simpler.

### Technical Questions

8. **Phaser version**: Phaser 4 is in development. Should we start with Phaser 3 (stable, well-documented, huge community) or wait for/adopt Phaser 4? Risk: Phaser 4 may have breaking changes.

9. **Tiled map editor**: Should we ship a basic built-in tile editor (draw floors/walls) or always rely on external Tiled for base map editing? The Map Maker would then only handle zones and objects on top.

10. **Supabase Realtime channel strategy**: One channel per office with all events, or separate channels per entity type (agents, zones, positions)? Single channel is simpler; multiple channels allow selective subscription.

---

## Appendix A: Comparison Matrix

| Feature | CircOS v1 | Agent Town | Claw3D | Gather.town | CircOS v2 (Proposed) |
|---------|-----------|------------|--------|-------------|---------------------|
| Rendering | None | Phaser 3 (2D) | Three.js (3D) | Phaser 3 (2D) | **Phaser 3 (2D)** |
| Tile size | 48px | 48px | N/A (3D) | 32px | **48px** |
| Map format | Tiled JSON | Tiled JSON | Custom JSON | Custom + Tiled | **Tiled JSON + DB** |
| Map editor | None | None (external Tiled) | Phaser builder | Built-in Mapmaker | **Built-in (Phase 3)** |
| Pathfinding | None | A* (MinHeap) | A* (25px cells) | Server-side | **A* (48px cells)** |
| Agent movement | None | Walk + idle wander | Walk + gym + zones | N/A | **Walk + idle + zone** |
| Agent emotes | None | 9 emotes | Expression states | N/A | **9+ emotes** |
| Character maker | None | Seat sprite picker | Procedural 3D | Layered sprites | **Layered sprites (Phase 4)** |
| Multiplayer | None | None | Remote office (beta) | WebSocket + WebRTC | **Supabase Presence (Phase 5)** |
| Database | Supabase (full) | localStorage | File JSON | Firebase | **Supabase (full)** |
| Realtime | Supabase Realtime | None | WebSocket proxy | WebSocket + Protobuf | **Supabase Realtime** |
| Audio/Video | None | None | ElevenLabs voice | WebRTC SFU | **Deferred (Phase 6+)** |
| Zone types | 3 departments | Seats + POIs | 7+ zone types | 5 tile effects | **7 zone types** |
| Task integration | Full (Kanban) | Basic (task queue) | Kanban + standup | None | **Full (Kanban + visual)** |
| UI framework | @circos/ui (UUI PRO) | Custom pixel CSS | Tailwind + CVA | Custom | **@circos/ui (UUI PRO)** |

## Appendix B: Technology Stack Summary

```
┌─────────────────────────────────────────────┐
│              CircOS Office v2                 │
├─────────────────────────────────────────────┤
│ FRONTEND                                     │
│  Next.js 15 + React 19 + TypeScript 5       │
│  Phaser 3 (game engine, pixel art rendering) │
│  @circos/ui (Untitled UI PRO)               │
│  Tailwind CSS v4.1                          │
│  Zustand (client state)                     │
│  @dnd-kit (drag & drop in Map Maker + Kanban)│
├─────────────────────────────────────────────┤
│ GAME ASSETS                                  │
│  LimeZu Modern series (48x48 tilesets)      │
│  Tiled Map Editor (JSON export)              │
│  Character Generator 2.0 (layer sprites)    │
├─────────────────────────────────────────────┤
│ BACKEND                                      │
│  Supabase PostgreSQL (all persistent data)  │
│  Supabase Realtime (table changes)          │
│  Supabase Presence (multiplayer positions)  │
│  Supabase Storage (maps, spritesheets)      │
│  Supabase Edge Functions (auth, triggers)   │
├─────────────────────────────────────────────┤
│ AGENT RUNTIME                                │
│  OpenClaw Gateway (WebSocket)               │
│  SOUL.md identity system                    │
│  Card → Task bridge (PostgreSQL triggers)   │
├─────────────────────────────────────────────┤
│ FUTURE                                       │
│  LiveKit / WebRTC SFU (voice/video)         │
│  WebRTC signaling via Edge Functions        │
└─────────────────────────────────────────────┘
```
