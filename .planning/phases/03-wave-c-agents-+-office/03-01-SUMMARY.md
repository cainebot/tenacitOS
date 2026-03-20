---
phase: 03-wave-c-agents-+-office
plan: 01
subsystem: ui
tags: [tailwind, uui-tokens, agents, svg, migration]

# Dependency graph
requires:
  - phase: 02-wave-c-boards
    provides: SVG stroke migration pattern (stroke=currentColor + className)
  - phase: 01-uui-foundation
    provides: UUI token map (text-primary, text-muted, bg-surface, etc.)
provides:
  - Agents listing page with zero var(--*) inline styles
  - AgentOrganigrama SVG component with zero var(--*) inline styles
affects: [03-02, 03-03, 03-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - SVG stroke=currentColor + text-* className for border/accent colors
    - STATUS_COLORS as Tailwind class strings consumed via className instead of style={{ color }}
    - Dynamic API colors (agentColor, department.color) kept as inline style (not var(--*), no Tailwind equivalent)

key-files:
  created: []
  modified:
    - src/app/(dashboard)/agents/page.tsx
    - src/components/AgentOrganigrama.tsx

key-decisions:
  - "STATUS_COLORS map values changed from hex (#4ade80) to Tailwind class strings (text-success) — consumed via className={statusColor} not style={{ color }}"
  - "Badge background hex colors (#f59e0b20, #3b82f620, #22c55e20) preserved as inline style — semantic fixed-palette badge colors (LEAD/SPC/default), not API-driven"
  - "SVG card fill migrated using fill=currentColor + text-card className when not hovered; hovered state uses agent.color dynamic API value inline"
  - "AgentOrganigrama font-family var(--font-heading) replaced with font-heading Tailwind class on svg element"

patterns-established:
  - "SVG text elements: fill=currentColor + className text-* for token-based text colors"
  - "SVG path/circle strokes: stroke=currentColor + className text-* for token-based stroke colors"
  - "SVG rect fill: fill=currentColor + className text-* for token-based background fills"

requirements-completed: [WAVC-03]

# Metrics
duration: 3min
completed: 2026-03-20
---

# Phase 03 Plan 01: Agents Listing + AgentOrganigrama Token Migration Summary

**STATUS_COLORS hex map and all var(--*) inline styles eliminated from agents listing page and SVG org chart, using Tailwind semantic tokens (text-success/warning/error/info/muted) and currentColor SVG pattern**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-20T18:30:05Z
- **Completed:** 2026-03-20T18:33:17Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Replaced STATUS_COLORS hex map with Tailwind class map, consumed via `className={statusColor}` instead of `style={{ color }}`
- Migrated all 28+ var(--*) inline styles in agents/page.tsx to Tailwind className (border-border, bg-card, text-primary, text-muted, text-secondary, font-heading, etc.)
- Migrated all 11 var(--*) inline styles in AgentOrganigrama.tsx SVG using fill=currentColor/stroke=currentColor + token className pattern
- Replaced hardcoded hex status dot colors (#4ade80, #6b7280) in SVG with text-success/text-muted

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate agents/page.tsx to UUI tokens** - `77aef2b` (feat)
2. **Task 2: Migrate AgentOrganigrama.tsx to UUI tokens** - `c1386e8` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/app/(dashboard)/agents/page.tsx` - Agents listing page, fully migrated to UUI tokens
- `src/components/AgentOrganigrama.tsx` - SVG org chart, migrated using currentColor + className pattern

## Decisions Made
- STATUS_COLORS values changed from hex to Tailwind class strings; consumption point changed from `style={{ color: statusColor }}` to `className={statusColor}` — keeps token map in JS while rendering via Tailwind
- Badge background hex colors (#f59e0b20, #3b82f620, #22c55e20) preserved as inline style — these are semantic fixed-palette badge colors (LEAD/SPC/default), equivalent to deliberate terminal aesthetic decision in Phase 1-2
- Dynamic `agentColor` (derived from `department?.color ?? '#6366f1'`) kept as inline style throughout — follows Phase 2 established pattern for API-provided colors
- SVG `font-family: var(--font-heading, sans-serif)` replaced with `className="font-heading"` on the SVG element's `fontFamily` attribute removed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Agents listing surface fully migrated; ready for Phase 03-02 (office or next agents sub-page)
- Pattern reinforced: SVG currentColor + className works for text, stroke, and fill tokens

## Self-Check: PASSED

- src/app/(dashboard)/agents/page.tsx: FOUND
- src/components/AgentOrganigrama.tsx: FOUND
- .planning/phases/03-wave-c-agents-+-office/03-01-SUMMARY.md: FOUND
- Commit 77aef2b: FOUND
- Commit c1386e8: FOUND

---
*Phase: 03-wave-c-agents-+-office*
*Completed: 2026-03-20*
