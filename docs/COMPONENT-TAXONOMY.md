# Component Taxonomy

> Complete classification of all components in OpenClaw control-panel.
> Used to plan the migration from Digital Circus → Untitled UI PRO.

## Summary

| Category | Count | Migration Phase |
|----------|-------|----------------|
| Pure Primitives (no Radix) | 5 | Phase 2 — Tier 1 |
| Radix Primitives | 6 | Phase 2 — Tier 2/3 |
| Composite UI | 3 | Phase 2 — Tier 4 |
| Atoms | 5 | Phase 2 — atoms/molecules |
| Molecules | 1 | Phase 2 — atoms/molecules |
| Organisms (domain-coupled) | 6 | Phase 2 — decouple hooks |
| Charts | 4 | Phase 7 — subsystems |
| Office/Pixel Art | 11 | Phase 7 — exception (chrome only) |
| Office2D/Phaser | 2+ | Phase 7 — exception (chrome only) |
| Domain Components | 47+ | Phases 4-6 — surface migration |
| Infrastructure | 1 | No migration needed |
| **Total** | **~91+** | |

---

## 1. UI Primitives — `src/components/ui/`

### Tier 1: Pure Primitives (No Radix, CSS/CVA only)

| File | Uses CVA | Uses cn.ts | UUI Replacement | Breaking Changes |
|------|---------|-----------|----------------|-----------------|
| `button.tsx` | Yes | Yes | `Button` from @circos/ui | `variant` names change, `isDisabled`/`isLoading` props |
| `badge.tsx` | Yes | Yes | `Badge` from @circos/ui | Variant names change |
| `card.tsx` | No | Yes | Restyle with UUI tokens | None — pure div |
| `input.tsx` | No | Yes | `TextField` from @circos/ui | Wrapper API changes |
| `textarea.tsx` | No | Yes | `TextArea` from @circos/ui | Wrapper API changes |

### Tier 2: Radix Primitives (Radix → React Aria)

| File | Radix Package | UUI Replacement | Breaking Changes |
|------|--------------|----------------|-----------------|
| `tooltip.tsx` | `@radix-ui/react-tooltip` | `Tooltip` from @circos/ui | Provider no longer needed |
| `tabs.tsx` | `@radix-ui/react-tabs` | `Tabs` from @circos/ui | `value`→`selectedKey` |
| `popover.tsx` | `@radix-ui/react-popover` | `Popover` from @circos/ui | Overlay/portal API changes |

### Tier 3: Radix with Breaking API Changes

| File | Radix Package | UUI Replacement | Breaking Changes |
|------|--------------|----------------|-----------------|
| `select.tsx` | `@radix-ui/react-select` | `Select` from @circos/ui | `value`→`selectedKey`, `onValueChange`→`onSelectionChange` |
| `dialog.tsx` | `@radix-ui/react-dialog` | `Modal`/`Dialog` from @circos/ui | Portal/overlay API, composition pattern |
| `command.tsx` | cmdk (not Radix) | UUI Combobox or restyle cmdk | Search/filter pattern changes |

### Tier 4: Composites (depend on other primitives)

| File | Depends On | UUI Replacement |
|------|-----------|----------------|
| `confirm-action-dialog.tsx` | dialog.tsx | UUI Modal + Button |
| `dropdown-select.tsx` | popover.tsx, command.tsx | UUI Select/Combobox |
| `searchable-select.tsx` | dropdown-select.tsx | UUI Combobox (searchable) |

---

## 2. Atoms — `src/components/atoms/`

| File | Dependencies | UUI Strategy |
|------|-------------|-------------|
| `BrandMark.tsx` | Next.js Link | Restyle with UUI tokens (keep logo) |
| `PriorityBadge.tsx` | CVA, useState | Badge variant from @circos/ui |
| `StatusPill.tsx` | cn.ts | Badge (pill variant) from @circos/ui |
| `StatusDot.tsx` | cn.ts | DotIcon / custom styled div |
| `AttentionBadge.tsx` | None (inline styles) | Badge (attention variant) |

## 3. Molecules — `src/components/molecules/`

| File | Dependencies | UUI Strategy |
|------|-------------|-------------|
| `ContextBreadcrumbs.tsx` | useState, lucide-react | React Aria Breadcrumbs from @circos/ui |

## 4. Organisms — `src/components/organisms/`

**Domain-coupled. Require hook extraction in Phase 2.**

| File | Size | Hook to Extract | Visual → UUI |
|------|------|----------------|-------------|
| `AgentFormPanel.tsx` | 34KB | `useAgentForm()` | UUI Form components |
| `AgentListPanel.tsx` | 16KB | (lighter coupling) | UUI List + Cards |
| `AgentSidePanel.tsx` | 21KB | (composes other panels) | UUI SlideoutMenu |
| `AvatarPickerModal.tsx` | 14KB | (self-contained) | UUI Modal |
| `ChatPanel.tsx` | 13KB | `useChatPanel()` | UUI Cards + List |
| `DashboardSidebar.tsx` | 9KB | `useSidebarNav()` | UUI AppNavigation |

---

## 5. Domain Components — `src/components/`

**Migrated surface-by-surface in Phases 4-6. No hook extraction needed — just token/component swap.**

### Cards & Tasks (16 files)
- `CardDetailPanel.tsx` (807 lines) — **Hook extraction: `useCardDetail()`**
- `CardFieldEditor.tsx` (597 lines)
- `CardActivityTimeline.tsx` (457 lines)
- `CardAttachments.tsx` (381 lines)
- `CardChildTasks.tsx` (477 lines)
- `CardRichTextEditor.tsx`
- `CardFieldReorder.tsx`
- `CardHierarchy.tsx`
- `KanbanCard.tsx`
- `KanbanColumn.tsx`
- `InlineCardCreate.tsx`

### Kanban & Filtering (5 files)
- `BoardKanban.tsx` — **Hook extraction: `useBoardKanban()`**
- `BoardFilterBar.tsx` (1035 lines)
- `ColumnManager.tsx` (890 lines)
- `CustomFieldManager.tsx` (631 lines)
- `CsvImportDialog.tsx` (664 lines)

### Modals & Dialogs (5 files)
- `SmartAddModal.tsx` (730 lines) — **Uses `motion` — replace with tailwindcss-animate**
- `CronJobModal.tsx` (546 lines)
- `SkillDetailModal.tsx`
- `ChangePasswordModal.tsx`
- `QuickActions.tsx`

### Timelines & Schedules (3 files)
- `CronWeeklyTimeline.tsx` (417 lines)
- `WeeklyCalendar.tsx`
- `CronJobCard.tsx` (468 lines)

### Search & Discovery (3 files)
- `GlobalSearch.tsx`
- `DiscoveryPanel.tsx`
- `MentionInput.tsx`

### File Management (3 files)
- `FileBrowser.tsx` (774 lines) — **Uses @monaco-editor/react — keep**
- `FileTree.tsx`
- `FilePreview.tsx` (349 lines)

### Agent & System Monitoring (8 files)
- `AgentOrganigrama.tsx` (293 lines)
- `NodeStatusStrip.tsx` (339 lines)
- `IntegrationStatus.tsx`
- `ActivityFeed.tsx`
- `ActivityHeatmap.tsx`
- `Breadcrumbs.tsx`
- `SystemInfo.tsx`
- `NotificationDropdown.tsx` (509 lines)

### Editors & Text (4 files)
- `MarkdownEditor.tsx` — Uses @tiptap
- `MarkdownPreview.tsx`
- `RichDescription.tsx`
- `Notepad.tsx`

### Skills (3 files)
- `SkillCard.tsx`
- `SkillDetailModal.tsx`
- `SkillPreviewCard.tsx`

### Other (2 files)
- `StatsCard.tsx`
- `WeatherWidget.tsx`

---

## 6. Charts — `src/components/charts/`

**Exception category — chart internals allowlisted, containers migrate to UUI tokens.**

| File | Library | Strategy |
|------|---------|---------|
| `ActivityLineChart.tsx` | Recharts | Container → UUI tokens, chart internals → CSS vars |
| `ActivityPieChart.tsx` | Recharts | Container → UUI tokens, chart internals → CSS vars |
| `HourlyHeatmap.tsx` | Custom | Container → UUI tokens |
| `SuccessRateGauge.tsx` | CSS only | Full migration to UUI tokens |

## 7. Office / Pixel Art — `src/components/office/`

**Exception category — SVG/canvas internals untouched, React chrome → UUI tokens.**

- `OfficeCanvas.tsx` — Canvas wrapper
- `StardewRoom.tsx`, `StardewCharacter.tsx`, `StardewFurniture.tsx`
- `ZeldaRoom.tsx`, `ZeldaCharacter.tsx`, `ZeldaFurniture.tsx`
- `HabboRoom.tsx`, `HabboCharacter.tsx`, `HabboFurniture.tsx`
- `PixelCharacter.tsx`

## 8. Office2D / Phaser — `src/components/Office2D/`

**Exception category — Phaser canvas untouched, React wrappers → UUI tokens.**

- `PhaserGame.tsx` — React ↔ Phaser bridge
- `AgentPanel.tsx` — Sidebar UI panel
- `EventBridge.ts` — Event system (no UI)
- `OfficeScene.ts` + game logic files (no UI)

## 9. Infrastructure

| File | Notes |
|------|-------|
| `RealtimeProvider.tsx` | Supabase Realtime context — no visual component, no migration needed |

---

## Breaking Changes Summary

### API Changes (Radix → React Aria)

| Component | Old API | New API |
|-----------|---------|---------|
| Select | `value`, `onValueChange` | `selectedKey`, `onSelectionChange` |
| Dialog | Radix portal/overlay | UUI Modal wrapper |
| Tabs | `value`, `onValueChange` | `selectedKey`, `onSelectionChange` |
| Tooltip | `TooltipProvider` required | Self-contained |
| Popover | Radix composition | React Aria composition |

### Styling Changes

| From | To |
|------|-----|
| `cn()` from `@/lib/cn` | `cx()` from `@circos/ui` |
| CVA `variants({})` | UUI component props (variant, size, etc.) |
| `var(--accent)` etc. | Tailwind utility classes with UUI tokens |
| `clsx()` | `cx()` from `@circos/ui` |

### Dependencies to Remove (Phase 7)

| Package | Reason |
|---------|--------|
| `@radix-ui/react-dialog` | Replaced by React Aria |
| `@radix-ui/react-popover` | Replaced by React Aria |
| `@radix-ui/react-select` | Replaced by React Aria |
| `@radix-ui/react-tabs` | Replaced by React Aria |
| `@radix-ui/react-tooltip` | Replaced by React Aria |
| `class-variance-authority` | Replaced by UUI component API |
| `clsx` | Replaced by cx() |
| `@tiptap/*` (5 packages) | No real imports after MarkdownEditor migration |
| `motion` | Replaced by tailwindcss-animate in SmartAddModal |

### Dependencies to KEEP

| Package | Reason |
|---------|--------|
| `@monaco-editor/react` | Active use in FileBrowser.tsx |
| `cmdk` | Evaluate: may keep with UUI styling OR replace with UUI Combobox |
| `recharts` | Active use in charts — container migrates, chart internals stay |
| `phaser` | Office2D game engine — exception |
| `lucide-react` | Icon library — compatible with UUI |
