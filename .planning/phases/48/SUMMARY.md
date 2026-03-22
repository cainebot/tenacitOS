# Phase 48: Wrapper Hardening

**Status**: Complete
**Branch**: phase/48-wrapper-hardening
**Completed**: 2026-03-20

## What was done

Replaced all hardcoded dark-theme values across ALL @circos/ui wrapper components with semantic tokens and @theme primitives.

### Base components (7 files)
- **button.tsx**: Variant styles use brand-600/700/800, bg-secondary, text-primary, error-600/700/800
- **input.tsx**: text-neutral-300→text-secondary, bg-white/5→bg-secondary, focus→brand-600
- **badge.tsx**: Brand variant uses brand-600 (indigo), gray variant uses gray-500
- **checkbox.tsx**: bg/border-brand-600, ring-brand-600, ring-offset-gray-50
- **toggle.tsx**: bg-brand-600 selected, bg-gray-400 unselected, ring-brand-600
- **radio.tsx**: border/bg-brand-600, semantic label/description colors
- **select.tsx**: bg-secondary, border-secondary, brand-600 focus, text-quaternary placeholders
- **textarea.tsx**: Same pattern as input.tsx

### Application components (7 files)
- **modal.tsx**: bg-secondary, border-secondary, text-primary. Removed unused DialogProps import
- **slideout-menu.tsx**: bg-secondary, text-primary, border-secondary, brand-600 focus
- **combobox.tsx**: bg-secondary, brand-600 focus, semantic text colors
- **tabs.tsx**: text-quaternary/primary/secondary, border-brand-600 selected, border-secondary
- **pagination.tsx**: bg-brand-600 active, text-quaternary, brand-600 focus
- **loading-indicator.tsx**: text-brand-600 spinner, text-quaternary label
- **app-navigation.tsx**: bg-secondary, border-secondary, brand-600 focus
- **popover.tsx**: bg-secondary, border-secondary, text-primary
- **tooltip.tsx**: bg-secondary, text-primary

### Pattern components (3 files)
- **StatusBadge.tsx**: bg-info-500→bg-blue-500 (valid @theme primitive)
- **ConfirmActionDialog.tsx**: Removed unused cx import
- **ModalForm.tsx**: Removed unused cx import

## Requirements covered

- WRAP-01: button.tsx uses semantic tokens
- WRAP-02: input.tsx uses semantic tokens
- WRAP-03: modal.tsx uses semantic tokens, no hex colors
- WRAP-04: slideout-menu.tsx uses semantic tokens, no hex colors
- WRAP-05: StatusBadge uses bg-blue-500 (valid @theme primitive)
- WRAP-06: MetricCard uses text-success-500/text-error-500 (valid @theme primitives — already correct)
- WRAP-07: Unused imports removed (DialogProps from modal, cx from ConfirmActionDialog + ModalForm)

## Verification

- `grep -rn "bg-[#" packages/ui/src/` = 0 ✓
- `grep -rn "#FF3B30" packages/ui/src/components/` = 0 ✓
- `grep -rn "text-neutral-|bg-neutral-" packages/ui/src/components/` = 0 ✓
- `next build` passes ✓
