# OpenClaw Control Panel — UUI Migration

## What This Is

OpenClaw control-panel is the frontend dashboard for the CaineBot/TenacitOS platform. It manages agents, boards, workflows, cron jobs, and system monitoring. Currently migrating from "Digital Circus" design system (Tailwind v4 + Radix UI + CVA) to Untitled UI React PRO (@openclaw/ui).

## Core Value

Every surface uses a single, consistent design system (@openclaw/ui) with zero legacy tokens — enabling faster development, design consistency, and Figma-code parity.

## Requirements

### Validated

- ✓ UUI PRO foundation installed with Storybook + Code Connect — M2
- ✓ 14 legacy primitives replaced with @openclaw/ui equivalents — M3
- ✓ Domain logic decoupled from heavy components (hooks extracted) — M3
- ✓ Atoms/molecules migrated to UUI tokens — M3
- ✓ 10 compound patterns created in packages/ui — M4

### Active

- [x] App shell migrated (layouts, login, sidebar, headers) → UUI — Phase 1
- [x] 8 simple pages (batch 1: about→memory) migrated → 100% UUI — Phase 2
- [x] 8 simple pages (batch 2: org→workspaces) migrated → 100% UUI — Phase 3
- [x] Zero legacy tokens in all migrated files — Phase 3 verified

### Out of Scope

- Complex pages (boards, agents, skills, analytics) — deferred to M7 (Wave B+C)
- Cron vertical — handled by Terminal B (M5)
- Legacy purge (globals.css cleanup, dependency removal) — deferred to M8
- Figma workflow documentation — deferred to M8
- Monaco Editor internals — allowlisted exception
- Phaser canvas internals — allowlisted exception

## Context

- 4-terminal parallel migration strategy: T1 (foundation), T2 (patterns + pilot), T3 (shell + Wave A), T4 (Wave B+C)
- This is Terminal 3 (T3), working on M6
- SYNC-2 complete: M3 + M4 merged to develop
- @openclaw/ui provides: ThemeProvider, RouterProvider, AppNavigation, all base + application components, 10 patterns
- Migration process per surface: var(--*) → Tailwind tokens, style={} → Tailwind utilities, legacy components → @openclaw/ui, cleanup dead CSS

## Constraints

- **Zero legacy tokens**: grep -r "var(--" in migrated files must return 0
- **Build must pass**: next build must succeed after every commit
- **No new legacy**: No code with old system patterns
- **Pacto de Sangre**: Branch uui/phase-5-shell-wave-a, merge to develop via push

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| App shell first, then pages | Shell provides ThemeProvider/RouterProvider that pages inherit | — Pending |
| Wave A = 16 simple pages | Lower complexity validates method before complex pages | — Pending |
| Monaco/Phaser allowlisted | Third-party internals can't use UUI tokens | ✓ Good |

## Current Milestone: v6.0 M6 — App Shell + Wave A

**Goal:** Migrate app shell and 16 simple dashboard pages to 100% UUI design system

**Target features:**
- App shell with ThemeProvider + RouterProvider + UUI navigation
- Login page fully migrated
- 16 simple pages (about, actions, activity, calendar, files, git, logs, memory, organization, reports, search, sessions, settings, terminal, workflows, workspaces) at 100% UUI

---
*Last updated: 2026-03-20 after Phase 3 (Wave A Batch 2 + Verify) — M6 COMPLETE*
