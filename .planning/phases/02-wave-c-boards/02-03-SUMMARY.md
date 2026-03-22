---
phase: 02-wave-c-boards
plan: "03"
subsystem: boards/components
tags: [migration, uui-tokens, tailwind, boards]
dependency_graph:
  requires: []
  provides: [CardDetailPanel-migrated, ColumnManager-migrated]
  affects: [src/app/(dashboard)/boards/[id]/page.tsx]
tech_stack:
  added: []
  patterns: [cx-conditional-classes, tailwind-uui-tokens, hover-modifiers]
key_files:
  created: []
  modified:
    - src/components/CardDetailPanel.tsx
    - src/components/ColumnManager.tsx
decisions:
  - ConfirmActionDialog import path fixed from @/components/ui/ to @circos/ui
  - Dynamic API colors (s.color) kept as inline style — not token-based, no Tailwind equivalent
  - onMouseEnter/onMouseLeave JS color mutations replaced with hover: Tailwind modifiers in ColumnManager
  - Title focus border-color handled via focus:border-accent Tailwind class instead of JS onFocus handler
metrics:
  duration: 390s
  completed_date: "2026-03-20T18:08:47Z"
  tasks_completed: 2
  files_modified: 2
---

# Phase 02 Plan 03: CardDetailPanel + ColumnManager Token Migration Summary

**One-liner:** Migrated CardDetailPanel (45 var tokens, 33 style blocks) and ColumnManager (60 var tokens, 40 style blocks) to Tailwind UUI classes with cx() conditional merging and fixed ConfirmActionDialog import path.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Migrate CardDetailPanel.tsx to UUI tokens and fix import | c376115 | src/components/CardDetailPanel.tsx |
| 2 | Migrate ColumnManager.tsx to UUI tokens | 8b3c583 | src/components/ColumnManager.tsx |

## Verification Results

- `grep -c "var(--" src/components/CardDetailPanel.tsx` → 0 ✓
- `grep -c "var(--" src/components/ColumnManager.tsx` → 0 ✓
- CardDetailPanel imports `{ cx, ConfirmActionDialog } from '@circos/ui'` ✓
- ColumnManager imports `{ cx } from '@circos/ui'` ✓
- Old import `@/components/ui/confirm-action-dialog` removed ✓
- cx() used for conditional class merging in both files ✓

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Title contentEditable focus border used inline JS style mutation**
- **Found during:** Task 1
- **Issue:** `onFocus` handler set `style.borderColor = 'var(--accent, #6366f1)'` — a var(--*) token in JS
- **Fix:** Replaced with Tailwind `focus:border-accent` class on the contentEditable div; removed the onFocus handler
- **Files modified:** src/components/CardDetailPanel.tsx
- **Commit:** c376115

### Notes

- `style={{ background: s.color }}` lines (2 in ColumnManager) are runtime API values, not var(--*) tokens — preserved per acceptance criteria ("only non-token dynamic values")
- ColumnManager delete button hover states converted from onMouseEnter/onMouseLeave JS mutations to `hover:opacity-100 hover:text-[#f87171]` Tailwind modifiers
- ColumnManager close button hover converted from inline JS mutation to `hover:bg-surface-alt`

## Self-Check: PASSED
