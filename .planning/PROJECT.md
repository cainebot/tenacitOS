# CircOS Control Panel — UUI Migration (Terminal D)

## What This Is

OpenClaw control-panel is a Next.js dashboard application for managing AI agents, boards, workflows, and system operations. Terminal D handles Phase 7 (Waves B+C) of the migration from the legacy "Digital Circus" design system to Untitled UI React PRO (@circos/ui).

## Core Value

Every page in Waves B+C must use exclusively UUI tokens and components — zero legacy CSS vars, zero legacy component imports, while maintaining full functional correctness of boards, agents, and all interactive features.

## Current Milestone: v1.0 M7 — Waves B+C Page Migration

**Goal:** Migrate all medium-complexity (Wave B) and high-complexity (Wave C) pages to UUI design system.

**Target features:**
- Wave B: Migrate skills, skills/[id], costs, system, analytics pages
- Wave C: Migrate boards/[id], agents, agents/[id], board-groups/*, office, SmartAddModal
- Replace all var(--*) inline styles with Tailwind UUI tokens
- Replace all style={} with CSS vars with Tailwind utilities
- Replace all legacy components with @circos/ui + patterns
- Replace motion.div/motion.span in SmartAddModal with tailwindcss-animate

## Requirements

### Validated

- ✓ UUI PRO foundation installed in packages/ui (Phase 1-2, Terminal A)
- ✓ 14 legacy primitives swapped to @circos/ui (Phase 3, Terminal A)
- ✓ Domain hooks decoupled (useBoardKanban, useCardDetail, useAgentForm, etc.)
- ✓ 10 compound patterns created in packages/ui (Phase 4, Terminal B)
- ✓ Atoms/molecules migrated (PriorityBadge, StatusPill, etc.)

### Active

- [ ] Wave B page migrations (skills, costs, system, analytics)
- [ ] Wave C page migrations (boards, agents, board-groups, office)
- [ ] SmartAddModal animation migration (motion → tailwindcss-animate)
- [ ] Zero legacy tokens in all Wave B+C files
- [ ] Build success after all migrations

### Out of Scope

- App shell migration — Terminal C (M6) handles this
- Simple page migrations (Wave A) — Terminal C (M6) handles this
- Legacy purge / enforcement (Phase 8) — Terminal A (M8) handles this
- Cron Jobs pilot — Terminal B (M5) handles this
- Office2D Phaser canvas internals — allowlisted exception
- Recharts chart internals — allowlisted exception (only React chrome migrates)
- Monaco Editor internals — allowlisted exception

## Context

- Branch: uui/phase-6-waves-bc (from develop after SYNC-2)
- Prior phases M1-M4 already merged to develop
- @circos/ui package lives at packages/ui/ with base, application, foundations, and patterns components
- Domain hooks already extracted: useBoardKanban, useCardDetail, useAgentForm, useChatPanel, useSidebarNav
- Tasks T103-T116 from the migration spec define the work
- Tailwind v4 with UUI tokens in packages/ui/src/styles/theme.css
- cx() utility from @circos/ui replaces cn() from legacy

## Constraints

- **Design system**: Must use only @circos/ui components and UUI semantic tokens
- **No legacy**: Zero var(--*) inline styles, zero style={} with CSS vars in migrated files
- **Functional**: Boards kanban, agents CRUD, board-groups must work correctly after migration
- **Build**: next build must succeed with zero errors
- **Allowlist**: Office2D canvas, Recharts internals, Monaco internals are exceptions — only React chrome migrates

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Domain hooks pre-extracted | Phase 2 decoupled business logic from visual components | ✓ Good — simplifies visual-only migration |
| motion → tailwindcss-animate | Reduce bundle size, align with UUI animation approach | — Pending |
| Allowlist for canvas/chart internals | Not feasible to migrate non-React rendering | ✓ Good |

---
*Last updated: 2026-03-20 after milestone M7 initialization*
