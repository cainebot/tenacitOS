# Phase 1: App Shell - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate the app shell infrastructure: root layout (ThemeProvider + RouterProvider), dashboard layout, login page, DashboardSidebar (→ AppNavigation), and global navigation/headers. All legacy var(--*) tokens replaced with UUI semantic tokens. All inline style={} replaced with Tailwind utilities.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — infrastructure migration phase. Key token mapping:

- var(--background) / var(--bg) → bg-[var(--bg-primary)]
- var(--foreground) / var(--text-primary) → text-[var(--text-primary-900)]
- var(--surface) / var(--card) → bg-[var(--bg-secondary)]
- var(--surface-elevated) / var(--card-elevated) → bg-[var(--bg-tertiary)]
- var(--surface-hover) → bg-[var(--bg-quaternary)]
- var(--border) → border-[var(--border-primary)]
- var(--border-strong) → border-[var(--border-secondary)]
- var(--accent) → text-[var(--brand-600)] / bg-[var(--brand-600)]
- var(--accent-soft) → bg-[var(--brand-600)]/10
- var(--text-secondary) → text-[var(--text-secondary-700)]
- var(--text-muted) → text-[var(--text-quaternary-500)]
- var(--font-heading) → font-display (Sora, already in typography.css)
- var(--font-body) → font-text (Inter)
- var(--font-mono) → font-code (JetBrains Mono)
- var(--success) / var(--positive) → var(--success-600)
- var(--error) / var(--negative) → var(--error-600)
- var(--warning) → var(--warning-600)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- packages/ui/src/providers/theme.tsx — ThemeProvider (next-themes, dark default)
- packages/ui/src/providers/router-provider.tsx — UUIRouterProvider (React Aria + Next.js)
- packages/ui/src/components/application/app-navigation.tsx — AppNavigation (sidebar nav pattern)
- packages/ui/src/styles/theme.css — All UUI semantic tokens
- packages/ui/src/styles/typography.css — Font families
- packages/ui/src/utils/cx.ts — Class merging utility

### Established Patterns
- Components use "use client" directive
- Tailwind utility classes for styling
- UUI CSS custom properties from theme.css
- cx() for class merging (already adopted in DashboardSidebar)

### Integration Points
- src/app/layout.tsx — wrap with ThemeProvider (requires "use client" or client wrapper)
- src/app/(dashboard)/layout.tsx — wrap with UUIRouterProvider, replace var(--background)
- src/app/login/page.tsx — replace all inline styles + legacy components
- src/components/organisms/DashboardSidebar.tsx — massive inline style refactor → AppNavigation
- src/components/atoms/BrandMark.tsx — replace var(--accent), var(--font-heading), var(--text-*)
- src/components/NodeStatusStrip.tsx — extensive inline style → Tailwind + UUI tokens

### Important: ThemeProvider in Server Layout
Root layout.tsx is a server component. ThemeProvider needs "use client". Options:
1. Create a client Providers wrapper component that wraps ThemeProvider + UUIRouterProvider
2. Add "use client" to layout.tsx (not recommended — loses server component benefits)
→ Create src/app/providers.tsx client wrapper

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure migration phase following established token mapping.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
