# Phase 3: Wave C Agents + Office - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate all agents pages, board-groups pages, and office React chrome from legacy Digital Circus inline styles to UUI tokens. Covers: agents/page.tsx, agents/[id]/page.tsx, AgentOrganigrama.tsx, AgentFormPanel.tsx, AgentSidePanel.tsx, board-groups/page.tsx, board-groups/[groupId]/page.tsx, board-groups/[groupId]/edit/page.tsx, board-groups/new/page.tsx, and office/page.tsx. Phaser canvas internals in office are allowlisted — only React chrome migrates.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure/migration phase. Key notes:
- Same token mapping as Phase 1 and 2 (proven pattern)
- agents/page.tsx has hardcoded hex colors in STATUS_COLORS map — replace with UUI semantic tokens
- agents/[id]/page.tsx has hardcoded hex colors in STATUS_COLORS, BADGE_STYLES, TASK_STATUS_COLORS — replace with UUI tokens
- AgentFormPanel.tsx: 35+ var(--*), imports ConfirmActionDialog — update import to @circos/ui (already exported in Phase 2)
- AgentSidePanel.tsx: 15+ var(--*), moderate migration
- board-groups pages are lightest — mostly Tailwind already, just token replacement
- board-groups/page.tsx imports ConfirmActionDialog from @/components/ui/ — update to @circos/ui
- office/page.tsx: Migrate React chrome only. Phaser canvas (PhaserGame), AgentPanel, EventBridge are allowlisted. Has hardcoded colors for toast system and connection indicator — replace with UUI tokens
- AgentOrganigrama.tsx: SVG-based — 8 var(--*) in inline styles on SVG elements

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- @circos/ui: Button, Badge, Modal, Select, TextField, TextArea, cx, ConfirmActionDialog (added Phase 2)
- @circos/ui patterns: SidePanel, FilterBar, StatusBadge, PageHeader, OCEmptyState
- Phase 1+2 established the token mapping and migration patterns

### Established Patterns
- agents/page.tsx imports: AgentOrganigrama, StatusDot, AgentFormPanel
- agents/[id]/page.tsx imports: StatusDot
- Domain hooks already extracted: useAgentForm, useSidebarNav
- board-groups pages are mostly self-contained
- office/page.tsx imports: RealtimeProvider, Office2D/EventBridge, Office2D/AgentPanel, Office2D/PhaserGame (dynamic)

### Integration Points
- ConfirmActionDialog: AgentFormPanel and board-groups/page.tsx need import path updated to @circos/ui
- StatusDot: already migrated (atom migration in Phase 2/3 of prior terminals)
- AgentSidePanel: imported by boards/[id] (already migrated in Phase 2)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure migration phase.

</specifics>

<deferred>
## Deferred Ideas

- SmartAddModal animation migration — Phase 4
- SkillPreviewCard and DiscoveryPanel — imported by SmartAddModal, Phase 4

</deferred>
