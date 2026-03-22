# Phase 1: Wave B Pages - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate all four Wave B pages (skills, costs, system, analytics) from legacy Digital Circus inline styles to UUI tokens and @circos/ui components. Each page currently uses heavy var(--*) inline style={{}} patterns that must be replaced with Tailwind UUI utility classes. Recharts chart internals in costs and analytics are allowlisted — only React wrapper/container code migrates.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure/migration phase. Key migration patterns:
- Replace all `style={{ color: 'var(--text-primary)' }}` with Tailwind classes like `text-primary`
- Replace all `style={{ backgroundColor: 'var(--surface)' }}` with `bg-surface`
- Replace all `style={{ borderColor: 'var(--border)' }}` with `border-border`
- Replace all `style={{ fontFamily: 'var(--font-heading)' }}` with `font-heading`
- Use @circos/ui components (Button, Badge, Modal, Select, etc.) where legacy HTML elements with manual styling exist
- Use cx() from @circos/ui instead of any remaining cn() calls
- Recharts chart internals (fill, stroke colors) are allowlisted — only migrate the React container/wrapper elements

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- @circos/ui exports: Button, Badge, Modal, ModalBody, Select, TextField, TextArea, Tabs, Tooltip, Popover, Combobox
- @circos/ui patterns: SidePanel, FilterBar, DetailPanel, MetricCard, ModalForm, StatusBadge, PageHeader, OCEmptyState
- cx() utility from @circos/ui for class merging
- UUI tokens available in Tailwind: text-primary, text-secondary, text-muted, bg-surface, bg-surface-elevated, border-border, etc.

### Established Patterns
- Pages are self-contained with inline sub-components (no separate files for most)
- skills/page.tsx has inline RegisterSkillModal, StatusBadge, SkillCard, SkillDetailModal
- costs/page.tsx uses Recharts (LineChart, BarChart, PieChart) with hardcoded color constants
- system/page.tsx is fully self-contained with inline logs modal
- analytics/page.tsx imports from src/components/charts/ (ActivityLineChart, ActivityPieChart, HourlyHeatmap, SuccessRateGauge)
- SmartAddModal is imported by skills/page.tsx

### Integration Points
- skills/page.tsx imports SmartAddModal from @/components/SmartAddModal (SmartAddModal migration deferred to Phase 4)
- analytics chart components in src/components/charts/ — chart internals allowlisted
- No cn() usage in any Wave B file
- No @radix-ui or cva usage in any Wave B file

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure migration phase following established token replacement patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
