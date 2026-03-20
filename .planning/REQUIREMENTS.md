# Requirements: OpenClaw UUI Migration — M6

**Defined:** 2026-03-20
**Core Value:** Every surface uses @openclaw/ui with zero legacy tokens

## v6 Requirements

Requirements for M6: App Shell + Wave A migration.

### App Shell

- [ ] **SHELL-01**: Root layout provides ThemeProvider + RouterProvider from @openclaw/ui
- [ ] **SHELL-02**: Dashboard layout uses UUI tokens exclusively (zero legacy var(--*))
- [ ] **SHELL-03**: Login page uses UUI components and tokens exclusively
- [ ] **SHELL-04**: DashboardSidebar consumes UUI AppNavigation pattern
- [ ] **SHELL-05**: Headers and global navigation use UUI tokens and components

### Wave A Pages

- [ ] **WAVE-01**: about page uses UUI components and tokens exclusively
- [ ] **WAVE-02**: actions page uses UUI components and tokens exclusively
- [ ] **WAVE-03**: activity page uses UUI components and tokens exclusively
- [ ] **WAVE-04**: calendar page uses UUI components and tokens exclusively
- [ ] **WAVE-05**: files page uses UUI components and tokens exclusively (Monaco editor internals allowlisted)
- [ ] **WAVE-06**: git page uses UUI components and tokens exclusively
- [ ] **WAVE-07**: logs page uses UUI components and tokens exclusively
- [ ] **WAVE-08**: memory page uses UUI components and tokens exclusively
- [ ] **WAVE-09**: organization page uses UUI components and tokens exclusively
- [ ] **WAVE-10**: reports page uses UUI components and tokens exclusively
- [ ] **WAVE-11**: search page uses UUI components and tokens exclusively
- [ ] **WAVE-12**: sessions page uses UUI components and tokens exclusively
- [ ] **WAVE-13**: settings page uses UUI components and tokens exclusively
- [ ] **WAVE-14**: terminal page uses UUI components and tokens exclusively
- [ ] **WAVE-15**: workflows page uses UUI components and tokens exclusively
- [ ] **WAVE-16**: workspaces page uses UUI components and tokens exclusively

### Verification

- [ ] **VRFY-01**: grep legacy tokens (var(--) in all migrated files returns 0 matches
- [ ] **VRFY-02**: next build succeeds with zero errors
- [ ] **VRFY-03**: No imports from src/components/ui/ legacy path in migrated files

## Out of Scope

| Feature | Reason |
|---------|--------|
| Complex pages (boards, agents, skills, analytics, costs, system) | M7 Wave B+C — Terminal D |
| Cron vertical | M5 — Terminal B |
| globals.css legacy token cleanup | M8 — final purge |
| Radix/CVA dependency removal | M8 — after all surfaces migrated |
| Monaco Editor internals | Third-party allowlisted exception |
| Phaser canvas internals | Third-party allowlisted exception |
| office page | Complex — M7 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SHELL-01 | Phase 1 | Pending |
| SHELL-02 | Phase 1 | Pending |
| SHELL-03 | Phase 1 | Pending |
| SHELL-04 | Phase 1 | Pending |
| SHELL-05 | Phase 1 | Pending |
| WAVE-01 | Phase 2 | Pending |
| WAVE-02 | Phase 2 | Pending |
| WAVE-03 | Phase 2 | Pending |
| WAVE-04 | Phase 2 | Pending |
| WAVE-05 | Phase 2 | Pending |
| WAVE-06 | Phase 2 | Pending |
| WAVE-07 | Phase 2 | Pending |
| WAVE-08 | Phase 2 | Pending |
| WAVE-09 | Phase 3 | Pending |
| WAVE-10 | Phase 3 | Pending |
| WAVE-11 | Phase 3 | Pending |
| WAVE-12 | Phase 3 | Pending |
| WAVE-13 | Phase 3 | Pending |
| WAVE-14 | Phase 3 | Pending |
| WAVE-15 | Phase 3 | Pending |
| WAVE-16 | Phase 3 | Pending |
| VRFY-01 | Phase 3 | Pending |
| VRFY-02 | Phase 3 | Pending |
| VRFY-03 | Phase 3 | Pending |

**Coverage:**
- v6 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-20*
*Last updated: 2026-03-20 after roadmap creation*
