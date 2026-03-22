# Phase 2: Wave A Batch 1 - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate 8 simple dashboard pages (about, actions, activity, calendar, files, git, logs, memory) from Digital Circus legacy tokens to 100% UUI semantic tokens. Each page: replace all var(--*) inline → Tailwind UUI tokens, replace all style={} → Tailwind utilities, replace any legacy components → @circos/ui.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — infrastructure migration phase. Same token mapping as Phase 1:

- var(--background) / var(--bg) → bg-[var(--bg-primary)]
- var(--surface) / var(--card) → bg-[var(--bg-secondary)]
- var(--surface-elevated) / var(--card-elevated) → bg-[var(--bg-tertiary)]
- var(--surface-hover) → bg-[var(--bg-quaternary)]
- var(--border) → border-[var(--border-primary)]
- var(--border-strong) → border-[var(--border-secondary)]
- var(--accent) → text-[var(--brand-600)] / bg-[var(--brand-600)]
- var(--accent-soft) → bg-[var(--brand-600)]/10
- var(--text-primary) → text-[var(--text-primary-900)]
- var(--text-secondary) → text-[var(--text-secondary-700)]
- var(--text-muted) → text-[var(--text-quaternary-500)]
- var(--font-heading) → font-[family-name:var(--font-display)]
- var(--font-body) → font-[family-name:var(--font-text)]
- var(--font-mono) → font-[family-name:var(--font-code)]
- var(--success/positive) → var(--success-600), bg → bg-[var(--success-600)]/10
- var(--error/negative) → var(--error-600), bg → bg-[var(--error-600)]/10
- var(--warning) → var(--warning-600), bg → bg-[var(--warning-600)]/10
- var(--info) → var(--blue-600), bg → bg-[var(--blue-600)]/10

### Page Inventory
| Page | Lines | var(-- refs | style={ blocks | Notes |
|------|-------|-------------|----------------|-------|
| about | 512 | 72 | 54 | Largest — many styled sections |
| actions | 374 | 29 | 38 | Medium |
| activity | 602 | 39 | 47 | Longest file but less density |
| calendar | 18 | 0 | 0 | Already clean — just verify |
| files | 249 | 20 | 20 | Monaco container — editor internals allowlisted |
| git | 304 | 31 | 39 | Medium |
| logs | 292 | 15 | 24 | Lightest migration |
| memory | 448 | 35 | 35 | Medium |

### Activity type color tokens
Pages reference activity type colors like var(--type-file), var(--type-search), etc.
These should be mapped to closest UUI semantic equivalents:
- var(--type-file) (#64D2FF) → var(--blue-700)
- var(--type-search) → var(--warning-600)
- var(--type-message) → var(--success-600)
- var(--type-command) → keep as Tailwind arbitrary value [#BF5AF2] (no UUI purple)
- var(--type-cron) → keep as Tailwind arbitrary value [#FF375F] (close to brand but distinct)
- var(--type-security) → var(--error-600)
- var(--type-build) → keep as Tailwind arbitrary value [#FF9F0A] (orange, no UUI equivalent)
- Background variants: use /10 opacity modifier (e.g. bg-[var(--blue-700)]/10)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- @circos/ui: Button, Badge, TextField, Select, Tabs, Modal, Table, EmptyState, LoadingIndicator
- @circos/ui patterns: PageHeader, FilterBar, MetricCard, StatusBadge, TimelineItem, OCEmptyState
- cx() from @circos/ui for class merging

### Established Patterns (from Phase 1)
- Tailwind utilities with UUI CSS custom properties: bg-[var(--bg-primary)]
- font-[family-name:var(--font-display)] for font families
- Dynamic values stay as inline style (e.g. width percentages)
- All components use "use client" directive

### Integration Points
- All 8 pages are children of (dashboard)/layout.tsx which already has UUI providers
- Some pages import from @/components/ (shared components) — those components may still use legacy tokens but that's out of scope for this phase (we only migrate the page file itself)

</code_context>

<specifics>
## Specific Ideas

- Calendar page (18 lines, 0 legacy tokens) is already clean — just needs verification, no migration work
- Monaco editor container in files page: migrate the wrapper/container to UUI tokens, but do NOT touch Monaco internals
- Large pages (about: 512 lines, activity: 602 lines) should be individual plans due to size

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
