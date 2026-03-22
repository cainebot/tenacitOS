# Phase 3: Wave A Batch 2 + Verify - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate remaining 8 simple dashboard pages (organization, reports, search, sessions, settings, terminal, workflows, workspaces) to 100% UUI tokens, then verify zero legacy tokens across ALL migrated files (shell + 16 pages).

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — infrastructure migration phase. Same token mapping as Phase 1-2.

### Page Inventory
| Page | Lines | var(-- refs | style={ blocks | Notes |
|------|-------|-------------|----------------|-------|
| organization | 513 | 53 | 49 | Large — many styled sections |
| reports | 281 | 31 | 17 | Medium |
| search | 23 | 2 | 2 | Tiny — quick fix |
| sessions | 973 | 69 | 85 | Largest — many styled sections |
| settings | 140 | 9 | 7 | Small |
| terminal | 273 | 6 | 28 | Low var refs but many style blocks |
| workflows | 386 | 33 | 25 | Medium |
| workspaces | 397 | 39 | 46 | Medium |

### Token mapping (same as Phase 1-2)
- var(--background/bg) → bg-[var(--bg-primary)]
- var(--surface/card) → bg-[var(--bg-secondary)]
- var(--surface-elevated/card-elevated) → bg-[var(--bg-tertiary)]
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
- Semantic colors: success/positive → var(--success-600), error/negative → var(--error-600), warning → var(--warning-600), info → var(--blue-600)
- Background variants: use /10 opacity

### Important: Hardcoded Tailwind colors
From Phase 2 gap: also replace hardcoded Tailwind color primitives like text-white, text-gray-400, bg-gray-700 with UUI token equivalents where they represent semantic concepts (text, backgrounds, borders).

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
Same as Phase 2 — all @circos/ui components and patterns available.

### Established Patterns (from Phase 1-2)
- Tailwind utilities with UUI CSS custom properties
- Dynamic values stay as inline style (e.g. width percentages, conditional borders)
- Activity type colors: hardcoded hex where no UUI equivalent
- Terminal-themed fixed palette colors: allowlisted

### Integration Points
All 8 pages are children of (dashboard)/layout.tsx — providers already in place.

</code_context>

<specifics>
## Specific Ideas

- Sessions (973 lines) is the largest — should be its own plan
- Search (23 lines) and settings (140 lines) are tiny — pair them together
- Terminal page has few var refs (6) but many style blocks (28) — likely terminal-themed fixed colors that should be allowlisted

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>
