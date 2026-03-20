# Roadmap: UUI Migration — Waves B+C (Terminal D)

## Overview

Migrate all medium-complexity (Wave B) and high-complexity (Wave C) pages in the OpenClaw control panel from the legacy Digital Circus design system to UUI PRO. Work proceeds from simpler Wave B pages as a warmup, through the most complex board/kanban page cluster, into agents and office, and closes with SmartAddModal animation migration and full-surface verification. The milestone ends when zero legacy tokens remain across all Wave B+C files and next build succeeds cleanly.

## Milestone

**v1.0 M7 — Waves B+C Page Migration**

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Wave B Pages** - Migrate skills, costs, system, and analytics pages to UUI tokens (completed 2026-03-20)
- [x] **Phase 2: Wave C Boards** - Migrate boards listing, board detail, and all board sub-components (completed 2026-03-20)
- [ ] **Phase 3: Wave C Agents + Office** - Migrate agents, board-groups, and office React chrome
- [ ] **Phase 4: Animation Migration + Final Verification** - Replace motion imports in SmartAddModal and verify zero legacy tokens across all files

## Phase Details

### Phase 1: Wave B Pages
**Goal**: All four Wave B pages use exclusively UUI tokens and @openclaw/ui components with no var(--*) inline styles
**Depends on**: Nothing (first phase)
**Requirements**: WAVB-01, WAVB-02, WAVB-03, WAVB-04
**Success Criteria** (what must be TRUE):
  1. The skills and skills/[id] pages render with no inline style={{}} using var(--*) CSS vars — all colors, spacing, and typography come from Tailwind UUI utilities
  2. The costs page chart containers use UUI tokens for layout and chrome — Recharts component internals remain as-is (allowlisted)
  3. The system page renders with no var(--*) inline styles and all interactive controls use @openclaw/ui components
  4. The analytics page chart wrappers use UUI tokens for layout — chart component internals remain as-is (allowlisted)
**Plans:** 2/2 plans complete
Plans:
- [x] 01-01-PLAN.md — Migrate skills and analytics pages to UUI tokens
- [x] 01-02-PLAN.md — Migrate costs and system pages to UUI tokens

### Phase 2: Wave C Boards
**Goal**: The boards listing page, board detail page, and all four board sub-components (BoardKanban, BoardFilterBar, CardDetailPanel, ColumnManager) use exclusively UUI tokens
**Depends on**: Phase 1
**Requirements**: WAVC-01, WAVC-02
**Success Criteria** (what must be TRUE):
  1. The boards listing page renders with no var(--*) inline styles and all components are from @openclaw/ui
  2. The boards/[id] page and its inline `<style>` block for keyframes are replaced — no legacy CSS vars remain in the file
  3. BoardKanban, BoardFilterBar, CardDetailPanel, and ColumnManager each use only UUI tokens — all ConfirmActionDialog imports come from @openclaw/ui, not @/components/ui/
  4. Boards kanban drag-and-drop and card detail panel open/close function correctly after migration
**Plans:** 4/4 plans complete
Plans:
- [ ] 02-01-PLAN.md — Migrate boards listing page to UUI tokens
- [ ] 02-02-PLAN.md — Migrate BoardKanban and BoardFilterBar to UUI tokens
- [ ] 02-03-PLAN.md — Migrate CardDetailPanel and ColumnManager to UUI tokens
- [ ] 02-04-PLAN.md — Migrate board detail page, replace keyframes, fix imports

### Phase 3: Wave C Agents + Office
**Goal**: All agents pages, board-groups pages, and office React chrome use exclusively UUI tokens and @openclaw/ui components
**Depends on**: Phase 2
**Requirements**: WAVC-03, WAVC-04, WAVC-05, WAVC-06
**Success Criteria** (what must be TRUE):
  1. The agents listing page and AgentOrganigrama render with no var(--*) inline styles
  2. The agents/[id] page and AgentFormPanel (backed by useAgentForm hook) use only UUI tokens — agent CRUD (create, edit, delete) works correctly
  3. All four board-groups pages (listing, detail, edit, new) use only UUI tokens and @openclaw/ui components
  4. The office page React chrome (layout, controls, sidebar) uses only UUI tokens — Phaser canvas internals remain allowlisted
  5. AgentSidePanel and AgentFormPanel imports for ConfirmActionDialog come from @openclaw/ui
**Plans:** 3/4 plans executed
Plans:
- [ ] 03-01-PLAN.md — Migrate agents listing page and AgentOrganigrama to UUI tokens
- [ ] 03-02-PLAN.md — Migrate agent detail page, AgentFormPanel, and AgentSidePanel to UUI tokens
- [ ] 03-03-PLAN.md — Migrate all four board-groups pages to UUI tokens
- [ ] 03-04-PLAN.md — Migrate office page React chrome to UUI tokens

### Phase 4: Animation Migration + Final Verification
**Goal**: SmartAddModal uses tailwindcss-animate with zero motion imports, and a full grep sweep confirms zero legacy tokens across all Wave B+C files with a clean build
**Depends on**: Phase 3
**Requirements**: ANIM-01, VERF-01, VERF-02, VERF-03, VERF-04
**Success Criteria** (what must be TRUE):
  1. SmartAddModal contains no `motion.div`, `motion.span`, or `AnimatePresence` — entry/exit animations use tailwindcss-animate classes
  2. `grep -r "var(--"` across all Wave B+C files returns zero matches (excluding allowlisted Recharts, Office2D, and Monaco internals)
  3. `next build` completes with zero TypeScript errors and zero build errors
  4. Boards kanban drag-and-drop and card detail panel function correctly end-to-end
  5. Agent create, edit, and delete operations complete successfully without console errors
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Wave B Pages | 2/2 | Complete    | 2026-03-20 |
| 2. Wave C Boards | 4/4 | Complete    | 2026-03-20 |
| 3. Wave C Agents + Office | 3/4 | In Progress|  |
| 4. Animation Migration + Final Verification | 0/TBD | Not started | - |
