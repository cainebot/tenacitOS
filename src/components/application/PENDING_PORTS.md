# Componentes pendientes de portar desde Paperclip

Componentes identificados en la sesión de análisis. Estado actualizado al 2026-04-14.

---

## Estado general

| Componente | Archivo | Estado |
|---|---|---|
| `RunTranscriptView` family | `run-transcript-view-full.tsx` | ✅ Portado y funcional |
| `ActivityRow` | `activity-row.tsx` | ✅ Portado y funcional |
| `IssueChatThread` family | `issue-chat-thread.tsx` | 🔶 Copiado — WIP (ver sección 1) |
| Página lab | `src/app/ui/transcript/page.tsx` | ✅ Creada (estructura AgentActivityComponentLab) |

---

## 1. Familia `IssueChatThread`

**Archivo destino:** `components/application/issue-chat-thread.tsx`
**Archivo origen:** `ui/src/components/IssueChatThread.tsx` (Paperclip, 2012 líneas)

### Realizado (2026-04-14)
- Archivo copiado literalmente desde Paperclip
- Imports adaptados:
  - `cn()` → `cx()` from `@circos/ui`
  - `@/components/ui/*` (Button, Avatar, Dialog, Tooltip, Popover, DropdownMenu, Textarea) → shims HTML temporales o `@circos/ui`
  - `@/lib/router` (Link, useLocation) → `next/link` + `usePathname`
  - `@paperclipai/shared` types → definidos localmente en el archivo
  - `Link to=` → `Link href=`
  - `useLocation()` → `usePathname()` + `window.location.hash`

### Pendiente para que funcione

| Tarea | Descripción |
|---|---|
| `npm install @assistant-ui/react` | Runtime de chat. Sin esto el archivo no compila. |
| `use-circOS-task-runtime.ts` | Reemplaza `usePaperclipIssueRuntime`. Adapta Supabase Realtime → @assistant-ui/react ExternalStoreRuntime. |
| `build-circOS-chat-messages.ts` | Reemplaza `buildIssueChatMessages`. Convierte cards/tasks del schema de CircOS a `ThreadMessage[]`. |
| `use-live-run-transcripts.ts` | Reemplaza `useLiveRunTranscripts`. Subscribe a transcripts en vivo vía Supabase Realtime. |
| `MarkdownEditor` | Editor con soporte de menciones. Reemplaza el placeholder `<textarea>` del shim actual. |
| `InlineEntitySelector` | Selector inline de entidades. Reemplaza el `<select>` del shim. |
| `AgentIcon` | Ícono de agente. Reemplaza el span con emoji actual. |
| Diálogos/Tooltips/Popovers | Reemplazar shims HTML con componentes reales de `@circos/ui`. |
| Tipos `IssueChatComment` → CircOS | Adaptar al schema de CircOS: `conversations`, `messages`, `cards`. |

### Dependencias directas (referencia)

| Dependencia | Ruta en Paperclip | Estado en CircOS |
|---|---|---|
| `@assistant-ui/react` | paquete npm | ❌ No instalado |
| `usePaperclipIssueRuntime` | `ui/src/hooks/usePaperclipIssueRuntime.ts` | ❌ Stub vacío |
| `useLiveRunTranscripts` | `ui/src/components/transcript/useLiveRunTranscripts.ts` | ❌ Stub vacío |
| `buildIssueChatMessages` / tipos | `ui/src/lib/issue-chat-messages.ts` | ❌ Stub vacío |
| `resolveIssueChatTranscriptRuns` | `ui/src/lib/issueChatTranscriptRuns.ts` | ❌ Stub vacío |
| `issue-timeline-events` (tipos) | `ui/src/lib/issue-timeline-events.ts` | ✅ Definidos localmente |
| `formatAssigneeUserLabel` | `ui/src/lib/assignees.ts` | ✅ Inlineado |
| `timeAgo` | `ui/src/lib/timeAgo.ts` | ✅ Inlineado |
| `formatDateTime` / `formatShortDate` | `ui/src/lib/utils.ts` | ✅ Inlineados |
| `MarkdownBody` | `ui/src/components/MarkdownBody.tsx` | ✅ `./markdown-body` |
| `MarkdownEditor` | `ui/src/components/MarkdownEditor.tsx` | ❌ Placeholder `<textarea>` |
| `Identity` | `ui/src/components/Identity.tsx` | ❌ No importado (inlineado en activity-row) |
| `InlineEntitySelector` | `ui/src/components/InlineEntitySelector.tsx` | ❌ Placeholder `<select>` |
| `AgentIcon` | `ui/src/components/AgentIconPicker.tsx` | ❌ Placeholder `<span>` |
| `RunTranscriptView` | transcript/RunTranscriptView.tsx | ✅ `run-transcript-view-full.tsx` |
| `transcriptPresentation` utils | `ui/src/lib/transcriptPresentation.ts` | ❌ Stubs vacíos |
| `restoreSubmittedCommentDraft` | `ui/src/lib/comment-submit-draft.ts` | ✅ Inlineado |
| Shadcn: Button, Avatar, Dialog... | `ui/src/components/ui/*` | 🔶 Shims HTML temporales |

---

## 2. `ActivityRow`

**Archivo destino:** `components/application/activity-row.tsx`

### Realizado (2026-04-14)
- ✅ Portado completamente y funcional
- Todas las dependencias inlineadas: `Identity`, `timeAgo`, `formatActivityVerb`
- Tipos `ActivityEvent` / `Agent` definidos localmente
- `cn` → `cx` de `@circos/ui`, `Link` → `next/link`
- Verbos CircOS-específicos añadidos (`card.*`, `task.*`)

---

## 3. Página lab `AgentActivityComponentLab`

**Archivo destino:** `src/app/ui/transcript/page.tsx`
**Ruta:** `http://localhost:3000/ui/transcript`

### Realizado (2026-04-14)
- ✅ Reemplaza la página confusa anterior (solo mostraba RunTranscriptView)
- Estructura tipo `AgentActivityComponentLab.tsx` de Paperclip:
  - Hero header con gradiente brand indigo
  - 3 SurfaceCards de inventario de componentes con status (portado / pendiente)
  - Preview en vivo de `RunTranscriptView` con datos mock de CircOS
  - Preview en vivo de `ActivityRow` con 4 eventos mock (agents Kinger/Pomni)
  - Sección "pendiente de port" para IssueChatThread con checklist de pasos

---

## Notas de adaptación para CircOS

- `cn()` → `cx()` de `@circos/ui`
- `@/components/ui/*` (Shadcn) → equivalentes en `@circos/ui`
- `Link` de `ui/src/lib/router.tsx` → `next/link`
- `useLocation()` → `usePathname()` + `window.location.hash`
- `@paperclipai/shared` → tipos propios de CircOS (definir localmente o en `@circos/shared`)
- `@assistant-ui/react` → instalar y crear runtime propio sobre Supabase Realtime
- Fixtures de Paperclip → mock data con el schema de CircOS (`card_activity`, `conversations`, etc.)
