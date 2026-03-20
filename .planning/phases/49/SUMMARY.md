# Phase 49: Surface Sweep — CSS Var References + Non-Standard Classes

**Status**: Complete
**Branch**: phase/49-surface-sweep
**Completed**: 2026-03-21

## What was done

Replaced ~1,200 CSS var bracket patterns and non-standard Tailwind classes across 40+ files in src/.

### Bracket patterns eliminated (545 occurrences)
- `bg-[var(--bg-*)]` → `bg-primary`, `bg-secondary`, `bg-tertiary`, `bg-quaternary` (152)
- `text-[var(--text-*)]` → `text-primary`, `text-secondary`, `text-tertiary`, `text-quaternary` (293)
- `border-[var(--border-*)]` → `border-primary`, `border-secondary` (100)
- Primitive scales: `bg-[var(--brand-600)]` → `bg-brand-600`, etc.

### Non-standard classes eliminated (485 occurrences)
- `border-border` → `border-secondary` (177)
- `text-muted` → `text-quaternary` (171)
- `bg-surface` / `bg-surface-elevated` / `bg-surface-alt` → `bg-secondary` / `bg-tertiary` (141)
- `bg-card` / `bg-card-elevated` → `bg-secondary` / `bg-tertiary` (65)
- `bg-accent` / `bg-accent-soft` → `bg-brand-50` (32)
- `text-accent` → `text-brand-600` (5)
- `text-error` → `text-error-600` (38)
- `bg-background` → `bg-primary` (16)
- `font-heading` → `font-display` (31)
- `text-foreground` → `text-primary` (8)

### Inline style var(--surface*) eliminated (36 occurrences)
- `var(--surface, #...)` → `var(--bg-secondary)`
- `var(--surface-elevated, ...)` → `var(--bg-tertiary)`
- `var(--surface-hover, ...)` → `var(--bg-tertiary)`
- `var(--accent, #6366f1)` → `var(--brand-600)`

## Requirements covered

- SURF-01: Zero var(--surface-*) references
- SURF-02: Zero var(--foreground) references
- SURF-03: Zero var(--accent, #6366f1) fallbacks
- SURF-04: Zero var(--font-body) / var(--font-heading)
- SURF-05: All app surface files use resolved @theme classes

## Verification

All zero:
- `grep -r "var(--surface" src/` ✓
- `grep -r "var(--foreground" src/` ✓
- `grep -r "bg-[var(--" src/` ✓
- `grep -r "text-[var(--" src/` ✓
- `grep -r "border-[var(--" src/` ✓
- `grep -r "bg-surface\b" src/` ✓
- `grep -r "border-border" src/` ✓
- `grep -r "text-muted\b" src/` ✓
- `grep -r "font-heading\b" src/` ✓
- `next build` passes ✓
