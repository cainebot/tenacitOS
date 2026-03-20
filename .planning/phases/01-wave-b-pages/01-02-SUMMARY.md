---
phase: 01-wave-b-pages
plan: 02
subsystem: pages/costs, pages/system
tags: [migration, tokens, tailwind, recharts, uui]
dependency_graph:
  requires: []
  provides: [costs-page-uui, system-page-uui]
  affects: [src/app/(dashboard)/costs/page.tsx, src/app/(dashboard)/system/page.tsx]
tech_stack:
  added: []
  patterns: [cx-conditional-class-ternaries, recharts-allowlist, zero-var-tokens]
key_files:
  created: []
  modified:
    - src/app/(dashboard)/costs/page.tsx
    - src/app/(dashboard)/system/page.tsx
decisions:
  - Dynamic color ternaries (budgetColor, cpuColor, ramColor, diskColor) converted to Tailwind class ternaries (budgetTextClass/budgetBgClass etc.) rather than keeping var(--) inline styles — achieves zero var(-- tokens outside Recharts allowlist
  - Recharts internals (CartesianGrid stroke, XAxis/YAxis stroke/style, Tooltip contentStyle, Line stroke, Bar/Cell fill) preserved exactly as-is per plan allowlist
  - Logs modal terminal palette (#0d1117, #c9d1d9, #8b949e) kept as non-token hardcoded colors — these are a deliberate terminal aesthetic, not design tokens
metrics:
  duration_seconds: 348
  completed_date: "2026-03-20"
  tasks_completed: 2
  files_modified: 2
---

# Phase 01 Plan 02: Costs & System Page UUI Token Migration Summary

**One-liner:** Migrated costs/page.tsx and system/page.tsx from legacy var(--*) inline styles to Tailwind UUI tokens, with Recharts internals preserved and dynamic color ternaries converted to Tailwind class ternaries.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Migrate costs/page.tsx to UUI tokens | fc54876 | src/app/(dashboard)/costs/page.tsx |
| 1a | Convert budgetColor to Tailwind class ternaries | 176cbc5 | src/app/(dashboard)/costs/page.tsx |
| 2 | Migrate system/page.tsx to UUI tokens | 844bfab | src/app/(dashboard)/system/page.tsx |

## What Was Built

**costs/page.tsx:**
- Replaced all wrapper/container `style={{ color: "var(--*)" }}` occurrences with Tailwind UUI classes (`text-primary`, `text-secondary`, `text-muted`, `text-error`, `text-success`, `text-warning`, `bg-card`, `border-border`, etc.)
- Converted `budgetColor` from a CSS variable ternary to `budgetTextClass`/`budgetBgClass` Tailwind class ternaries
- Added `cx()` from `@openclaw/ui` for conditional class merging
- 4 Recharts chart containers preserved exactly (LineChart, BarChart x2, PieChart) — all `stroke`, `fill`, `contentStyle` props untouched
- `COLORS` array unchanged

**system/page.tsx:**
- Replaced all 101 var(--*) tokens including the hardcoded fallback `var(--info, #3b82f6)` with `text-info`
- Converted `cpuColor`, `ramColor`, `diskColor` from CSS var ternaries to Tailwind class ternaries (`cpuTextClass`, `cpuBgClass`, etc.)
- Toast component migrated to `cx()` with `bg-success/15 border-success text-success` / `bg-error/15 border-error text-error` pattern
- Mini bar viz converted from inline `display: flex; flex: 1` to Tailwind `flex gap-2` / `flex-1`
- Logs modal: `text-accent` for terminal icon, `border-border` for borders — hardcoded terminal palette (#0d1117, #c9d1d9, #8b949e) preserved
- 20 `cx()` calls throughout the file
- Zero `var(--` tokens in the file

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Enhancement] Converted dynamic color variables to Tailwind class ternaries**
- **Found during:** Task 1 (costs) and Task 2 (system)
- **Issue:** The plan said "zero var(--*) inline styles" but `budgetColor`/`cpuColor` etc. were JS ternary variables containing `var(--success/warning/error)`. They appeared in `style={{ color: budgetColor }}` props.
- **Fix:** Changed the variable to compute Tailwind class names (e.g., `"text-success"`, `"text-warning"`, `"text-error"`) and used `cx()` to apply them as className — eliminates var(-- entirely, even from variable definitions.
- **Files modified:** Both pages
- **Commits:** fc54876, 176cbc5, 844bfab

## Acceptance Criteria Verification

**costs/page.tsx:**
- `grep "var(--" costs/page.tsx` → 19 matches, ALL inside Recharts props (CartesianGrid, XAxis, YAxis, Tooltip contentStyle, Line, Bar) — zero on wrapper elements
- `grep "cx(" costs/page.tsx` → 4 matches
- `grep "from.*@openclaw/ui" costs/page.tsx` → import found
- `const COLORS =` → present, unchanged
- Recharts imports present → yes
- TypeScript errors → 0

**system/page.tsx:**
- `grep -c "var(--" system/page.tsx` → 0
- `grep -c "var(--info, #3b82f6)" system/page.tsx` → 0
- `grep "cx(" system/page.tsx` → 20 matches
- `grep "from.*@openclaw/ui" system/page.tsx` → import found
- Remaining `style={{` → only width percentages (dynamic, not Tailwind-mappable) and terminal hardcoded colors
- TypeScript errors → 0

## Self-Check: PASSED

- src/app/(dashboard)/costs/page.tsx: exists, committed at fc54876 + 176cbc5
- src/app/(dashboard)/system/page.tsx: exists, committed at 844bfab
- Zero TypeScript errors confirmed
