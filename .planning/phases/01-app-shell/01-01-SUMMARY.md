---
phase: 01-app-shell
plan: "01"
subsystem: app-shell
tags: [providers, theme, layout, tokens]
dependency_graph:
  requires: []
  provides: [ThemeProvider, UUIRouterProvider, Providers wrapper]
  affects: [all pages, dashboard layout]
tech_stack:
  added: []
  patterns: [client Providers wrapper, UUI semantic token Tailwind classes]
key_files:
  created:
    - src/app/providers.tsx
  modified:
    - src/app/layout.tsx
    - src/app/(dashboard)/layout.tsx
decisions:
  - ThemeProvider wraps UUIRouterProvider (theme outermost so all UI sees theme context)
  - Root layout stays server component; client providers isolated in providers.tsx
  - Removed className="dark" from html element — ThemeProvider handles data-theme attribute
metrics:
  duration: "45s"
  completed: "2026-03-20"
  tasks_completed: 2
  files_changed: 3
---

# Phase 01 Plan 01: App Shell Providers and Layout Token Migration Summary

**One-liner:** Client Providers wrapper (ThemeProvider + UUIRouterProvider) established; root and dashboard layouts migrated from legacy var(--) tokens to UUI semantic token Tailwind classes.

## What Was Built

Created `src/app/providers.tsx` as a `"use client"` component combining `ThemeProvider` and `UUIRouterProvider` from `@circos/ui`. Migrated the root layout to wrap children in this `<Providers>` component and replaced legacy inline styles with UUI semantic token Tailwind classes. Migrated the dashboard layout to replace the inline `style={{ backgroundColor: 'var(--background)' }}` with `bg-[var(--bg-primary)]`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create Providers wrapper and migrate root layout | 3e55f97 | src/app/providers.tsx (new), src/app/layout.tsx |
| 2 | Migrate dashboard layout to UUI tokens | 3e411f7 | src/app/(dashboard)/layout.tsx |

## Decisions Made

- ThemeProvider wraps UUIRouterProvider so all UI including router-aware components sees the theme context
- Root layout kept as server component; client-side providers isolated in dedicated providers.tsx per Next.js best practice
- Removed `className="dark"` from `<html>` element — ThemeProvider handles dark mode via `data-theme` attribute using next-themes

## Deviations from Plan

None - plan executed exactly as written.

## Success Criteria Verification

- providers.tsx exists with ThemeProvider + UUIRouterProvider wrapping children: PASS
- Root layout imports and uses Providers wrapper without "use client": PASS
- Dashboard layout uses bg-[var(--bg-primary)] instead of inline var(--background): PASS
- Zero legacy var(--) tokens in either layout file: PASS

## Self-Check: PASSED

All created/modified files confirmed present on disk. All task commits confirmed in git log.
