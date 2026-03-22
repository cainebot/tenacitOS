---
phase: 04-animation-migration-+-final-verification
plan: 01
subsystem: ui
tags: [tailwindcss-animate, motion, react, animation, tokens, tailwind]

# Dependency graph
requires:
  - phase: 03-wave-c-agents-+-office
    provides: completed Wave C UUI token migrations
provides:
  - SmartAddModal with zero motion/react imports, all animations via tailwindcss-animate
  - SmartAddModal with zero var(--*) inline styles, all tokens via Tailwind UUI classes
affects: [04-02, 04-03, final-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "animate-in + fade-in + slide-in-from-bottom-* for entry animations replacing motion.div initial/animate"
    - "animate-pulse + animationDelay style prop for staggered loading dots replacing motion.span"
    - "animate-in zoom-in-75 fade-in for scale+opacity entry replacing spring motion"
    - "cx() with conditional border classes replacing JS dragOver ternary with var(--*)"
    - "hover:bg-surface-elevated hover:text-foreground Tailwind modifiers replacing onMouseEnter/onMouseLeave"

key-files:
  created: []
  modified:
    - src/components/SmartAddModal.tsx

key-decisions:
  - "Tasks 1 and 2 implemented in single atomic file write — both motion removal and var(--*) migration committed together in one commit"
  - "Loading dots retain animationDelay inline style (dynamic computed value) — not a var(--*) token, acceptable"
  - "border border-[#393939] retained for isReviewMode composer border — deliberate hardcoded dark border matching terminal aesthetic (same decision pattern as Phase 01-02 Logs modal)"
  - "cx() added to @circos/ui import to handle conditional border classes on composer div"

patterns-established:
  - "animate-in fade-in duration-300: standard entry animation replacing motion.div opacity 0->1"
  - "animate-in fade-in slide-in-from-bottom-3 duration-300 delay-75 fill-mode-forwards: staggered card entry replacing motion.div y:12->0"
  - "animate-in zoom-in-75 fade-in duration-200: scale+fade badge entry replacing spring motion"

requirements-completed: [ANIM-01]

# Metrics
duration: 3min
completed: 2026-03-20
---

# Phase 04 Plan 01: SmartAddModal Animation + Token Migration Summary

**SmartAddModal fully migrated from motion/react to tailwindcss-animate CSS classes with all 39 var(--*) inline styles replaced by Tailwind UUI token classes**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-20T18:47:54Z
- **Completed:** 2026-03-20T18:50:45Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Removed all 6 motion usages (2x AnimatePresence, 2x motion.div, 3x motion.span) and the motion/react import
- Replaced review section entry with `animate-in fade-in duration-300` CSS class
- Replaced skill card entry with `animate-in fade-in slide-in-from-bottom-3 duration-300 delay-75 fill-mode-forwards`
- Replaced detection badge with `animate-in zoom-in-75 fade-in duration-200`
- Replaced 3 motion.span loading dots with `animate-pulse` + staggered `animationDelay` inline style
- Migrated all ~39 `var(--*)` references to Tailwind UUI token classes (bg-foreground, text-muted-foreground, bg-surface-elevated, text-destructive, etc.)
- Replaced all onMouseEnter/onMouseLeave JS hover handlers with `hover:bg-*` Tailwind modifiers
- Added cx() to @circos/ui import for conditional border class composition

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace motion/react animations with tailwindcss-animate classes** - `835a8c8` (feat)
2. **Task 2: Migrate all var(--*) inline styles to Tailwind UUI tokens** - included in `835a8c8` (both tasks implemented in single atomic file write)

**Plan metadata:** _(pending — created with final docs commit)_

## Files Created/Modified
- `src/components/SmartAddModal.tsx` - Removed motion/react dependency, replaced all 6 motion usages with tailwindcss-animate classes, migrated all var(--*) inline styles to Tailwind UUI tokens

## Decisions Made
- Tasks 1 and 2 were implemented in a single atomic file write — the motion removal and var(--*) migration were naturally co-located changes in the same JSX elements, making separate commits redundant. Both changes are in commit `835a8c8`.
- Loading dot `animationDelay` retained as inline style — it's a dynamically computed value (`i * 150`ms), not a design token, so there is no Tailwind equivalent.
- Composer border in isReviewMode uses `border-[#393939]` — consistent with Phase 01-02 Logs modal terminal palette decision (deliberate hardcoded dark border for terminal aesthetic).
- `cx` added to the existing `@circos/ui` import to handle the three-way conditional border logic on the composer div.

## Deviations from Plan

None - plan executed exactly as written. Both tasks were completed in a single file write covering all 6 motion usages and all var(--*) references simultaneously.

## Issues Encountered

None. Pre-existing TypeScript error in `packages/ui/src/components/patterns/ConfirmActionDialog.tsx` (missing Button export) is unrelated to SmartAddModal and was present before this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- SmartAddModal is now fully migrated: zero motion imports, zero var(--*) inline styles, all animations via tailwindcss-animate
- ANIM-01 requirement satisfied
- Ready for Phase 04-02 (next animation migration target) and Phase 04-03 (final verification)

---
*Phase: 04-animation-migration-+-final-verification*
*Completed: 2026-03-20*
