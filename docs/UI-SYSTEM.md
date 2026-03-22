# UI-SYSTEM.md — OpenClaw Design System

> Master governance document for the Untitled UI PRO design system.
> **Migration complete.** All rules, conventions, and workflows derive from this file.

## System Overview

- **Design System:** Untitled UI React PRO (copy-paste, source-first)
- **Package:** `@circos/ui` at `packages/ui/`
- **Theme:** Dark default, light available via `data-theme="light"`
- **Brand:** `#FF3B30` (brand-600)
- **Typography:** Sora (headings), Inter (body), JetBrains Mono (code)
- **Component Library:** React Aria (accessibility), Tailwind CSS v4 (styling)
- **Storybook:** Oracle of truth for all visual components
- **Figma:** UUI PRO kit + Joan's customizations → Code Connect
- **Status:** Migration complete — zero legacy tokens, zero Radix, zero CVA

## Governance Rules

1. **All UI imports from `@circos/ui`** — No creating primitives outside the package.
2. **No compatibility wrappers** — Components expose real UUI/React Aria API.
3. **No inline styles** except allowlist (see below).
4. **No magic numbers** — Only semantic tokens from `theme.css`.
5. **Token manifest versioned** — `tokens.json` always in PR. No blind Figma sync.
6. **Class merging via `cx()`** — Never `cn()`, `clsx()`, or raw template literals.
7. **UUI tokens only** — Use `--bg-primary`, `--brand-600`, etc. Never legacy token names.

## Allowlist (Exceptions)

| Surface | Reason | What Uses UUI | What Stays |
|---------|--------|--------------|-----------|
| Office2D (Phaser) | Canvas/game engine | React wrappers | Canvas internals |
| Charts (Recharts) | Library-controlled rendering | Containers | Chart fill/stroke |
| pixel-office (SVG) | Art assets | React chrome | SVG/canvas internals |
| Monaco Editor | Third-party editor | Container | Editor internals |

## Architecture

```
control-panel/                    ← workspace root
├── package.json                  ← workspaces: ["packages/*"]
├── packages/
│   └── ui/                       ← @circos/ui
│       ├── package.json
│       ├── tsconfig.json
│       ├── CLAUDE.md             ← LLM docs for design system
│       ├── figma.config.json     ← Code Connect
│       ├── .storybook/           ← Storybook config
│       └── src/
│           ├── components/
│           │   ├── base/         ← Button, Badge, Input, Select, Checkbox, Radio, Toggle, Tooltip, TextArea
│           │   ├── application/  ← Modal, Tabs, Table, Pagination, Popover, Combobox, SlideoutMenu, EmptyState, LoadingIndicator, AppNavigation
│           │   ├── foundations/  ← FeaturedIcon
│           │   └── patterns/    ← SidePanel, FilterBar, DetailPanel, MetricCard, ModalForm, StatusBadge, TimelineItem, TableActions, PageHeader, OCEmptyState, ConfirmActionDialog
│           ├── styles/
│           │   ├── theme.css    ← All design tokens (dark/light)
│           │   ├── typography.css
│           │   └── tokens.json  ← Versioned manifest
│           ├── providers/
│           │   ├── theme.tsx    ← ThemeProvider (next-themes, dark default)
│           │   └── router-provider.tsx ← UUIRouterProvider (React Aria + Next.js)
│           ├── hooks/           ← useBreakpoint, useClipboard
│           ├── utils/cx.ts     ← Class merging (tailwind-merge)
│           └── index.ts        ← Barrel export
├── src/                          ← Next.js app (consumer)
│   ├── app/
│   │   ├── globals.css          ← Imports theme.css + typography.css + custom OC tokens
│   │   ├── layout.tsx           ← Providers wrapper
│   │   └── providers.tsx        ← ThemeProvider + UUIRouterProvider
│   ├── components/               ← Feature components (NOT design system)
│   ├── hooks/                    ← Domain hooks
│   └── lib/
└── docs/
    ├── UI-SYSTEM.md              ← This file
    ├── TOKEN-MAP.md              ← Digital Circus → UUI equivalences (historical)
    └── COMPONENT-TAXONOMY.md     ← Component classification (historical)
```

## Import Conventions

```typescript
// Components
import { Button, Badge, Modal, Tabs, Select } from "@circos/ui"

// Patterns
import { SidePanel, FilterBar, PageHeader } from "@circos/ui"

// Utilities
import { cx } from "@circos/ui"

// Providers
import { ThemeProvider, UUIRouterProvider } from "@circos/ui"

// Hooks
import { useBreakpoint, useClipboard } from "@circos/ui"
```

## Token System

All tokens defined in `packages/ui/src/styles/theme.css`:

| Category | Examples |
|----------|---------|
| Background | `--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--bg-quaternary` |
| Text | `--text-primary-900`, `--text-secondary-700`, `--text-tertiary-600`, `--text-quaternary-500` |
| Border | `--border-primary`, `--border-secondary`, `--border-tertiary` |
| Brand | `--brand-25` through `--brand-950` (brand-600 = #FF3B30) |
| Success | `--success-25` through `--success-950` |
| Warning | `--warning-25` through `--warning-950` |
| Error | `--error-25` through `--error-950` |
| Blue/Info | `--blue-25` through `--blue-950` |
| Gray | `--gray-25` through `--gray-950` |
| Shadows | `--shadow-xs` through `--shadow-3xl` |
| Radius | `--radius-none` through `--radius-full` |

Custom OpenClaw tokens (in `globals.css`):
- `--oc-type-file`, `--oc-type-search`, `--oc-type-message`, `--oc-type-command`, `--oc-type-cron`, `--oc-type-security`, `--oc-type-build` (+ `-bg` variants)

## Figma → Code Workflow

1. Joan updates Figma (UUI PRO kit + customizations)
2. Update `packages/ui/src/styles/tokens.json` to reflect changes
3. Update `packages/ui/src/styles/theme.css` with new token values
4. PR with diff of `tokens.json` for review
5. Code Connect auto-updates snippets in Figma Dev Mode

## Dependencies Removed (Phase 7)

| Package | Replaced By |
|---------|------------|
| `@radix-ui/react-dialog` | React Aria Modal/Dialog |
| `@radix-ui/react-popover` | React Aria Popover |
| `@radix-ui/react-select` | React Aria Select |
| `@radix-ui/react-tabs` | React Aria Tabs |
| `@radix-ui/react-tooltip` | React Aria Tooltip |
| `class-variance-authority` | UUI component prop variants |
| `clsx` | `cx()` from @circos/ui |
| `@tiptap/*` (5 packages) | Removed (no active imports) |
| `motion` | CSS transitions / tailwindcss-animate |

## Dependencies Kept

| Package | Reason |
|---------|--------|
| `@monaco-editor/react` | Active in FileBrowser.tsx |
| `cmdk` | Command palette (styled with UUI tokens) |
| `recharts` | Charts (container migrated, internals allowlisted) |
| `phaser` | Office2D game engine (allowlisted) |
| `lucide-react` | Icon library (compatible with UUI) |

## Enforcement Checks

```bash
# All return 0 matches — VERIFIED
grep -r "var(--bg)\|var(--surface)\|var(--accent)\|var(--border)\|var(--text-primary\b)\|var(--text-secondary\b)\|var(--text-muted\b)" src/ --include="*.tsx" --include="*.css"
grep -r "@radix-ui" src/
grep -r "class-variance-authority" src/
grep -r "from ['\"]clsx['\"]" src/
grep -r "from ['\"]@/lib/cn['\"]" src/
grep -r "from ['\"]@/components/ui" src/
next build   # 0 errors
```
