# Roadmap: CircOS Control Panel

## Milestones

- ✅ **v1.6 UUI Migration** - Phases 1-4 (shipped 2026-03-20)
- 🚧 **v1.6.1 Post-Migration Deep Fix** - Phases 46-52 (in progress)

## Phases

<details>
<summary>✅ v1.6 UUI Migration (Phases 1-4) — SHIPPED 2026-03-20</summary>

### Phase 1: Wave B Pages
**Goal**: All four Wave B pages use exclusively UUI tokens and @circos/ui components with no var(--*) inline styles
**Depends on**: Nothing (first phase)
**Requirements**: WAVB-01, WAVB-02, WAVB-03, WAVB-04
**Success Criteria** (what must be TRUE):
  1. The skills and skills/[id] pages render with no inline style={{}} using var(--*) CSS vars
  2. The costs page chart containers use UUI tokens for layout and chrome
  3. The system page renders with no var(--*) inline styles and all interactive controls use @circos/ui components
  4. The analytics page chart wrappers use UUI tokens for layout
**Plans**: 2/2 plans complete

Plans:
- [x] 01-01-PLAN.md — Migrate skills and analytics pages to UUI tokens
- [x] 01-02-PLAN.md — Migrate costs and system pages to UUI tokens

### Phase 2: Wave C Boards
**Goal**: The boards listing page, board detail page, and all four board sub-components use exclusively UUI tokens
**Depends on**: Phase 1
**Requirements**: WAVC-01, WAVC-02
**Success Criteria** (what must be TRUE):
  1. The boards listing page renders with no var(--*) inline styles and all components are from @circos/ui
  2. The boards/[id] page and its inline style block for keyframes are replaced
  3. BoardKanban, BoardFilterBar, CardDetailPanel, and ColumnManager each use only UUI tokens
  4. Boards kanban drag-and-drop and card detail panel open/close function correctly after migration
**Plans**: 4/4 plans complete

Plans:
- [x] 02-01-PLAN.md — Migrate boards listing page to UUI tokens
- [x] 02-02-PLAN.md — Migrate BoardKanban and BoardFilterBar to UUI tokens
- [x] 02-03-PLAN.md — Migrate CardDetailPanel and ColumnManager to UUI tokens
- [x] 02-04-PLAN.md — Migrate board detail page, replace keyframes, fix imports

### Phase 3: Wave C Agents + Office
**Goal**: All agents pages, board-groups pages, and office React chrome use exclusively UUI tokens and @circos/ui components
**Depends on**: Phase 2
**Requirements**: WAVC-03, WAVC-04, WAVC-05, WAVC-06
**Success Criteria** (what must be TRUE):
  1. The agents listing page and AgentOrganigrama render with no var(--*) inline styles
  2. The agents/[id] page and AgentFormPanel use only UUI tokens — agent CRUD works correctly
  3. All four board-groups pages use only UUI tokens and @circos/ui components
  4. The office page React chrome uses only UUI tokens — Phaser canvas internals remain allowlisted
  5. AgentSidePanel and AgentFormPanel imports for ConfirmActionDialog come from @circos/ui
**Plans**: 4/4 plans complete

Plans:
- [x] 03-01-PLAN.md — Migrate agents listing page and AgentOrganigrama to UUI tokens
- [x] 03-02-PLAN.md — Migrate agent detail page, AgentFormPanel, and AgentSidePanel to UUI tokens
- [x] 03-03-PLAN.md — Migrate all four board-groups pages to UUI tokens
- [x] 03-04-PLAN.md — Migrate office page React chrome to UUI tokens

### Phase 4: Animation Migration + Final Verification
**Goal**: SmartAddModal uses tailwindcss-animate with zero motion imports, and a full grep sweep confirms zero legacy tokens across all Wave B+C files with a clean build
**Depends on**: Phase 3
**Requirements**: ANIM-01, VERF-01, VERF-02, VERF-03, VERF-04
**Success Criteria** (what must be TRUE):
  1. SmartAddModal contains no motion.div, motion.span, or AnimatePresence
  2. grep -r "var(--" across all Wave B+C files returns zero matches (excluding allowlisted internals)
  3. next build completes with zero TypeScript errors and zero build errors
  4. Boards kanban drag-and-drop and card detail panel function correctly end-to-end
  5. Agent create, edit, and delete operations complete successfully without console errors
**Plans**: 3/3 plans complete

Plans:
- [x] 04-01-PLAN.md — SmartAddModal animation migration + var(--*) token replacement
- [x] 04-02-PLAN.md — SkillPreviewCard + DiscoveryPanel token migration
- [x] 04-03-PLAN.md — Final verification sweep (grep, build, functional check)

</details>

---

### 🚧 v1.6.1 Post-Migration Deep Fix (In Progress)

**Milestone Goal:** Align the entire codebase with UUI's official 3-layer architecture (primitives → semantic utilities → components). Brand swap to UUI indigo, register primitives in @theme, define semantic utility classes, harden wrappers, sweep all surfaces, fully migrate Kanban to real UUI components, and clean up metadata and lint.

## Phase Details

### Phase 46: Hotfix — Normalize theme.css
**Goal**: The theme.css file exists at its correct canonical path and the design system loads without errors
**Depends on**: Phase 4
**Requirements**: HOTX-01
**Success Criteria** (what must be TRUE):
  1. The file packages/ui/src/styles/theme.css exists (no space prefix in filename)
  2. The accidental " .css" file is removed
  3. next build succeeds after restore — no CSS import errors
**Plans**: TBD

Plans:
- [ ] 46-01: Remove " .css" artifact, restore theme.css, verify build

### Phase 47: Theming & Tokens — Brand Indigo + Primitives + Semantic Utilities
**Goal**: Brand is UUI indigo (#444CE7), primitives registered in @theme, semantic utility classes defined in @layer utilities — the full 3-layer UUI architecture is in place
**Depends on**: Phase 46
**Requirements**: BRND-01, BRND-02, BRND-03, BRND-04, BRND-05, BRND-06, THEM-01, THEM-02, THEM-03, THEM-04, THEM-05, THEM-06
**Success Criteria** (what must be TRUE):
  1. Brand scale in theme.css and tokens.json uses UUI indigo (#444CE7 = brand-600) — no red brand
  2. Error scale remains red and independent from brand
  3. @theme block registers all primitive scales (gray, brand, success, warning, error, blue) — text-brand-600, bg-gray-950 etc. work as Tailwind classes
  4. @layer utilities block defines UUI semantic classes — bg-primary, text-primary, border-secondary resolve to correct dark/light values
  5. CLAUDE.md files show #444CE7 as brand color
  6. button.tsx focus ring uses brand indigo
**Plans**: TBD

Plans:
- [ ] 47-01: Swap brand red→indigo in theme.css + tokens.json, separate error, add --accent alias
- [ ] 47-02: Add @theme primitives + @layer utilities semantic classes, update CLAUDE.md + button.tsx, gate check

### Phase 48: Wrapper Hardening
**Goal**: All @circos/ui wrapper files use semantic utility classes exclusively — zero hardcoded dark-theme colors, zero raw scale references
**Depends on**: Phase 47
**Requirements**: WRAP-01, WRAP-02, WRAP-03, WRAP-04, WRAP-05, WRAP-06, WRAP-07
**Success Criteria** (what must be TRUE):
  1. button.tsx contains no text-white, bg-white/10, or raw color scale values — all states use semantic utilities
  2. input.tsx contains no text-neutral-300 or equivalent raw scale references
  3. modal.tsx and slideout-menu.tsx contain no hex colors (bg-[#1C1C1E], text-white) — all use semantic utilities
  4. StatusBadge uses bg-blue-500 (valid @theme primitive) and MetricCard uses text-success-500/text-error-500
  5. All modified wrapper files have no unused imports (DialogProps, cx, etc.)
**Plans**: TBD

Plans:
- [ ] 48-01: Harden button.tsx, input.tsx, and slideout-menu.tsx with semantic utilities
- [ ] 48-02: Harden modal.tsx, StatusBadge.tsx, MetricCard.tsx; remove unused imports

### Phase 49: Surface Sweep — CSS Var References + Non-Standard Classes
**Goal**: All app surface files use Tailwind semantic utilities (bg-primary, text-primary) — zero var(--bg-*) inline styles, zero bg-[var(--*)] brackets, zero non-standard aliases
**Depends on**: Phase 48
**Requirements**: SURF-01, SURF-02, SURF-03, SURF-04, SURF-05
**Success Criteria** (what must be TRUE):
  1. grep -r "var(--surface" src/ returns zero matches
  2. grep -r "var(--foreground" src/ returns zero matches
  3. grep -r "bg-\[var(--" src/ returns zero matches — no bracket CSS var patterns
  4. grep -r "bg-surface\b" src/ returns zero — non-standard aliases eliminated
  5. grep -r "border-border" src/ returns zero — replaced with border-secondary
  6. grep -r "text-muted\b" src/ returns zero — replaced with text-quaternary
  7. grep -r "font-heading\b" src/ returns zero — replaced with font-display
  8. next build succeeds with all surfaces rendering correctly
**Plans**: TBD

Plans:
- [ ] 49-01: Replace var(--bg-*), var(--text-*), var(--border-*) inline/bracket patterns with Tailwind classes
- [ ] 49-02: Replace non-standard aliases (bg-surface, border-border, text-muted, font-heading, bg-accent, text-accent) with UUI official names

### Phase 50: Kanban Modernization — Real UUI Components
**Goal**: All Kanban files use real UUI components (Button, Input, Select, Checkbox, Badge, Avatar, Modal, Popover) — zero raw form elements, zero cosmetic inline styles
**Depends on**: Phase 49
**Requirements**: KANB-01, KANB-02, KANB-03, KANB-04, KANB-05, KANB-06, KANB-07, KANB-08
**Success Criteria** (what must be TRUE):
  1. Zero raw `<button>` in all Kanban files — all use UUI Button
  2. Zero raw `<input>` in all Kanban files — text inputs use UUI Input, checkboxes use UUI Checkbox
  3. Zero raw `<select>` in all Kanban files — all use UUI Select
  4. Zero inline SVG icons — all use @untitledui/icons
  5. Zero non-standard classes or legacy CSS var references
  6. Badge component used for labels, counts, status pills; Avatar for assignees
  7. Modal/ConfirmActionDialog for column management; Popover for overflow menus
  8. contentEditable title editing preserved (no UUI equivalent)
  9. Drag/drop positioning inline styles and dynamic DB color styles preserved
  10. Board loads, cards drag, detail panel opens, inline create works, filters work end-to-end
**Plans**: TBD

Plans:
- [ ] 50-01: Migrate BoardKanban.tsx, KanbanColumn.tsx, KanbanCard.tsx to UUI components + Tailwind
- [ ] 50-02: Migrate InlineCardCreate.tsx, BoardFilterBar.tsx to UUI Input/Checkbox/Button
- [ ] 50-03: Migrate ColumnManager.tsx (Modal, Select), CardDetailPanel.tsx (Select, Popover, Badge), boards/[id]/page.tsx; end-to-end verification

### Phase 51: Metadata + Layout Cleanup
**Goal**: App metadata shows "OpenClaw" branding, globals.css has no orphaned classes, and next build is clean
**Depends on**: Phase 50
**Requirements**: META-01, META-02, META-03
**Success Criteria** (what must be TRUE):
  1. Browser tab and page title show "OpenClaw" — no "Digital Circus" anywhere in metadata
  2. globals.css contains no class definitions referencing killed aliases
  3. next build completes with 0 errors
**Plans**: TBD

Plans:
- [ ] 51-01: Update layout.tsx metadata; audit globals.css for orphaned classes; verify build

### Phase 52: Lint Debt
**Goal**: All files touched during this milestone have zero lint errors and zero unused imports
**Depends on**: Phase 51
**Requirements**: LINT-01, LINT-02
**Success Criteria** (what must be TRUE):
  1. eslint --max-warnings 0 passes on all files modified in phases 46-51
  2. No unused import warnings in any modified file
**Plans**: TBD

Plans:
- [ ] 52-01: Run lint on all touched files; fix errors and unused imports; final build confirmation

## Progress

**Execution Order:**
Phases execute in numeric order: 46 → 47 → 48 → 49 → 50 → 51 → 52

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Wave B Pages | v1.6 | 2/2 | Complete | 2026-03-20 |
| 2. Wave C Boards | v1.6 | 4/4 | Complete | 2026-03-20 |
| 3. Wave C Agents + Office | v1.6 | 4/4 | Complete | 2026-03-20 |
| 4. Animation Migration + Final Verification | v1.6 | 3/3 | Complete | 2026-03-20 |
| 46. Hotfix — Normalize theme.css | v1.6.1 | 0/1 | Not started | - |
| 47. Theming & Tokens | v1.6.1 | 0/2 | Not started | - |
| 48. Wrapper Hardening | v1.6.1 | 0/2 | Not started | - |
| 49. Surface Sweep | v1.6.1 | 0/2 | Not started | - |
| 50. Kanban Modernization | v1.6.1 | 0/3 | Not started | - |
| 51. Metadata + Layout Cleanup | v1.6.1 | 0/1 | Not started | - |
| 52. Lint Debt | v1.6.1 | 0/1 | Not started | - |
