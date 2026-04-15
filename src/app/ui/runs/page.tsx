'use client'

/**
 * /ui/runs — Run Transcript UX Lab
 *
 * Lab interactivo para RunTranscriptView con fixtures de CircOS.
 * Replica de Paperclip's RunTranscriptUxLab.tsx.
 *
 * 3 superficies seleccionables:
 *   - Run Detail     — transcript completo con toggle Nice/Raw
 *   - Issue Widget   — stream en vivo compacto para el task detail page
 *   - Dashboard Card — card densa para el dashboard de agentes activos
 */

import { useState } from 'react'
import { cx } from '@circos/ui'
import { Monitor01, LayoutLeft } from '@untitledui/icons'
import { FlaskConical, RadioTower } from 'lucide-react'
import Link from 'next/link'
import { RunTranscriptView } from '@/components/application/run-transcript-view-full'
import type { TranscriptEntry, TranscriptMode, TranscriptDensity } from '@/components/application/run-transcript-view-full'

// ---------------------------------------------------------------------------
// Fixtures — run real de CircOS (sanitizado)
// ---------------------------------------------------------------------------

const T = (offsetSeconds: number) => new Date(Date.now() - offsetSeconds * 1000).toISOString()

const FIXTURE_META = {
  agentName: 'Kinger',
  agentRole: 'Prospector',
  sourceRunId: 'run-a3f9d2c1-7b4e',
  issueIdentifier: 'CIRC-47',
  issueTitle: 'Buscar leads tech consultoras Madrid Q2',
  startedAt: new Date(Date.now() - 142 * 1000),
}

const FIXTURE_ENTRIES: TranscriptEntry[] = [
  {
    kind: 'user',
    ts: T(142),
    text: 'Busca consultoras tech en Madrid con más de 200 empleados. Crea un resumen con nombre, tamaño estimado y web.',
  },
  {
    kind: 'thinking',
    ts: T(135),
    text: 'Necesito buscar consultoras tech en Madrid. Voy a usar web_search para obtener una lista inicial, luego filtrar por tamaño y construir el resumen.',
  },
  {
    kind: 'tool_call',
    ts: T(130),
    text: '',
    name: 'web_search',
    input: { query: 'consultoras tecnología Madrid más de 200 empleados 2026' },
    toolUseId: 'tu_001',
  },
  {
    kind: 'tool_result',
    ts: T(120),
    text: '',
    toolUseId: 'tu_001',
    content:
      'Everis/NTT Data (4000 emp, everis.com), Accenture España (8000 emp, accenture.com/es), Indra (12000 emp, indra.es), Minsait (6500 emp, minsait.com), Sopra Steria (2300 emp, soprasteria.es), Capgemini (3100 emp, capgemini.com/es)',
  },
  {
    kind: 'thinking',
    ts: T(115),
    text: 'Tengo 6 empresas. Voy a verificar los sitios web y filtrar las que tienen sede principal en Madrid.',
  },
  {
    kind: 'tool_call',
    ts: T(110),
    text: '',
    name: 'web_search',
    input: { query: 'Minsait sede Madrid oficina central' },
    toolUseId: 'tu_002',
  },
  {
    kind: 'tool_result',
    ts: T(100),
    text: '',
    toolUseId: 'tu_002',
    content: 'Minsait (Indra) tiene sede central en Madrid, Avenida de Bruselas 35, Alcobendas.',
  },
  {
    kind: 'tool_call',
    ts: T(95),
    text: '',
    name: 'bash',
    input: {
      command:
        'cat << EOF > leads_madrid.md\n# Leads Madrid Q2\n\n| Empresa | Empleados | Web |\n|---|---|---|\n| Everis/NTT Data | ~4000 | everis.com |\n| Accenture España | ~8000 | accenture.com/es |\n| Indra | ~12000 | indra.es |\n| Minsait | ~6500 | minsait.com |\n| Sopra Steria | ~2300 | soprasteria.es |\n| Capgemini | ~3100 | capgemini.com/es |\nEOF\necho "Archivo generado" && wc -l leads_madrid.md',
    },
    toolUseId: 'tu_003',
  },
  {
    kind: 'tool_result',
    ts: T(85),
    text: '',
    toolUseId: 'tu_003',
    content: 'command: bash\nstatus: completed\nexit_code: 0\n\nArchivo generado\n10 leads_madrid.md',
  },
  {
    kind: 'assistant',
    ts: T(70),
    text: 'He identificado 6 consultoras tech en Madrid con más de 200 empleados:\n\n- **Everis/NTT Data** — ~4.000 emp — everis.com\n- **Accenture España** — ~8.000 emp — accenture.com/es\n- **Indra** — ~12.000 emp — indra.es\n- **Minsait** — ~6.500 emp — minsait.com\n- **Sopra Steria** — ~2.300 emp — soprasteria.es\n- **Capgemini** — ~3.100 emp — capgemini.com/es\n\nEl resumen se guardó en `leads_madrid.md`.',
  },
  {
    kind: 'result',
    ts: T(10),
    text: '6 leads encontrados y exportados a leads_madrid.md.',
    isError: false,
    errors: [],
    inputTokens: 4100,
    outputTokens: 820,
    costUsd: 0.00512,
  },
]

// ---------------------------------------------------------------------------
// Surface options
// ---------------------------------------------------------------------------

type SurfaceId = 'detail' | 'live' | 'dashboard'

const SURFACE_OPTIONS: Array<{
  id: SurfaceId
  eyebrow: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  {
    id: 'detail',
    eyebrow: 'Full transcript',
    label: 'Run Detail',
    description: 'Vista completa del run con toggle Nice/Raw y el transcript más inspeccionable.',
    icon: Monitor01,
  },
  {
    id: 'live',
    eyebrow: 'Live stream',
    label: 'Issue Widget',
    description: 'Widget de run en vivo del issue detail, optimizado para seguir un run activo sin salir del task page.',
    icon: RadioTower,
  },
  {
    id: 'dashboard',
    eyebrow: 'Dense card',
    label: 'Dashboard Card',
    description: 'Card de agentes activos del dashboard, afinada para escaneo compacto.',
    icon: LayoutLeft,
  },
]

function previewEntries(surface: SurfaceId): TranscriptEntry[] {
  if (surface === 'dashboard') return FIXTURE_ENTRIES.slice(-9)
  if (surface === 'live') return FIXTURE_ENTRIES.slice(-14)
  return FIXTURE_ENTRIES
}

// ---------------------------------------------------------------------------
// Surface previews
// ---------------------------------------------------------------------------

function RunDetailPreview({
  mode,
  streaming,
  density,
}: {
  mode: TranscriptMode
  streaming: boolean
  density: TranscriptDensity
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-secondary bg-primary/80 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
      <div className="border-b border-secondary bg-primary/90 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-secondary bg-secondary px-3 py-0.5 text-[10px] uppercase tracking-[0.18em] text-tertiary">
            Run Detail
          </span>
          <span
            className={cx(
              'rounded-full px-3 py-0.5 text-[10px] uppercase tracking-[0.18em]',
              streaming
                ? 'border border-warning-secondary bg-warning-secondary/10 text-warning-primary'
                : 'border border-success-secondary bg-success-secondary/10 text-success-primary',
            )}
          >
            {streaming ? 'Running' : 'Succeeded'}
          </span>
          <span className="text-xs text-tertiary">
            {FIXTURE_META.startedAt.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
          </span>
        </div>
        <div className="mt-2 text-sm font-medium text-primary">
          Transcript ({FIXTURE_ENTRIES.length} entradas)
        </div>
      </div>
      <div className="max-h-[720px] overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(68,76,231,0.06),transparent_36%)] p-5">
        <RunTranscriptView
          entries={FIXTURE_ENTRIES}
          mode={mode}
          density={density}
          streaming={streaming}
        />
      </div>
    </div>
  )
}

function LiveWidgetPreview({
  streaming,
  mode,
  density,
}: {
  streaming: boolean
  mode: TranscriptMode
  density: TranscriptDensity
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-brand/25 bg-primary/85 shadow-[0_20px_50px_rgba(68,76,231,0.10)]">
      <div className="border-b border-secondary bg-brand/[0.04] px-5 py-4">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-secondary">
          Live Runs
        </div>
        <div className="mt-1 text-xs text-tertiary">
          Stream compacto en vivo para el task detail page.
        </div>
      </div>
      <div className="px-5 py-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-medium text-primary">{FIXTURE_META.agentName}</div>
            <div className="mt-1 text-xs text-tertiary">{FIXTURE_META.agentRole}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-tertiary">
              <span className="rounded-full border border-secondary bg-secondary px-2 py-0.5 font-mono">
                {FIXTURE_META.sourceRunId.slice(0, 8)}
              </span>
              <span
                className={cx(
                  'rounded-full px-2 py-0.5 text-[10px]',
                  streaming
                    ? 'border border-warning-secondary bg-warning-secondary/10 text-warning-primary'
                    : 'border border-success-secondary bg-success-secondary/10 text-success-primary',
                )}
              >
                {streaming ? 'Running' : 'Succeeded'}
              </span>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-secondary bg-secondary px-2.5 py-1 text-[11px] text-tertiary">
            Abrir run →
          </span>
        </div>
        <div className="max-h-[460px] overflow-y-auto pr-1">
          <RunTranscriptView
            entries={previewEntries('live')}
            mode={mode}
            density={density}
            limit={density === 'compact' ? 10 : 12}
            streaming={streaming}
          />
        </div>
      </div>
    </div>
  )
}

function DashboardPreview({
  streaming,
  mode,
  density,
}: {
  streaming: boolean
  mode: TranscriptMode
  density: TranscriptDensity
}) {
  return (
    <div className="max-w-md">
      <div
        className={cx(
          'flex h-[320px] flex-col overflow-hidden rounded-xl border shadow-[0_20px_40px_rgba(15,23,42,0.10)]',
          streaming ? 'border-brand/25 bg-brand/[0.04]' : 'border-secondary bg-primary/75',
        )}
      >
        <div className="border-b border-secondary px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={cx(
                    'inline-flex h-2.5 w-2.5 rounded-full',
                    streaming ? 'bg-brand shadow-[0_0_0_6px_rgba(68,76,231,0.12)]' : 'bg-quaternary',
                  )}
                />
                <span className="text-sm font-medium text-primary">{FIXTURE_META.agentName}</span>
              </div>
              <div className="mt-2 text-[11px] text-tertiary">
                {streaming ? 'En vivo ahora' : 'Terminó hace 2m'}
              </div>
            </div>
            <span className="rounded-full border border-secondary bg-secondary px-2 py-1 text-[10px] text-tertiary">
              →
            </span>
          </div>
          <div className="mt-3 rounded-lg border border-brand/20 bg-brand/[0.06] px-3 py-2 text-xs text-brand-secondary">
            {FIXTURE_META.issueIdentifier} — {FIXTURE_META.issueTitle}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <RunTranscriptView
            entries={previewEntries('dashboard')}
            mode={mode}
            density={density}
            limit={density === 'compact' ? 6 : 8}
            streaming={streaming}
          />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function RunTranscriptLabPage() {
  const [selectedSurface, setSelectedSurface] = useState<SurfaceId>('detail')
  const [mode, setMode] = useState<TranscriptMode>('nice')
  const [streaming, setStreaming] = useState(true)
  const [density, setDensity] = useState<TranscriptDensity>('comfortable')

  const selected = SURFACE_OPTIONS.find((o) => o.id === selectedSurface) ?? SURFACE_OPTIONS[0]

  return (
    <div className="space-y-6 p-6">
      <div className="overflow-hidden rounded-[28px] border border-secondary bg-[linear-gradient(135deg,rgba(68,76,231,0.08),transparent_28%),linear-gradient(180deg,rgba(68,76,231,0.05),transparent_40%)] shadow-[0_28px_70px_rgba(15,23,42,0.10)]">
        <div className="grid gap-0 lg:grid-cols-[260px_minmax(0,1fr)]">

          {/* Sidebar — surface selector */}
          <aside className="border-b border-secondary bg-primary/75 p-5 lg:border-b-0 lg:border-r">
            <div className="mb-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/[0.08] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-brand-secondary">
                <FlaskConical className="h-3.5 w-3.5" />
                UX Lab
              </div>
              <h1 className="mt-4 text-xl font-semibold tracking-tight text-primary">
                Run Transcript Fixtures
              </h1>
              <p className="mt-2 text-sm text-tertiary">
                Construido desde un run real de CircOS sanitizado. Sin secretos, paths locales ni variables de entorno.
              </p>
              <Link
                href="/ui"
                className="mt-3 inline-flex items-center gap-1 text-xs text-tertiary hover:text-secondary transition-colors"
              >
                ← Volver al índice
              </Link>
            </div>

            <div className="space-y-2">
              {SURFACE_OPTIONS.map((option) => {
                const Icon = option.icon
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSelectedSurface(option.id)}
                    className={cx(
                      'w-full rounded-xl border px-4 py-3 text-left transition-all',
                      selectedSurface === option.id
                        ? 'border-brand/35 bg-brand/[0.10] shadow-[0_12px_24px_rgba(68,76,231,0.12)]'
                        : 'border-secondary bg-primary/70 hover:border-brand/20 hover:bg-brand/[0.04]',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cx(
                          'rounded-lg border p-2 transition-colors',
                          selectedSurface === option.id
                            ? 'border-brand/20 text-brand-secondary'
                            : 'border-secondary text-tertiary',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-tertiary">
                          {option.eyebrow}
                        </span>
                        <span className="mt-1 block text-sm font-medium text-primary">{option.label}</span>
                        <span className="mt-1 block text-xs text-tertiary">{option.description}</span>
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </aside>

          {/* Main — preview */}
          <main className="min-w-0 p-5">
            <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-tertiary">
                  {selected.eyebrow}
                </div>
                <h2 className="mt-1 text-xl font-semibold text-primary">{selected.label}</h2>
                <p className="mt-2 max-w-2xl text-sm text-tertiary">{selected.description}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-secondary bg-secondary px-3 py-0.5 text-[10px] uppercase tracking-[0.18em] text-tertiary">
                  {FIXTURE_META.sourceRunId.slice(0, 8)}
                </span>
                <span className="rounded-full border border-secondary bg-secondary px-3 py-0.5 text-[10px] uppercase tracking-[0.18em] text-tertiary">
                  {FIXTURE_META.issueIdentifier}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-tertiary">
                Controles
              </span>

              {/* Mode toggle */}
              <div className="inline-flex rounded-full border border-secondary bg-primary/80 p-1">
                {(['nice', 'raw'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={cx(
                      'rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors',
                      mode === m ? 'bg-active text-primary' : 'text-tertiary hover:text-secondary',
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {/* Density toggle */}
              <div className="inline-flex rounded-full border border-secondary bg-primary/80 p-1">
                {(['comfortable', 'compact'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDensity(d)}
                    className={cx(
                      'rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors',
                      density === d ? 'bg-active text-primary' : 'text-tertiary hover:text-secondary',
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>

              {/* Streaming toggle */}
              <button
                type="button"
                onClick={() => setStreaming((v) => !v)}
                className="inline-flex items-center gap-2 rounded-full border border-secondary bg-primary/80 px-3 py-1.5 text-xs text-tertiary transition-colors hover:text-secondary"
              >
                {streaming ? 'Ver estado asentado' : 'Ver estado streaming'}
              </button>
            </div>

            {/* Surface preview */}
            {selectedSurface === 'detail' ? (
              <RunDetailPreview mode={mode} streaming={streaming} density={density} />
            ) : selectedSurface === 'live' ? (
              <LiveWidgetPreview streaming={streaming} mode={mode} density={density} />
            ) : (
              <DashboardPreview streaming={streaming} mode={mode} density={density} />
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
