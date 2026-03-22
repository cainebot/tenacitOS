---
phase: 01-app-shell
plan: "03"
subsystem: app-shell
tags: [tailwind, uui-tokens, inline-style-migration, sidebar, node-status]
dependency_graph:
  requires: [01-01]
  provides: [SHELL-04, SHELL-05]
  affects: [DashboardSidebar, NodeStatusStrip]
tech_stack:
  added: []
  patterns:
    - cx() conditional class composition for collapse/expand state
    - Tailwind hover: prefix replacing JS onMouseEnter/onMouseLeave handlers
    - UUI semantic color tokens (success-600, warning-600, error-600) for status indicators
    - animate-pulse Tailwind utility replacing custom CSS animation keyframes
key_files:
  created: []
  modified:
    - src/components/organisms/DashboardSidebar.tsx
    - src/components/NodeStatusStrip.tsx
decisions:
  - "RAM bar width stays as inline style (dynamic percentage cannot be a Tailwind class)"
  - "statusDotColor and getRamBarColor now return Tailwind class strings, consumed via cx()"
  - "onMouseEnter/onMouseLeave removed from collapse button; hover: prefix used instead"
metrics:
  duration: 120s
  completed: "2026-03-20"
  tasks_completed: 2
  files_modified: 2
---

# Phase 01 Plan 03: Sidebar + NodeStatusStrip Token Migration Summary

**One-liner:** DashboardSidebar and NodeStatusStrip fully migrated from inline styles with legacy var(--*) tokens to Tailwind utility classes with UUI semantic tokens (zero inline styles except RAM bar dynamic width).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Migrate DashboardSidebar to Tailwind + UUI tokens | 341847b | src/components/organisms/DashboardSidebar.tsx |
| 2 | Migrate NodeStatusStrip to Tailwind + UUI tokens | 9eb6d76 | src/components/NodeStatusStrip.tsx |

## What Was Built

### DashboardSidebar.tsx

Replaced all inline `style={{}}` attributes with Tailwind utility classes. Key changes:

- `<aside>` width: `cx(collapsed ? "w-14 min-w-14" : "w-60 min-w-60")` with `transition-[width,min-width] duration-200 ease-in-out`
- Background: `bg-[var(--bg-secondary)]`, border: `border-r border-[var(--border-primary)]`
- Section labels: `font-display text-[var(--text-quaternary-500)]`
- Collapse toggle button: removed `onMouseEnter`/`onMouseLeave` JS handlers; added `hover:bg-[var(--bg-quaternary)] hover:text-[var(--text-primary-900)] transition-colors`
- NodeStatusStrip container: added `border-t border-[var(--border-primary)]` to className (removed inline style)
- Collapse/expand logic fully preserved via conditional `cx()` class sets

### NodeStatusStrip.tsx

Converted all inline styles to Tailwind classes. Key changes:

- Added `import { cx } from '@circos/ui'`
- `getRamBarColor()` now returns Tailwind class strings: `bg-[var(--error-600)]`, `bg-[var(--warning-600)]`, `bg-[var(--success-600)]`
- `statusDotColor()` now returns Tailwind class strings consumed via `cx()`
- `StatusIcon` uses `className` with UUI color tokens
- `NodeCard` outer div: `flex flex-col gap-1 px-2.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md min-w-[120px] shrink-0`
- Status dot: `cx("inline-block w-2 h-2 rounded-full shrink-0", statusDotColor(node.status))`
- RAM bar inner div: uses `getRamBarColor()` class + `style={{ width: \`${ramPercent}%\` }}` (only acceptable inline style)
- `SkeletonCard` skeleton bars: `animate-pulse` replacing custom `animation: 'pulse 1.5s ease-in-out infinite'`
- Notification pills: `cx()` with `bg-[var(--error-600)]/[0.12]` and `bg-[var(--success-600)]/[0.12]`

## Verification Results

- `grep -c "style={{" DashboardSidebar.tsx` = 0
- `grep -c "style={{" NodeStatusStrip.tsx` = 1 (RAM bar width only)
- No legacy `var(--surface)`, `var(--accent)`, `var(--font-heading)`, `var(--card)`, `var(--border,`, `var(--text-primary,` tokens in either file
- Both files contain `import { cx } from "@circos/ui"`

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- src/components/organisms/DashboardSidebar.tsx: EXISTS
- src/components/NodeStatusStrip.tsx: EXISTS
- Commit 341847b: EXISTS (feat(01-03): migrate DashboardSidebar to Tailwind + UUI tokens)
- Commit 9eb6d76: EXISTS (feat(01-03): migrate NodeStatusStrip to Tailwind + UUI tokens)
