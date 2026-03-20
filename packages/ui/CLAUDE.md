# @openclaw/ui — Design System Reference

## Overview
OpenClaw's design system built on Untitled UI React PRO. Uses React Aria for accessibility, Tailwind CSS v4 for styling. Dark theme default.

## Package Structure
```
packages/ui/src/
├── components/
│   ├── base/          — Primitive components (Button, Badge, Input, Select, etc.)
│   ├── application/   — Complex components (Modal, Tabs, Table, Combobox, etc.)
│   ├── foundations/    — Visual foundations (FeaturedIcon, etc.)
│   └── patterns/      — OpenClaw compound patterns (Phase 3)
├── styles/
│   ├── theme.css      — CSS custom properties (dark/light)
│   ├── typography.css — Font families and type scale
│   └── tokens.json    — Versioned token manifest
├── providers/
│   ├── theme.tsx      — ThemeProvider (next-themes, dark default)
│   └── router-provider.tsx — UUIRouterProvider (React Aria + Next.js)
├── hooks/             — useBreakpoint, useClipboard
├── utils/cx.ts        — Class merging (tailwind-merge)
└── index.ts           — Barrel export
```

## Key Conventions

### Imports
```typescript
import { Button, Badge, Modal, cx } from "@openclaw/ui"
```

### Class Merging
Always use `cx()` — never `cn()`, `clsx()`, or raw template literals:
```typescript
cx("base-class", condition && "conditional-class", className)
```

### Component Patterns
- All components use `"use client"` directive
- React Aria components for accessibility (Button, Select, Modal, Tabs, etc.)
- Tailwind CSS v4 utility classes
- CSS custom properties from theme.css for token values
- Dark theme by default, light via `data-theme="light"`

### Brand Color
Primary/brand color: `#FF3B30` (brand-600)

### Typography
- Headings: Sora (`--font-display`)
- Body: Inter (`--font-text`)
- Code: JetBrains Mono (`--font-code`)

## Base Components
| Component | React Aria | Props |
|-----------|-----------|-------|
| Button | Button | variant, size, isDisabled, isLoading, iconLeading, iconTrailing |
| Badge | — | variant, size |
| TextField | TextField + Input | label, description, errorMessage, size, iconLeading |
| TextArea | TextField + TextArea | label, description, errorMessage, rows |
| Tooltip | TooltipTrigger + Tooltip | children, content, placement |
| Select | Select + ListBox + Popover | label, selectedKey, onSelectionChange, items |
| Checkbox | Checkbox | isSelected, onChange, isIndeterminate |
| RadioGroup | RadioGroup + Radio | value, onChange |
| Toggle | Switch | isSelected, onChange |

## Application Components
| Component | Purpose |
|-----------|---------|
| Modal | Dialog/modal with sizes |
| Tabs | Tab navigation |
| Table | Data table |
| Pagination | Page navigation |
| Popover | Floating content |
| Combobox | Searchable select |
| SlideoutMenu | Side panel |
| EmptyState | Empty content placeholder |
| LoadingIndicator | Spinner |
| AppNavigation | Sidebar navigation |

## Do NOT
- Import from `@/components/ui/` (legacy path)
- Use `cn()` from `@/lib/cn` (legacy utility)
- Use CVA (class-variance-authority) — use component props
- Use Radix UI directly — use React Aria via this package
- Add inline styles except allowlisted surfaces (canvas, charts)
