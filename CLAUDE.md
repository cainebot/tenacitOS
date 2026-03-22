# CircOS Control Panel

## Design System: Untitled UI React PRO

This project uses **Untitled UI React PRO** as its design system, wrapped in `@circos/ui` (packages/ui/).

### OpenClaw Overrides
- **Brand color**: `#444CE7` (brand-600) — UUI official indigo
- **Fonts**: Sora (display), Inter (body), JetBrains Mono (code)
- **Dark theme default** — light via `data-theme="light"`
- **Import from**: `@circos/ui` (NOT from untitled-ui directly)
- **Class merging**: `cx()` from `@circos/ui` (NOT `cn()`, `clsx()`, or raw template literals)

---

## Untitled UI Reference (AGENT.md)

## Project Overview

This is an **Untitled UI React** component library project built with:

- **React 19.1.1** with TypeScript
- **Tailwind CSS v4.1** for styling
- **React Aria Components** as the foundation for accessibility and behavior

## Key Architecture Principles

### Component Foundation

- All components are built on **React Aria Components** for consistent accessibility and behavior
- Components follow the compound component pattern with sub-components (e.g., `Select.Item`, `Select.ComboBox`)
- TypeScript is used throughout for type safety

### Import Naming Convention

**CRITICAL**: All imports from `react-aria-components` must be prefixed with `Aria*` for clarity and consistency:

```typescript
// ✅ Correct
import { Button as AriaButton, TextField as AriaTextField } from "react-aria-components";
// ❌ Incorrect
import { Button, TextField } from "react-aria-components";
```

### File Naming Convention

**IMPORTANT**: All files must be named in **kebab-case** for consistency:

```
✅ Correct:
- date-picker.tsx
- user-profile.tsx
- api-client.ts
- auth-context.tsx

❌ Incorrect:
- DatePicker.tsx
- userProfile.tsx
- apiClient.ts
- AuthContext.tsx
```

## Component Patterns

### Base Components (`components/base/`)

Building blocks: Button, Input, Select, Checkbox, Radio, Toggle, Avatar, Badge, Tooltip

### Application Components (`components/application/`)

Complex UI patterns: DatePicker, Modal, Pagination, Table, Tabs

### Styling Architecture

- Uses a `sortCx` utility for organized style objects
- Size variants: `sm`, `md`, `lg`, `xl`
- Color variants: `primary`, `secondary`, `tertiary`, `destructive`, etc.

### Component Props Pattern

```typescript
interface CommonProps {
    size?: "sm" | "md" | "lg";
    isDisabled?: boolean;
    isLoading?: boolean;
}
```

## Icon Usage

### Available Libraries

- `@untitledui/icons` - 1,100+ line-style icons (free)
- `@untitledui/file-icons` - File type icons
- `@untitledui-pro/icons` - 4,600+ icons in 4 styles (Requires PRO access)

### Import & Usage

```typescript
// Recommended: Named imports (tree-shakeable)
import { Home01, Settings01, ChevronDown } from "@untitledui/icons";

// Component props - pass as reference
<Button iconLeading={ChevronDown}>Options</Button>

// Standalone usage
<Home01 className="size-5 text-gray-600" />

// As JSX element - MUST include data-icon
<Button iconLeading={<ChevronDown data-icon className="size-4" />}>Options</Button>
```

### Sizing

```typescript
// size-4 (16px), size-5 (20px), size-6 (24px)
<Home01 className="size-5" />
<Home01 className="size-5 text-brand-600" />
```

## Animation

- `tailwindcss-animate` for utility-based animations
- CSS transitions for simple state changes: `transition duration-100 ease-linear`

## COLORS

MUST use semantic color classes. Never use raw gray/blue scales directly.

### Text Color

| Name | Usage |
|:--|:--|
| text-primary | Primary text (headings) |
| text-secondary | Labels, section headings |
| text-tertiary | Supporting/paragraph text |
| text-quaternary | Subtle, low-contrast text |
| text-white | Always white regardless of mode |
| text-disabled | Disabled text |
| text-placeholder | Placeholder text |
| text-brand-primary | Brand headings |
| text-brand-secondary | Brand buttons, accented text |
| text-error-primary | Error state text |
| text-warning-primary | Warning state text |
| text-success-primary | Success state text |

### Border Color

| Name | Usage |
|:--|:--|
| border-primary | High contrast (inputs, checkboxes) |
| border-secondary | Default for cards, tables, dividers |
| border-tertiary | Subtle dividers |
| border-disabled | Disabled states |
| border-brand | Active states (inputs) |
| border-error | Error states |

### Foreground Color (icons, non-text elements)

| Name | Usage |
|:--|:--|
| fg-primary | Highest contrast icons |
| fg-secondary | High contrast icons |
| fg-tertiary | Medium contrast icons |
| fg-quaternary | Low contrast icons (buttons, inputs) |
| fg-white | Always white |
| fg-disabled | Disabled icons |
| fg-brand-primary | Brand icons, progress bars |
| fg-error-primary | Error icons |
| fg-success-secondary | Success indicators |

### Background Color

| Name | Usage |
|:--|:--|
| bg-primary | Primary background (white/dark) |
| bg-primary_hover | Hover on white backgrounds |
| bg-secondary | Contrast sections |
| bg-secondary_hover | Hover on gray backgrounds |
| bg-tertiary | Toggles, contrast |
| bg-active | Selected menu items |
| bg-disabled | Disabled buttons/toggles |
| bg-overlay | Modal overlays |
| bg-brand-solid | Brand toggles, messages |
| bg-brand-solid_hover | Brand hover |
| bg-error-solid | Error buttons |
| bg-success-solid | Success indicators |

## Most Used Components

### Button

```typescript
import { Button } from "@circos/ui";

<Button size="md">Save</Button>
<Button iconLeading={Check} color="primary">Save</Button>
<Button isLoading showTextWhileLoading>Submitting...</Button>
<Button color="primary-destructive" iconLeading={Trash02}>Delete</Button>
```

Colors: `primary`, `secondary`, `tertiary`, `link-gray`, `link-color`, `primary-destructive`, `secondary-destructive`, `tertiary-destructive`, `link-destructive`

### Input

```typescript
import { Input } from "@circos/ui";

<Input label="Email" placeholder="olivia@untitledui.com" />
<Input icon={Mail01} label="Email" isRequired isInvalid hint="Please enter a valid email" />
```

### Select

```typescript
import { Select } from "@circos/ui";

<Select label="Team member" placeholder="Select member" items={users}>
  {(item) => <Select.Item id={item.id} supportingText={item.email}>{item.name}</Select.Item>}
</Select>

<Select.ComboBox label="Search" placeholder="Search users" items={users}>
  {(item) => <Select.Item id={item.id}>{item.name}</Select.Item>}
</Select.ComboBox>
```

### Badge

```typescript
import { Badge, BadgeWithDot, BadgeWithIcon } from "@circos/ui";

<Badge color="brand" size="md">New</Badge>
<BadgeWithDot color="success" type="pill-color">Active</BadgeWithDot>
```

### Avatar

```typescript
import { Avatar, AvatarLabelGroup } from "@circos/ui";

<Avatar src="/avatar.jpg" alt="User" size="md" status="online" />
<AvatarLabelGroup src="/avatar.jpg" title="Olivia Rhye" subtitle="olivia@email.com" size="md" />
```

### FeaturedIcon

```typescript
import { FeaturedIcon } from "@circos/ui";

<FeaturedIcon icon={CheckCircle} color="success" theme="light" size="lg" />
```

Themes: `light`, `gradient`, `dark`, `modern` (gray only), `outline`

### Link (via Button)

```typescript
<Button href="/dashboard" color="link-color">View Dashboard</Button>
<Button href="/settings" color="link-gray" iconLeading={Settings01}>Settings</Button>
```

## Do NOT

- Import from `@/components/ui/` (legacy path)
- Use `cn()` from `@/lib/cn` (legacy utility)
- Use CVA (class-variance-authority)
- Use Radix UI directly
- Use raw color scales (`text-gray-900`, `bg-blue-700`) — use semantic tokens
- Add inline `style={}` with CSS vars — use Tailwind utilities
