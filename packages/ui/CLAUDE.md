# @circos/ui — Design System Reference

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
import { Button, Badge, Modal, cx } from "@circos/ui"
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
Primary/brand color: `#444CE7` (brand-600) — UUI official indigo

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

## Untitled UI Component API Reference

### Import Naming Convention (internal to this package)
All imports from `react-aria-components` MUST be prefixed with `Aria*`:
```typescript
// ✅ Correct
import { Button as AriaButton, TextField as AriaTextField } from "react-aria-components";
// ❌ Incorrect
import { Button, TextField } from "react-aria-components";
```

### File Naming
All files in **kebab-case**: `date-picker.tsx`, `user-profile.tsx`

### Style Organization (sortCx)
```typescript
export const styles = sortCx({
    common: { root: "base-classes", icon: "icon-classes" },
    sizes: { sm: { root: "small" }, md: { root: "medium" } },
    colors: { primary: { root: "primary-classes" }, secondary: { root: "secondary-classes" } },
});
```

### Icon Usage
```typescript
import { Home01, Settings01 } from "@untitledui/icons";

// As component reference (preferred)
<Button iconLeading={ChevronDown}>Options</Button>

// As JSX element - MUST include data-icon
<Button iconLeading={<ChevronDown data-icon className="size-4" />}>Options</Button>

// Standalone
<Home01 className="size-5 text-fg-secondary" />
```

### Semantic Color System (MUST use instead of raw scales)

**Text**: text-primary, text-secondary, text-tertiary, text-quaternary, text-disabled, text-placeholder, text-brand-primary, text-brand-secondary, text-error-primary, text-warning-primary, text-success-primary

**Border**: border-primary, border-secondary, border-tertiary, border-disabled, border-brand, border-error

**Foreground** (icons): fg-primary, fg-secondary, fg-tertiary, fg-quaternary, fg-disabled, fg-brand-primary, fg-error-primary, fg-success-secondary

**Background**: bg-primary, bg-primary_hover, bg-secondary, bg-secondary_hover, bg-tertiary, bg-active, bg-disabled, bg-overlay, bg-brand-solid, bg-error-solid, bg-success-solid

### Button API
Props: `size` (sm|md|lg|xl), `color` (primary|secondary|tertiary|link-gray|link-color|primary-destructive|secondary-destructive|tertiary-destructive|link-destructive), `iconLeading`, `iconTrailing`, `isDisabled`, `isLoading`, `showTextWhileLoading`, `href` (for links)

### Input API
Props: `size` (sm|md), `label`, `placeholder`, `hint`, `tooltip`, `icon`, `isRequired`, `isDisabled`, `isInvalid`

### Select API
Props: `size` (sm|md), `label`, `placeholder`, `hint`, `tooltip`, `items`, `isRequired`, `isDisabled`, `placeholderIcon`
Item props: `id`, `supportingText`, `icon`, `avatarUrl`, `isDisabled`
Sub-components: `Select.Item`, `Select.ComboBox`

### Badge API
Components: `Badge`, `BadgeWithDot`, `BadgeWithIcon`
Props: `size` (sm|md|lg), `color` (gray|brand|error|warning|success|blue|indigo|purple|pink|rose|orange), `type` (pill-color|color|modern)

### Avatar API
Components: `Avatar`, `AvatarLabelGroup`
Props: `size` (xs|sm|md|lg|xl|2xl), `src`, `alt`, `initials`, `placeholderIcon`, `status` (online|offline), `verified`

### FeaturedIcon API
Props: `icon` (required), `size` (sm|md|lg|xl), `color` (brand|gray|error|warning|success), `theme` (light|gradient|dark|modern|modern-neue|outline)
Note: `modern` and `modern-neue` themes only work with `color="gray"`

### Checkbox API
Props: `size` (sm|md), `label`, `hint`, `isSelected`, `isDisabled`, `isIndeterminate`

### Animation
- Use `tailwindcss-animate` for utility-based animations
- CSS transitions: `transition duration-100 ease-linear` for hover/color changes
- NO motion/framer-motion in new code

## Do NOT
- Import from `@/components/ui/` (legacy path)
- Use `cn()` from `@/lib/cn` (legacy utility)
- Use CVA (class-variance-authority) — use component props
- Use Radix UI directly — use React Aria via this package
- Add inline styles except allowlisted surfaces (canvas, charts)
- Use raw color scales (text-gray-900, bg-blue-700) — use semantic tokens
- Use motion/framer-motion — use tailwindcss-animate
