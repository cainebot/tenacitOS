# Phase 2: Wave C Boards - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate the boards listing page, board detail page (boards/[id], ~900 lines), and all four board sub-components (BoardKanban, BoardFilterBar, CardDetailPanel, ColumnManager) from legacy Digital Circus inline styles to UUI tokens. This is the highest complexity cluster in the entire migration — boards/[id] has an inline `<style>` block with keyframe animations that must be replaced with tailwindcss-animate equivalents.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure/migration phase. Key notes:
- boards/page.tsx: Nearly 100% inline style={{}} with zero Tailwind classes — needs complete rewrite of styling approach
- boards/[id]/page.tsx: ~900 lines, has inline `<style>` tag with @keyframes fadeIn and @keyframes pulse — replace with tailwindcss-animate classes (animate-in fade-in, animate-pulse)
- BoardKanban.tsx: 8 var(--*) occurrences, moderate migration
- BoardFilterBar.tsx: 30+ var(--*) occurrences, heavy migration
- CardDetailPanel.tsx: 25+ var(--*) occurrences, imports ConfirmActionDialog from @/components/ui/confirm-action-dialog — update import to @circos/ui
- ColumnManager.tsx: 20+ var(--*) occurrences, extensive migration
- ConfirmActionDialog: Already migrated internally to @circos/ui — just need to update import paths in consumers
- Domain hooks (useBoardKanban, useCardDetail) already extracted — only visual migration needed

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- @circos/ui components: Button, Badge, Modal, ModalBody, Select, TextField, Tabs, Tooltip, Popover, Combobox
- @circos/ui patterns: SidePanel, FilterBar, DetailPanel, MetricCard, ModalForm, StatusBadge, PageHeader, OCEmptyState
- cx() utility from @circos/ui
- tailwindcss-animate classes: animate-in, fade-in, animate-pulse (replacements for @keyframes)

### Established Patterns
- Phase 1 successfully migrated 4 pages — same token mapping applies
- boards/[id] imports: BoardKanban, BoardFilterBar, CardDetailPanel, ColumnManager, AgentSidePanel, ConfirmActionDialog
- boards/[id] uses contexts: AgentFilterContext (AgentFilterProvider, useAgentFilter)
- boards/[id] uses hooks: useBoardData, useRealtimeCards
- boards/page.tsx is self-contained — uses Link from next/link and types from @/types/workflow

### Integration Points
- ConfirmActionDialog import path needs updating: @/components/ui/confirm-action-dialog → @circos/ui
- AgentSidePanel is imported by boards/[id] but will be migrated in Phase 3
- BoardKanban, BoardFilterBar, CardDetailPanel, ColumnManager are all consumed by boards/[id]

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure migration phase. Follow same token mapping as Phase 1.

</specifics>

<deferred>
## Deferred Ideas

- AgentSidePanel migration — Phase 3
- SmartAddModal animation migration — Phase 4

</deferred>
