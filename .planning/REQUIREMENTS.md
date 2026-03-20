# Requirements: UUI Migration — Waves B+C (Terminal D)

**Defined:** 2026-03-20
**Core Value:** Every Wave B+C page uses exclusively UUI tokens and components with zero legacy artifacts

## v1 Requirements

Requirements for M7 milestone. Each maps to roadmap phases.

### Wave B — Medium Pages

- [x] **WAVB-01**: Skills page uses only UUI tokens and @openclaw/ui components — zero var(--*) inline styles
- [x] **WAVB-02**: Costs page uses only UUI tokens — chart containers migrated, Recharts internals allowlisted
- [x] **WAVB-03**: System page uses only UUI tokens and @openclaw/ui components — zero var(--*) inline styles
- [x] **WAVB-04**: Analytics page uses only UUI tokens — chart wrapper containers migrated, chart component internals allowlisted

### Wave C — Complex Pages

- [x] **WAVC-01**: Boards listing page uses only UUI tokens and components — zero var(--*) inline styles
- [x] **WAVC-02**: Board detail page (boards/[id]) and all sub-components (BoardKanban, BoardFilterBar, CardDetailPanel, ColumnManager) use only UUI tokens
- [ ] **WAVC-03**: Agents listing page and AgentOrganigrama use only UUI tokens and components
- [ ] **WAVC-04**: Agent detail page (agents/[id]) and AgentFormPanel use only UUI tokens and components
- [ ] **WAVC-05**: Board-groups pages (listing, detail, edit, new) all use only UUI tokens and components
- [ ] **WAVC-06**: Office page React chrome uses only UUI tokens — Phaser canvas internals allowlisted

### Animation Migration

- [ ] **ANIM-01**: SmartAddModal uses tailwindcss-animate instead of motion.div/motion.span/AnimatePresence — zero motion imports

### Verification

- [ ] **VERF-01**: `grep -r "var(--"` across all Wave B+C files returns zero matches (excluding allowlisted internals)
- [ ] **VERF-02**: `next build` succeeds with zero errors
- [ ] **VERF-03**: Boards kanban drag-and-drop and card detail panel function correctly
- [ ] **VERF-04**: Agent CRUD operations (create, edit, delete) work correctly

## Out of Scope

| Feature | Reason |
|---------|--------|
| App shell / layout migration | Terminal C (M6) handles this |
| Wave A simple pages (16 pages) | Terminal C (M6) handles this |
| Cron Jobs pilot | Terminal B (M5) handles this |
| Legacy purge / enforcement checks | Terminal A (M8) handles this |
| Office2D Phaser canvas internals | Allowlisted — non-React rendering |
| Recharts chart fill/stroke internals | Allowlisted — chart library internals |
| Chart component color constants | Phase 8 handles hex→token in chart internals |
| globals.css cleanup | Phase 8 handles legacy CSS removal |
| Dependency removal (motion, etc.) | Phase 8 handles package.json cleanup |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| WAVB-01 | Phase 1 | Complete |
| WAVB-02 | Phase 1 | Complete |
| WAVB-03 | Phase 1 | Complete |
| WAVB-04 | Phase 1 | Complete |
| WAVC-01 | Phase 2 | Complete |
| WAVC-02 | Phase 2 | Complete |
| WAVC-03 | Phase 3 | Pending |
| WAVC-04 | Phase 3 | Pending |
| WAVC-05 | Phase 3 | Pending |
| WAVC-06 | Phase 3 | Pending |
| ANIM-01 | Phase 4 | Pending |
| VERF-01 | Phase 4 | Pending |
| VERF-02 | Phase 4 | Pending |
| VERF-03 | Phase 4 | Pending |
| VERF-04 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-20*
*Last updated: 2026-03-20 — traceability confirmed after roadmap creation*
