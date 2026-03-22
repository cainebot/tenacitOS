# Requirements: CircOS Control Panel — Post-Migration Deep Fix

**Defined:** 2026-03-20
**Core Value:** Every surface renders correctly with UUI semantic tokens, brand indigo, zero broken classes

## v1.6.1 Requirements

Requirements for post-migration fix release. Each maps to roadmap phases.

### Hotfix

- [ ] **HOTX-01**: theme.css file restored from accidental rename (" .css" → theme.css)

### Brand

- [ ] **BRND-01**: Brand color scale uses UUI official indigo (#444CE7 = brand-600) in both dark and light modes
- [ ] **BRND-02**: Error scale is independent from brand (red stays for error, indigo for brand)
- [ ] **BRND-03**: tokens.json brand values match theme.css brand values exactly (single source of truth)
- [ ] **BRND-04**: --accent alias defined as var(--brand-600) in theme.css
- [ ] **BRND-05**: CLAUDE.md files updated with correct brand color (#444CE7)
- [ ] **BRND-06**: button.tsx focus ring uses brand indigo instead of red

### Theme Aliases

- [ ] **THEM-01**: @theme block in theme.css maps bare background classes (bg-background, bg-card, bg-surface, bg-surface-elevated, bg-surface-alt)
- [ ] **THEM-02**: @theme block maps bare text classes (text-primary, text-secondary, text-tertiary, text-muted)
- [ ] **THEM-03**: @theme block maps accent classes (bg-accent, text-accent, border-accent, bg-accent-soft)
- [ ] **THEM-04**: @theme block maps status classes with opacity support (bg-success/10, bg-error/25, etc.)
- [ ] **THEM-05**: @theme block maps border-border class
- [ ] **THEM-06**: @theme block maps font-heading and font-body classes
- [ ] **THEM-07**: Typography aliases (.font-heading, .font-body) added to typography.css

### Wrapper Hardening

- [ ] **WRAP-01**: button.tsx uses semantic tokens instead of hardcoded dark-theme values (text-white, bg-white/10)
- [ ] **WRAP-02**: input.tsx uses semantic tokens instead of raw color scales (text-neutral-300)
- [ ] **WRAP-03**: modal.tsx uses semantic tokens instead of hex colors (bg-[#1C1C1E], text-white)
- [ ] **WRAP-04**: slideout-menu.tsx uses semantic tokens instead of hex colors
- [ ] **WRAP-05**: StatusBadge.tsx uses valid token (bg-info instead of bg-info-500)
- [ ] **WRAP-06**: MetricCard.tsx uses semantic status tokens (text-success, text-error)
- [ ] **WRAP-07**: Unused imports removed from wrapper files (DialogProps, cx)

### Surface Sweep

- [ ] **SURF-01**: Zero var(--surface-*) references in src/ (replaced by semantic classes or UUI tokens)
- [ ] **SURF-02**: Zero var(--foreground) references in src/
- [ ] **SURF-03**: Zero var(--accent, #6366f1) fallbacks in src/ (replaced by var(--accent))
- [ ] **SURF-04**: Zero var(--font-body) / var(--font-heading) in src/ (replaced by classes)
- [ ] **SURF-05**: All ~60 affected app surface files use resolved @theme classes

### Kanban Migration

- [ ] **KANB-01**: BoardKanban.tsx uses UUI Button instead of raw `<button>`
- [ ] **KANB-02**: KanbanColumn.tsx uses Tailwind classes instead of inline styles, UUI Button
- [ ] **KANB-03**: KanbanCard.tsx uses Tailwind classes and UUI tokens instead of inline styles
- [ ] **KANB-04**: InlineCardCreate.tsx uses UUI Input instead of raw `<input>`
- [ ] **KANB-05**: BoardFilterBar.tsx uses UUI Checkbox, Input, Button instead of raw form elements
- [ ] **KANB-06**: ColumnManager.tsx uses UUI Input, Checkbox, Button instead of raw elements
- [ ] **KANB-07**: CardDetailPanel.tsx uses UUI TextArea/Select/Button instead of contentEditable/raw elements
- [ ] **KANB-08**: Drag/drop positioning inline styles (sortable) are allowed exception

### Metadata

- [ ] **META-01**: layout.tsx title updated from "Digital Circus" to "OpenClaw"
- [ ] **META-02**: globals.css has no orphaned classes
- [ ] **META-03**: next build succeeds with 0 errors

### Lint

- [ ] **LINT-01**: Zero lint errors in files touched during this milestone
- [ ] **LINT-02**: No unused imports in modified files

## Future Requirements

### Raw Element Completeness (Optional Phase 7)

- **RAWL-01**: Zero raw `<button>`, `<input>`, `<textarea>`, `<select>` outside Kanban
- **RAWL-02**: All dashboard pages use @circos/ui components exclusively
- **RAWL-03**: All organisms/ components use @circos/ui components

## Out of Scope

| Feature | Reason |
|---------|--------|
| New features | This milestone is purely fix/cleanup |
| Light theme visual QA | Dark theme is default, light deferred |
| Office2D canvas internals | Allowlisted exception (non-React) |
| Recharts internals | Allowlisted exception (chart rendering) |
| Monaco Editor internals | Allowlisted exception (editor engine) |
| Pre-existing lint debt | Only fix lint in files touched by this milestone |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| HOTX-01 | Phase 46 | Pending |
| BRND-01 | Phase 47 | Pending |
| BRND-02 | Phase 47 | Pending |
| BRND-03 | Phase 47 | Pending |
| BRND-04 | Phase 47 | Pending |
| BRND-05 | Phase 47 | Pending |
| BRND-06 | Phase 47 | Pending |
| THEM-01 | Phase 47 | Pending |
| THEM-02 | Phase 47 | Pending |
| THEM-03 | Phase 47 | Pending |
| THEM-04 | Phase 47 | Pending |
| THEM-05 | Phase 47 | Pending |
| THEM-06 | Phase 47 | Pending |
| THEM-07 | Phase 47 | Pending |
| WRAP-01 | Phase 48 | Pending |
| WRAP-02 | Phase 48 | Pending |
| WRAP-03 | Phase 48 | Pending |
| WRAP-04 | Phase 48 | Pending |
| WRAP-05 | Phase 48 | Pending |
| WRAP-06 | Phase 48 | Pending |
| WRAP-07 | Phase 48 | Pending |
| SURF-01 | Phase 49 | Pending |
| SURF-02 | Phase 49 | Pending |
| SURF-03 | Phase 49 | Pending |
| SURF-04 | Phase 49 | Pending |
| SURF-05 | Phase 49 | Pending |
| KANB-01 | Phase 50 | Pending |
| KANB-02 | Phase 50 | Pending |
| KANB-03 | Phase 50 | Pending |
| KANB-04 | Phase 50 | Pending |
| KANB-05 | Phase 50 | Pending |
| KANB-06 | Phase 50 | Pending |
| KANB-07 | Phase 50 | Pending |
| KANB-08 | Phase 50 | Pending |
| META-01 | Phase 51 | Pending |
| META-02 | Phase 51 | Pending |
| META-03 | Phase 51 | Pending |
| LINT-01 | Phase 52 | Pending |
| LINT-02 | Phase 52 | Pending |

**Coverage:**
- v1.6.1 requirements: 37 total (THEM-07 merged into Phase 47)
- Mapped to phases: 37
- Unmapped: 0

---
*Requirements defined: 2026-03-20*
*Last updated: 2026-03-20 — Traceability renumbered to phases 46-52 (continuing from v1.5 phase 45.1)*
