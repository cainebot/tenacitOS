---
phase: 03-wave-c-agents-+-office
plan: "02"
subsystem: ui
tags: [tailwind, uui-tokens, migration, agents, react]

requires:
  - phase: 02-wave-c-boards
    provides: token migration patterns and ConfirmActionDialog import precedent

provides:
  - Agent detail page (agents/[id]/page.tsx) with zero var(--*) and UUI semantic tokens
  - AgentFormPanel with corrected ConfirmActionDialog import from @circos/ui
  - AgentSidePanel with zero var(--*) and UUI semantic tokens

affects: [04-wave-c-office, any phase touching agent components]

tech-stack:
  added: []
  patterns:
    - Status/badge hex color maps replaced with Tailwind semantic token class maps
    - CSSProperties style objects replaced with Tailwind className strings
    - onMouseEnter/onMouseLeave hover handlers replaced with Tailwind hover: modifiers
    - Dynamic API colors (deptColor, avatarBgColor) preserved as inline style

key-files:
  created: []
  modified:
    - src/app/(dashboard)/agents/[id]/page.tsx
    - src/components/organisms/AgentFormPanel.tsx
    - src/components/organisms/AgentSidePanel.tsx

key-decisions:
  - "Gradient endpoint changed from var(--card) to transparent — deptColor blends with bg-card Tailwind class, achieves same visual effect without var(--*)"
  - "avatarBgColor kept as inline style — user-set hex value from API/metadata, no Tailwind equivalent"
  - "statusPillColors and badgeColors functions converted from hex returns to Tailwind class string pairs"
  - "Select dropdown arrow SVG kept in style prop (data URI, not a design token)"

patterns-established:
  - "Hex color map record (STATUS_COLORS etc) -> Tailwind token class map record"
  - "CSSProperties objects with var(--*) -> Tailwind className equivalents"
  - "sectionLabelStyle const -> repeated inline Tailwind class string"

requirements-completed: [WAVC-04]

duration: 5min
completed: "2026-03-20"
---

# Phase 03 Plan 02: Agent Surface UUI Token Migration Summary

**Agent detail page, AgentFormPanel, and AgentSidePanel migrated from legacy var(--*) inline styles and hardcoded hex colors to UUI Tailwind tokens, with ConfirmActionDialog import corrected to @circos/ui**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-20T18:30:09Z
- **Completed:** 2026-03-20T18:35:37Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Eliminated all 55 `var(--*)` occurrences in `agents/[id]/page.tsx` including STATUS_COLORS, BADGE_STYLES, and TASK_STATUS_COLORS hex maps
- Fixed ConfirmActionDialog import in `AgentFormPanel.tsx` from `@/components/ui/confirm-action-dialog` to `@circos/ui`
- Eliminated all 72 `var(--*)` occurrences in `AgentFormPanel.tsx`, converting CSSProperties style objects to Tailwind classNames
- Eliminated all 48 `var(--*)` occurrences in `AgentSidePanel.tsx`, converting statusPillColors and badgeColors helper functions from hex returns to semantic token class pairs

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate agents/[id]/page.tsx to UUI tokens** - `1911286` (feat)
2. **Task 2: Migrate AgentFormPanel.tsx and AgentSidePanel.tsx to UUI tokens** - `9d7a729` (feat)

**Plan metadata:** _(pending docs commit)_

## Files Created/Modified

- `src/app/(dashboard)/agents/[id]/page.tsx` — 55 var(--*) eliminated; STATUS_COLORS/BADGE_STYLES/TASK_STATUS_COLORS converted to UUI token class maps
- `src/components/organisms/AgentFormPanel.tsx` — 72 var(--*) eliminated; ConfirmActionDialog import fixed to @circos/ui; CSSProperties objects replaced with Tailwind
- `src/components/organisms/AgentSidePanel.tsx` — 48 var(--*) eliminated; statusPillColors/badgeColors converted to Tailwind token class pairs

## Decisions Made

- Gradient background endpoint changed from `var(--card)` to `transparent` — the underlying `bg-card` Tailwind class provides the base color; the gradient fades the deptColor overlay to transparent, achieving the same visual result without referencing a CSS custom property
- `avatarBgColor` preserved as inline style value — this is a user-configurable hex stored in agent metadata, has no Tailwind equivalent
- Select dropdown custom arrow kept as data URI SVG in `style` prop — this is a pure presentation SVG, not a design system token
- `statusPillColors` and `badgeColors` helper functions converted from returning `{ bg: string; color: string }` with hex values to returning Tailwind class strings (consistent with BADGE_STYLES pattern established in agents/[id]/page.tsx)

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

- Agent surface (detail page + side panel + form panel) is fully migrated to UUI tokens
- Office surface components are the remaining migration target (Phase 03 plans 03+)
- ConfirmActionDialog import pattern (`@circos/ui`) established for remaining components

---
*Phase: 03-wave-c-agents-+-office*
*Completed: 2026-03-20*
