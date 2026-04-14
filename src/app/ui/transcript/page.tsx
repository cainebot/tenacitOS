'use client'

/**
 * /ui/transcript — Preview page for RunTranscriptView variants
 *
 * Shows every block type with mock data:
 *   message (user + assistant), thinking, tool (running/completed/error),
 *   command_group (running/completed/error), tool_group,
 *   activity (running/completed), event (info/warn/error/neutral),
 *   diff_group, stderr_group, system_group, stdout, empty state, raw mode
 */

import { useState } from 'react'
import { cx } from '@circos/ui'
import { RunTranscriptView } from '@/components/application/run-transcript-view-full'
import type { TranscriptEntry, TranscriptDensity, TranscriptMode } from '@/components/application/run-transcript-view-full'

// ---------------------------------------------------------------------------
// Mock data sets
// ---------------------------------------------------------------------------

const NOW = new Date().toISOString()
const T = (offset: number) => new Date(Date.now() - offset * 1000).toISOString()

const MOCK_FULL: TranscriptEntry[] = [
  // Init
  { kind: 'init', ts: T(120), text: '', model: 'claude-sonnet-4-6', sessionId: 'sess_abc123' },

  // User message
  { kind: 'user', ts: T(110), text: 'Busca leads de consultoras tech en Madrid y crea un resumen.' },

  // Assistant thinking
  { kind: 'thinking', ts: T(100), text: 'Voy a buscar leads en LinkedIn y otras fuentes. Primero ejecutaré una búsqueda web para encontrar consultoras tech en Madrid. Luego organizaré los resultados.' },

  // Tool call: web search (tool_group candidate)
  { kind: 'tool_call', ts: T(95), text: '', name: 'web_search', input: { query: 'consultoras tech Madrid 2025' }, toolUseId: 'tu_001' },
  { kind: 'tool_result', ts: T(90), text: '', toolUseId: 'tu_001', content: 'Everis, Accenture España, Indra, Minsait, NTT Data, Sopra Steria, Capgemini, Atos' },

  // Tool call: another tool (will group with above into tool_group)
  { kind: 'tool_call', ts: T(88), text: '', name: 'web_search', input: { query: 'top IT consultancies Madrid LinkedIn' }, toolUseId: 'tu_002' },
  { kind: 'tool_result', ts: T(84), text: '', toolUseId: 'tu_002', content: 'Deloitte Digital, KPMG Technology, PwC Advisory, EY Technology' },

  // Assistant message
  { kind: 'assistant', ts: T(80), text: 'Encontré varias consultoras. Voy a ejecutar un comando para formatear los datos.' },

  // Command group: running then completed
  { kind: 'tool_call', ts: T(75), text: '', name: 'bash', input: { command: 'echo "Everis\\nAccenture\\nIndra\\nMinsait" > leads.txt && wc -l leads.txt' }, toolUseId: 'tu_003' },
  { kind: 'tool_result', ts: T(70), text: '', toolUseId: 'tu_003', content: 'command: bash\nstatus: completed\nexit_code: 0\n\n4 leads.txt' },

  // Command with error
  { kind: 'tool_call', ts: T(68), text: '', name: 'bash', input: { command: 'cat /nonexistent/file.txt' }, toolUseId: 'tu_004' },
  { kind: 'tool_result', ts: T(65), text: '', toolUseId: 'tu_004', content: 'command: cat\nstatus: failed\nexit_code: 1\n\ncat: /nonexistent/file.txt: No such file or directory', isError: true },

  // System activity
  { kind: 'system', ts: T(60), text: 'item started: linkedin-scraper (id=act_001)' },
  { kind: 'system', ts: T(55), text: 'item completed: linkedin-scraper (id=act_001)' },

  // Diff
  { kind: 'diff', ts: T(50), text: 'leads.txt', changeType: 'file_header' },
  { kind: 'diff', ts: T(50), text: '@@ -0,0 +1,4 @@', changeType: 'hunk' },
  { kind: 'diff', ts: T(50), text: 'Everis', changeType: 'add' },
  { kind: 'diff', ts: T(50), text: 'Accenture', changeType: 'add' },
  { kind: 'diff', ts: T(50), text: 'Indra', changeType: 'add' },
  { kind: 'diff', ts: T(50), text: 'Minsait', changeType: 'add' },

  // Stdout
  { kind: 'stdout', ts: T(45), text: 'Processing leads...\nFound 8 companies\nExporting to CSV' },

  // Stderr
  { kind: 'stderr', ts: T(40), text: 'Warning: rate limit approaching (80%)' },
  { kind: 'stderr', ts: T(39), text: 'Warning: 2 duplicate entries removed' },

  // System messages
  { kind: 'system', ts: T(35), text: 'Cache cleared' },
  { kind: 'system', ts: T(34), text: 'Session checkpoint saved' },

  // Event: info
  { kind: 'result', ts: T(10), text: 'Análisis completado. 8 leads encontrados y exportados.', isError: false, errors: [], inputTokens: 4200, outputTokens: 890, costUsd: 0.00512 },
]

const MOCK_RUNNING: TranscriptEntry[] = [
  { kind: 'user', ts: T(30), text: '¿Cuál es el estado del pipeline de ventas?' },
  { kind: 'thinking', ts: T(25), text: 'Voy a revisar el CRM y calcular las métricas del pipeline...', delta: true },
  { kind: 'tool_call', ts: T(20), text: '', name: 'bash', input: { command: 'psql $DATABASE_URL -c "SELECT count(*) FROM leads WHERE stage=\'qualified\'"' }, toolUseId: 'tu_live_001' },
  // No tool_result → status stays 'running'
]

const MOCK_ERROR_EVENT: TranscriptEntry[] = [
  { kind: 'user', ts: T(20), text: 'Ejecuta el enriquecimiento de datos' },
  { kind: 'assistant', ts: T(15), text: 'Iniciando proceso de enriquecimiento...' },
  { kind: 'result', ts: T(5), text: 'Connection timeout after 30s', isError: true, errors: ['ECONNREFUSED 127.0.0.1:5432'], inputTokens: 800, outputTokens: 120, costUsd: 0.00041 },
]

const MOCK_EMPTY: TranscriptEntry[] = []

// ---------------------------------------------------------------------------
// Preview page
// ---------------------------------------------------------------------------

const SECTIONS = [
  { id: 'full', label: 'Full transcript (all block types)' },
  { id: 'running', label: 'Running / streaming state' },
  { id: 'error', label: 'Error result' },
  { id: 'empty', label: 'Empty state' },
  { id: 'raw', label: 'Raw mode' },
  { id: 'compact', label: 'Compact density' },
] as const

type SectionId = typeof SECTIONS[number]['id']

export default function TranscriptPreviewPage() {
  const [activeSection, setActiveSection] = useState<SectionId>('full')
  const [density, setDensity] = useState<TranscriptDensity>('comfortable')
  const [mode, setMode] = useState<TranscriptMode>('nice')

  const getEntries = () => {
    if (activeSection === 'running') return MOCK_RUNNING
    if (activeSection === 'error') return MOCK_ERROR_EVENT
    if (activeSection === 'empty') return MOCK_EMPTY
    if (activeSection === 'raw') return MOCK_FULL
    return MOCK_FULL
  }

  const getMode = (): TranscriptMode => {
    if (activeSection === 'raw') return 'raw'
    return mode
  }

  const getDensity = (): TranscriptDensity => {
    if (activeSection === 'compact') return 'compact'
    return density
  }

  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <div className="border-b border-secondary bg-primary sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-primary">Transcript Components</h1>
              <p className="text-xs text-tertiary">RunTranscriptView — all block variants</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Mode toggle */}
              <div className="flex items-center gap-1 rounded-lg border border-secondary bg-secondary p-0.5 text-xs">
                {(['nice', 'raw'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={cx(
                      'rounded-md px-2.5 py-1 font-medium capitalize transition-colors',
                      mode === m && activeSection !== 'raw'
                        ? 'bg-primary text-primary shadow-sm'
                        : 'text-tertiary hover:text-secondary',
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
              {/* Density toggle */}
              <div className="flex items-center gap-1 rounded-lg border border-secondary bg-secondary p-0.5 text-xs">
                {(['comfortable', 'compact'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDensity(d)}
                    className={cx(
                      'rounded-md px-2.5 py-1 font-medium capitalize transition-colors',
                      density === d
                        ? 'bg-primary text-primary shadow-sm'
                        : 'text-tertiary hover:text-secondary',
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {/* Section nav */}
          <div className="mt-3 flex gap-1 overflow-x-auto">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={cx(
                  'shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  activeSection === section.id
                    ? 'bg-brand-solid text-white'
                    : 'text-tertiary hover:bg-secondary hover:text-secondary',
                )}
              >
                {section.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Individual block showcases when viewing 'full' */}
        {activeSection === 'full' && (
          <div className="mb-8 grid gap-4">
            <SectionLabel>Block: message (user)</SectionLabel>
            <RunTranscriptView density={getDensity()} mode={getMode()} entries={[{ kind: 'user', ts: T(0), text: 'Busca los mejores leads en Madrid para consultoras tech.' }]} />

            <SectionLabel>Block: message (assistant)</SectionLabel>
            <RunTranscriptView density={getDensity()} mode={getMode()} entries={[{ kind: 'assistant', ts: T(0), text: 'Voy a analizar el mercado de consultoras tech en Madrid. Comenzaré con una búsqueda exhaustiva de LinkedIn y Glassdoor.' }]} />

            <SectionLabel>Block: thinking (streaming — loader activo)</SectionLabel>
            <RunTranscriptView density={getDensity()} mode={getMode()} streaming
              entries={[{ kind: 'thinking', ts: T(0), text: 'Analizando el pipeline de ventas...', delta: true }]} />

            <SectionLabel>Block: thinking (completado — expandible)</SectionLabel>
            <RunTranscriptView density={getDensity()} mode={getMode()}
              entries={[{ kind: 'thinking', ts: T(0), text: 'Necesito buscar consultoras tech en Madrid. Las principales son Everis, Accenture, Indra y Minsait. Voy a verificar su presencia en LinkedIn y extraer contactos relevantes del área de ventas y tecnología.' }]} />

            <SectionLabel>Block: tool (running)</SectionLabel>
            <RunTranscriptView density={getDensity()} mode={getMode()} entries={[{ kind: 'tool_call', ts: T(0), text: '', name: 'web_search', input: { query: 'consultoras tech Madrid LinkedIn 2025' }, toolUseId: 'p1' }]} />

            <SectionLabel>Block: tool (completed)</SectionLabel>
            <RunTranscriptView density={getDensity()} mode={getMode()} entries={[
              { kind: 'tool_call', ts: T(5), text: '', name: 'web_search', input: { query: 'consultoras tech Madrid' }, toolUseId: 'p2' },
              { kind: 'tool_result', ts: T(0), text: '', toolUseId: 'p2', content: 'Everis (NTT Data), Accenture España, Indra, Minsait, Capgemini, Sopra Steria — all headquartered in Madrid.' },
            ]} />

            <SectionLabel>Block: tool (error)</SectionLabel>
            <RunTranscriptView density={getDensity()} mode={getMode()} entries={[
              { kind: 'tool_call', ts: T(5), text: '', name: 'file_read', input: { path: '/private/secrets.txt' }, toolUseId: 'p3' },
              { kind: 'tool_result', ts: T(0), text: '', toolUseId: 'p3', content: 'Permission denied: /private/secrets.txt', isError: true },
            ]} />

            <SectionLabel>Block: command_group (running — "Executing command")</SectionLabel>
            <RunTranscriptView density={getDensity()} mode={getMode()} entries={[
              { kind: 'tool_call', ts: T(10), text: '', name: 'bash', input: { command: 'git log --oneline -10' }, toolUseId: 'c1' },
              // No result → running
            ]} streaming />

            <SectionLabel>Block: command_group (completed — "Executed 2 commands")</SectionLabel>
            <RunTranscriptView density={getDensity()} mode={getMode()} entries={[
              { kind: 'tool_call', ts: T(10), text: '', name: 'bash', input: { command: 'ls -la src/' }, toolUseId: 'c2' },
              { kind: 'tool_result', ts: T(8), text: '', toolUseId: 'c2', content: 'command: ls\nstatus: completed\nexit_code: 0\n\ntotal 48\ndrwxr-xr-x  12 user  staff   384 Apr 13 18:30 .\n-rw-r--r--   1 user  staff  1024 Apr 13 18:30 adapters.ts' },
              { kind: 'tool_call', ts: T(6), text: '', name: 'bash', input: { command: 'npx tsc --noEmit 2>&1 | tail -5' }, toolUseId: 'c3' },
              { kind: 'tool_result', ts: T(2), text: '', toolUseId: 'c3', content: 'command: npx tsc\nstatus: completed\nexit_code: 0\n\nFound 0 errors. Watching for file changes.' },
            ]} />

            <SectionLabel>Block: activity (running + completed)</SectionLabel>
            <RunTranscriptView density={getDensity()} mode={getMode()} entries={[
              { kind: 'system', ts: T(10), text: 'item started: linkedin-scraper (id=act_001)' },
              { kind: 'system', ts: T(5), text: 'item completed: linkedin-scraper (id=act_001)' },
              { kind: 'system', ts: T(3), text: 'item started: data-enrichment (id=act_002)' },
            ]} />

            <SectionLabel>Block: event (info / warn / error)</SectionLabel>
            <RunTranscriptView density={getDensity()} mode={getMode()} entries={[
              { kind: 'result', ts: T(10), text: 'Proceso completado con éxito', isError: false, errors: [], inputTokens: 4200, outputTokens: 890, costUsd: 0.00512 },
              { kind: 'result', ts: T(5), text: 'Rate limit exceeded', isError: true, errors: ['429 Too Many Requests'], inputTokens: 200, outputTokens: 30, costUsd: 0.00021 },
            ]} />

            <SectionLabel>Block: diff_group</SectionLabel>
            <RunTranscriptView density={getDensity()} mode={getMode()} entries={[
              { kind: 'diff', ts: T(5), text: 'src/lib/adapters.ts', changeType: 'file_header' },
              { kind: 'diff', ts: T(5), text: '@@ -225,6 +225,10 @@', changeType: 'hunk' },
              { kind: 'diff', ts: T(5), text: '  attachment_remove: \'attachment_remove\',', changeType: 'context' },
              { kind: 'diff', ts: T(5), text: '  tool_use: \'tool_use\',', changeType: 'add' },
              { kind: 'diff', ts: T(5), text: '  tool_result: \'tool_result\',', changeType: 'add' },
              { kind: 'diff', ts: T(5), text: '  thinking: \'thinking\',', changeType: 'add' },
              { kind: 'diff', ts: T(5), text: '  error: \'error\',', changeType: 'add' },
              { kind: 'diff', ts: T(5), text: '}', changeType: 'context' },
            ]} />

            <SectionLabel>Block: stderr_group</SectionLabel>
            <RunTranscriptView density={getDensity()} mode={getMode()} entries={[
              { kind: 'stderr', ts: T(5), text: 'Warning: rate limit approaching (80%)' },
              { kind: 'stderr', ts: T(4), text: 'Warning: 2 duplicate entries skipped' },
              { kind: 'stderr', ts: T(3), text: 'DeprecationWarning: old API endpoint /v1/leads used' },
            ]} />

            <SectionLabel>Block: system_group</SectionLabel>
            <RunTranscriptView density={getDensity()} mode={getMode()} entries={[
              { kind: 'system', ts: T(5), text: 'Session checkpoint saved' },
              { kind: 'system', ts: T(4), text: 'Cache invalidated' },
              { kind: 'system', ts: T(3), text: 'Context window: 68% used' },
            ]} />

            <SectionLabel>Block: stdout</SectionLabel>
            <RunTranscriptView density={getDensity()} mode={getMode()} entries={[
              { kind: 'stdout', ts: T(0), text: 'Processing 8 leads...\nEveris → enriched\nAccenture → enriched\nIndra → rate limited, retry in 2s\nMinsait → enriched\nAll done.' },
            ]} />
          </div>
        )}

        {/* Full RunTranscriptView with selected scenario */}
        <div className={cx(activeSection === 'full' && 'mt-8')}>
          {activeSection === 'full' && <SectionLabel>Complete conversation (normalizeTranscript)</SectionLabel>}
          <div className="rounded-2xl border border-secondary bg-primary p-6">
            <RunTranscriptView
              entries={getEntries()}
              mode={getMode()}
              density={getDensity()}
              streaming={activeSection === 'running'}
              emptyMessage="Sin actividad del agente todavía."
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-quaternary">{children}</span>
      <div className="h-px flex-1 bg-secondary" />
    </div>
  )
}
