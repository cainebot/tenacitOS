'use client'

/**
 * /ui/transcript — Agent Activity Component Lab
 *
 * Catálogo temporal de los componentes de actividad de agentes en CircOS.
 * Inspirado en Paperclip's AgentActivityComponentLab.tsx.
 *
 * Componentes cubiertos:
 *   1. IssueChatThread family — pending port (@assistant-ui/react required)
 *   2. RunTranscriptView family — ✓ portado en run-transcript-view-full.tsx
 *   3. ActivityRow — ✓ portado en activity-row.tsx
 */

import { MessageSquare01, TerminalSquare, Route, ClockRewind } from '@untitledui/icons'
import { FlaskConical } from 'lucide-react'
import Link from 'next/link'
import { cx } from '@circos/ui'
import { RunTranscriptView } from '@/components/application/run-transcript-view-full'
import type { TranscriptEntry } from '@/components/application/run-transcript-view-full'
import { ActivityRow } from '@/components/application/activity-row'
import type { ActivityEvent, Agent } from '@/components/application/activity-row'

// ---------------------------------------------------------------------------
// Component catalog data
// ---------------------------------------------------------------------------

const componentGroups = [
  {
    title: 'Issue activity thread',
    mount: 'TaskDetail → IssueChatThread',
    route: '/ui/chat',
    description: 'Superficie principal de actividad conversacional. Compone comentarios, eventos de línea de tiempo, runs en vivo y el compositor. Requiere @assistant-ui/react.',
    status: 'pending' as const,
    items: [
      {
        name: 'IssueChatThread',
        file: 'components/application/issue-chat-thread.tsx',
        role: 'Renderizador de chat de nivel superior. Orquesta comentarios, eventos, runs en vivo y el compositor de respuesta.',
      },
      {
        name: 'IssueChatAssistantMessage',
        file: 'components/application/issue-chat-thread.tsx',
        role: 'Burbuja de agente. Contiene el header Working/Worked, estado de fold, acciones de feedback y partes respaldadas por transcript.',
      },
      {
        name: 'IssueChatChainOfThought',
        file: 'components/application/issue-chat-thread.tsx',
        role: 'Renderiza la unidad de razonamiento/herramienta agrupada dentro de un mensaje de asistente.',
      },
      {
        name: 'IssueChatReasoningPart',
        file: 'components/application/issue-chat-thread.tsx',
        role: 'Ticker animado de razonamiento de una línea usado mientras el agente está pensando.',
      },
      {
        name: 'IssueChatRollingToolPart',
        file: 'components/application/issue-chat-thread.tsx',
        role: 'Fila animada de herramienta actual durante trabajo activo (ej. "Executing command" durante run en vivo).',
      },
      {
        name: 'IssueChatToolPart',
        file: 'components/application/issue-chat-thread.tsx',
        role: 'Tarjeta de herramienta expandible usada después de que finaliza el run.',
      },
      {
        name: 'IssueChatSystemMessage',
        file: 'components/application/issue-chat-thread.tsx',
        role: 'Fila de timeline/sistema para asignación, estado y eventos de flujo de trabajo.',
      },
      {
        name: 'IssueChatUserMessage',
        file: 'components/application/issue-chat-thread.tsx',
        role: 'Burbuja de mensaje humano, incluyendo estados en cola y enviando.',
      },
    ],
  },
  {
    title: 'Run transcript surface',
    mount: 'AgentDetail / LiveRunWidget → RunTranscriptView',
    route: null,
    description: 'Renderizador compartido de transcript para actividad raw del run. Potencia el detalle de run y las superficies de run-en-vivo fuera del thread de chat.',
    status: 'ready' as const,
    items: [
      {
        name: 'RunTranscriptView',
        file: 'components/application/run-transcript-view-full.tsx',
        role: 'Parser y renderizador compartido de transcript. Soporta modos nice/raw, densidades comfortable/compact, y streaming.',
      },
      {
        name: 'TranscriptMessageBlock',
        file: 'components/application/run-transcript-view-full.tsx',
        role: 'Bloques de texto de asistente y usuario dentro del transcript.',
      },
      {
        name: 'TranscriptThinkingBlock',
        file: 'components/application/run-transcript-view-full.tsx',
        role: 'Bloque de razonamiento/thinking, expandible cuando está terminado.',
      },
      {
        name: 'TranscriptCommandGroup / TranscriptToolGroup',
        file: 'components/application/run-transcript-view-full.tsx',
        role: 'Filas de herramienta agrupadas para ejecución de comandos y otra actividad de herramientas.',
      },
      {
        name: 'TranscriptActivityRow / TranscriptEventRow',
        file: 'components/application/run-transcript-view-full.tsx',
        role: 'Fila pequeña para elementos de actividad del sistema y fila de evento/resultado resaltada.',
      },
    ],
  },
  {
    title: 'Board activity feed',
    mount: 'Activity → ActivityRow',
    route: null,
    description: 'Lista de actividad genérica a nivel de board. Menos conversacional que el chat de issue, parte de la familia activity-message en la UI.',
    status: 'ready' as const,
    items: [
      {
        name: 'ActivityRow',
        file: 'components/application/activity-row.tsx',
        role: 'Línea de actividad individual con actor, verbo, etiqueta de entidad y timestamp relativo.',
      },
    ],
  },
] as const

// ---------------------------------------------------------------------------
// Mock data — RunTranscriptView
// ---------------------------------------------------------------------------

const T = (offsetSeconds: number) => new Date(Date.now() - offsetSeconds * 1000).toISOString()

const TRANSCRIPT_PREVIEW: TranscriptEntry[] = [
  { kind: 'user', ts: T(110), text: 'Busca leads de consultoras tech en Madrid y crea un resumen.' },
  { kind: 'thinking', ts: T(100), text: 'Voy a buscar consultoras tech en Madrid. Ejecutaré web_search primero y luego organizaré los resultados.' },
  { kind: 'tool_call', ts: T(95), text: '', name: 'web_search', input: { query: 'consultoras tech Madrid 2026' }, toolUseId: 'tu_001' },
  { kind: 'tool_result', ts: T(90), text: '', toolUseId: 'tu_001', content: 'Everis (NTT Data), Accenture España, Indra, Minsait, NTT Data, Sopra Steria, Capgemini' },
  { kind: 'tool_call', ts: T(75), text: '', name: 'bash', input: { command: 'echo "Everis\\nAccenture\\nIndra\\nMinsait" > leads.txt && wc -l leads.txt' }, toolUseId: 'tu_002' },
  { kind: 'tool_result', ts: T(70), text: '', toolUseId: 'tu_002', content: 'command: bash\nstatus: completed\nexit_code: 0\n\n4 leads.txt' },
  { kind: 'assistant', ts: T(60), text: 'Encontré 7 consultoras tech principales en Madrid. Las más relevantes son Everis (NTT Data), Accenture España e Indra.' },
  { kind: 'result', ts: T(10), text: '7 leads encontrados y exportados.', isError: false, errors: [], inputTokens: 3200, outputTokens: 680, costUsd: 0.00391 },
]

// ---------------------------------------------------------------------------
// Mock data — ActivityRow
// ---------------------------------------------------------------------------

const ACTIVITY_AGENT_1: Agent = { id: 'agent-1', name: 'Kinger', icon: 'sparkles' }
const ACTIVITY_AGENT_2: Agent = { id: 'agent-2', name: 'Pomni', icon: 'brain' }

const ACTIVITY_AGENT_MAP = new Map<string, Agent>([
  [ACTIVITY_AGENT_1.id, ACTIVITY_AGENT_1],
  [ACTIVITY_AGENT_2.id, ACTIVITY_AGENT_2],
])

const ACTIVITY_ENTITY_NAMES = new Map<string, string>([
  ['card:card-ux', 'Audit prospect list'],
  ['agent:agent-1', 'Kinger'],
  ['agent:agent-2', 'Pomni'],
  ['approval:approval-1', 'Enviar propuesta a Accenture'],
])

const ACTIVITY_ENTITY_TITLES = new Map<string, string>([
  ['card:card-ux', 'Revisa todos los leads del Q2'],
])

const ACTIVITY_PREVIEW_EVENTS: ActivityEvent[] = [
  {
    id: 'activity-1',
    actorType: 'user',
    actorId: 'user-1',
    action: 'card.updated',
    entityType: 'card',
    entityId: 'card-ux',
    details: { status: 'in_review', _previous: { status: 'todo' } },
    createdAt: new Date(Date.now() - 9 * 60 * 1000),
  },
  {
    id: 'activity-2',
    actorType: 'agent',
    actorId: 'agent-1',
    action: 'heartbeat.invoked',
    entityType: 'heartbeat_run',
    entityId: 'run-live-1',
    agentId: 'agent-1',
    runId: 'run-live-1',
    details: { agentId: 'agent-1' },
    createdAt: new Date(Date.now() - 10 * 60 * 1000 + 30 * 1000),
  },
  {
    id: 'activity-3',
    actorType: 'system',
    actorId: 'system',
    action: 'approval.created',
    entityType: 'approval',
    entityId: 'approval-1',
    createdAt: new Date(Date.now() - 12 * 60 * 1000),
  },
  {
    id: 'activity-4',
    actorType: 'agent',
    actorId: 'agent-2',
    action: 'card.completed',
    entityType: 'card',
    entityId: 'card-ux',
    details: {},
    createdAt: new Date(Date.now() - 25 * 60 * 1000),
  },
]

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function StatusPill({ status }: { status: 'ready' | 'pending' }) {
  if (status === 'ready') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-success-secondary bg-success-secondary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-success-primary">
        <span className="h-1.5 w-1.5 rounded-full bg-success-solid" />
        Portado
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-warning-secondary bg-warning-secondary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-warning-primary">
      <span className="h-1.5 w-1.5 rounded-full bg-warning-solid" />
      Pendiente
    </span>
  )
}

function SurfaceCard({
  title,
  mount,
  route,
  description,
  status,
  items,
}: (typeof componentGroups)[number]) {
  return (
    <div className="rounded-2xl border border-secondary bg-primary/85">
      <div className="space-y-3 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-secondary bg-secondary px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-secondary">
            {mount}
          </span>
          <StatusPill status={status} />
          {route ? (
            <Link
              href={route}
              className="inline-flex items-center gap-1 rounded-full border border-secondary bg-primary/80 px-3 py-1 text-[11px] text-tertiary transition-colors hover:text-secondary"
            >
              Abrir ruta
              <Route className="h-3 w-3" />
            </Link>
          ) : null}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-primary">{title}</h2>
          <p className="mt-1.5 text-sm text-tertiary">{description}</p>
        </div>
      </div>
      <div className="space-y-2.5 px-5 pb-5">
        {items.map((item) => (
          <div
            key={`${title}:${item.name}`}
            className="rounded-xl border border-secondary bg-primary/80 px-4 py-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-medium text-primary text-sm">{item.name}</div>
              <code className="rounded bg-secondary px-1.5 py-0.5 text-[11px] text-tertiary">
                {item.file}
              </code>
            </div>
            <p className="mt-1.5 text-sm text-tertiary">{item.role}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function PreviewShell({
  title,
  description,
  icon: Icon,
  children,
  className,
}: {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={cx(
        'overflow-hidden rounded-[28px] border border-secondary bg-primary/80 shadow-[0_24px_60px_rgba(15,23,42,0.08)]',
        className,
      )}
    >
      <div className="border-b border-secondary px-5 py-4">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-tertiary">
          <Icon className="h-4 w-4 fg-brand-primary" />
          Preview
        </div>
        <h2 className="mt-2 text-lg font-semibold text-primary">{title}</h2>
        <p className="mt-1 text-sm text-tertiary">{description}</p>
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AgentActivityLabPage() {
  return (
    <div className="space-y-6 p-6">
      {/* Hero header */}
      <div className="overflow-hidden rounded-[32px] border border-secondary bg-[linear-gradient(135deg,rgba(68,76,231,0.12),transparent_28%),linear-gradient(180deg,rgba(68,76,231,0.08),transparent_44%)] shadow-[0_30px_80px_rgba(15,23,42,0.10)]">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_320px]">
          <div className="p-6 sm:p-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/[0.08] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-brand-secondary">
              <FlaskConical className="h-3.5 w-3.5" />
              Catálogo temporal de UI
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-primary">
              Componentes de actividad de agentes
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-tertiary">
              Storybook vive en <code className="rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary">packages/ui/.storybook/</code> (port 6006).
              Esta página temporal cataloga los componentes de actividad de agentes de CircOS y muestra previews
              en vivo respaldados por fixtures, sin necesitar datos reales de backend.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-secondary bg-secondary px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-tertiary">
                RunTranscriptView ✓ portado
              </span>
              <span className="inline-flex items-center rounded-full border border-secondary bg-secondary px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-tertiary">
                ActivityRow ✓ portado
              </span>
              <span className="inline-flex items-center rounded-full border border-secondary bg-secondary px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-tertiary">
                IssueChatThread ⏳ pendiente
              </span>
            </div>
          </div>

          <aside className="border-t border-secondary bg-primary/70 p-6 lg:border-l lg:border-t-0">
            <div className="space-y-3">
              <div className="rounded-xl border border-secondary bg-primary/85 px-4 py-3 text-sm text-tertiary">
                El thread conversacional se renderiza vía <code className="text-secondary">IssueChatThread</code> (familia de{' '}
                <code className="text-secondary">@assistant-ui/react</code>), no a través del feed genérico de actividad.
              </div>
              <div className="rounded-xl border border-secondary bg-primary/85 px-4 py-3 text-sm text-tertiary">
                Los labels <code className="text-secondary">Working</code>, <code className="text-secondary">Worked</code>,{' '}
                y <code className="text-secondary">Executing command</code> vienen de subcomponentes dentro de{' '}
                <code className="text-secondary">issue-chat-thread.tsx</code>.
              </div>
              <div className="rounded-xl border border-secondary bg-primary/85 px-4 py-3 text-sm text-tertiary">
                Esta ruta es temporal e intencional. No está enlazada desde el sidebar principal.
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Component catalog cards */}
      <div className="grid gap-6 xl:grid-cols-3">
        {componentGroups.map((group) => (
          <SurfaceCard key={group.title} {...group} />
        ))}
      </div>

      {/* Previews */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* RunTranscriptView preview */}
        <PreviewShell
          title="Run transcript renderer"
          description="RunTranscriptView en modo nice. Renderizador de bajo nivel usado por el detalle de run y las superficies de run-en-vivo."
          icon={TerminalSquare}
          className="bg-[linear-gradient(180deg,rgba(14,165,233,0.05),transparent_26%)]"
        >
          <div className="max-h-[480px] overflow-y-auto rounded-xl border border-secondary bg-primary/85 p-4">
            <RunTranscriptView
              entries={TRANSCRIPT_PREVIEW}
              mode="nice"
              density="comfortable"
              limit={12}
            />
          </div>
        </PreviewShell>

        {/* ActivityRow preview */}
        <PreviewShell
          title="Board activity rows"
          description="ActivityRow — filas del feed genérico de actividad del board con actor, verbo, entidad y timestamp."
          icon={ClockRewind}
          className="bg-[linear-gradient(180deg,rgba(245,158,11,0.06),transparent_24%)]"
        >
          <div className="overflow-hidden rounded-xl border border-secondary bg-primary/85">
            {ACTIVITY_PREVIEW_EVENTS.map((event) => (
              <ActivityRow
                key={event.id}
                event={event}
                agentMap={ACTIVITY_AGENT_MAP}
                entityNameMap={ACTIVITY_ENTITY_NAMES}
                entityTitleMap={ACTIVITY_ENTITY_TITLES}
              />
            ))}
          </div>
        </PreviewShell>
      </div>

      {/* IssueChatThread pending port */}
      <section className="overflow-hidden rounded-[28px] border border-secondary bg-[linear-gradient(180deg,rgba(68,76,231,0.05),transparent_26%)] shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
        <div className="border-b border-secondary px-5 py-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-tertiary">
            <MessageSquare01 className="h-4 w-4 fg-brand-primary" />
            Pendiente de port
          </div>
          <h2 className="mt-2 text-lg font-semibold text-primary">Issue chat thread</h2>
          <p className="mt-1 text-sm text-tertiary">
            Preview en vivo de IssueChatThread — estados de ejecución en vivo, razonamiento, herramientas y mensajes en cola.
          </p>
        </div>
        <div className="p-5">
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-secondary bg-primary/60 px-6 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-secondary bg-secondary">
              <MessageSquare01 className="h-6 w-6 text-tertiary" />
            </div>
            <div>
              <p className="font-semibold text-primary">IssueChatThread — pendiente de port</p>
              <p className="mt-1.5 max-w-sm text-sm text-tertiary">
                Este componente requiere <code className="rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary">@assistant-ui/react</code> y un
                runtime hook adaptado al schema de CircOS (Supabase Realtime + cards).
                El archivo copiado está en{' '}
                <code className="text-secondary">components/application/issue-chat-thread.tsx</code>.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 text-[11px] text-tertiary">
              <span className="rounded-full border border-secondary bg-secondary px-3 py-1">
                1. npm install @assistant-ui/react
              </span>
              <span className="rounded-full border border-secondary bg-secondary px-3 py-1">
                2. Adaptar usePaperclipIssueRuntime → useCircOSTaskRuntime
              </span>
              <span className="rounded-full border border-secondary bg-secondary px-3 py-1">
                3. Adaptar tipos @paperclipai/shared → CircOS
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
