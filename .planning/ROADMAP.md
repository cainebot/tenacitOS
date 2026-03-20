# Roadmap: OpenClaw UUI Migration — M6 App Shell + Wave A

## Overview

Three-phase migration of the app shell and 16 simple dashboard pages from the Digital Circus design system to @openclaw/ui. Phase 1 establishes the shell (ThemeProvider, RouterProvider, navigation) that all pages inherit. Phases 2 and 3 process the 16 Wave A pages in two batches, finishing with a full verification sweep to confirm zero legacy tokens and a clean build.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (1.1, 2.1): Urgent insertions if needed

- [ ] **Phase 1: App Shell** - Migrate root layout, dashboard layout, login, sidebar, and headers to UUI
- [ ] **Phase 2: Wave A Batch 1** - Migrate first 8 simple pages (about through memory) to 100% UUI
- [ ] **Phase 3: Wave A Batch 2 + Verify** - Migrate remaining 8 simple pages then verify zero legacy tokens across all migrated files

## Phase Details

### Phase 1: App Shell
**Goal**: The app shell provides ThemeProvider and RouterProvider to every page and contains zero legacy tokens in layouts, login, sidebar, and headers
**Depends on**: Nothing (first phase)
**Requirements**: SHELL-01, SHELL-02, SHELL-03, SHELL-04, SHELL-05
**Success Criteria** (what must be TRUE):
  1. Root layout wraps every page in ThemeProvider + RouterProvider from @openclaw/ui with no legacy wrappers
  2. Dashboard layout renders using only UUI tokens — grep for var(--) in the layout file returns 0 matches
  3. Login page renders entirely with @openclaw/ui components; no legacy component imports remain
  4. DashboardSidebar renders navigation using the UUI AppNavigation pattern with no legacy sidebar code
  5. All header and global nav elements use UUI tokens and components exclusively
**Plans:** 2/3 plans executed
Plans:
- [ ] 01-01-PLAN.md — Providers wrapper + root/dashboard layout migration
- [ ] 01-02-PLAN.md — Login page + BrandMark migration
- [ ] 01-03-PLAN.md — DashboardSidebar + NodeStatusStrip migration

### Phase 2: Wave A Batch 1
**Goal**: Eight simple pages (about, actions, activity, calendar, files, git, logs, memory) each use only @openclaw/ui components and UUI tokens
**Depends on**: Phase 1
**Requirements**: WAVE-01, WAVE-02, WAVE-03, WAVE-04, WAVE-05, WAVE-06, WAVE-07, WAVE-08
**Success Criteria** (what must be TRUE):
  1. Each of the 8 pages renders without legacy component imports from src/components/ui/
  2. grep for var(--) in any of these 8 page files returns 0 matches
  3. Files page renders correctly with Monaco editor internals excluded via the allowlist
  4. next build passes with zero errors after all 8 pages are migrated
**Plans**: TBD

### Phase 3: Wave A Batch 2 + Verify
**Goal**: Remaining 8 simple pages (organization, reports, search, sessions, settings, terminal, workflows, workspaces) are fully migrated and all 24 requirements are verified clean
**Depends on**: Phase 2
**Requirements**: WAVE-09, WAVE-10, WAVE-11, WAVE-12, WAVE-13, WAVE-14, WAVE-15, WAVE-16, VRFY-01, VRFY-02, VRFY-03
**Success Criteria** (what must be TRUE):
  1. Each of the 8 remaining pages renders without legacy component imports from src/components/ui/
  2. grep for var(--) across all migrated files (shell + 16 pages) returns 0 matches
  3. next build succeeds with zero errors on the complete migrated codebase
  4. No imports from src/components/ui/ legacy path exist in any migrated file
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. App Shell | 2/3 | In Progress|  |
| 2. Wave A Batch 1 | 0/TBD | Not started | - |
| 3. Wave A Batch 2 + Verify | 0/TBD | Not started | - |
