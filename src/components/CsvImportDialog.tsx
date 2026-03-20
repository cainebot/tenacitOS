'use client'

import { useState, useRef, useCallback } from 'react'
import type { CardType } from '@/types/workflow'

interface CsvImportDialogProps {
  boardId: string
  workflowId: string
  stateId: string
  defaultCardType: CardType
  onImportComplete: () => void
  onClose: () => void
}

interface CsvMapping {
  title: string
  description: string
  priority: string
  labels: string
  assigned_agent_id: string
  due_date: string
}

type Step = 'select' | 'map' | 'result'

interface ImportResult {
  imported: number
  errors: { row: number; message: string }[]
}

function parseCsvText(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length === 0) return { headers: [], rows: [] }

  const parseRow = (line: string): string[] => {
    const result: string[] = []
    let inQuote = false
    let current = ''
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuote = !inQuote
        }
      } else if (ch === ',' && !inQuote) {
        result.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    result.push(current.trim())
    return result
  }

  const headers = parseRow(lines[0])
  const rows = lines.slice(1).map(parseRow)
  return { headers, rows }
}

function autoDetectTitleColumn(headers: string[]): string {
  const candidates = ['title', 'name', 'subject', 'task', 'card']
  for (const candidate of candidates) {
    const match = headers.find((h) => h.toLowerCase() === candidate)
    if (match) return match
  }
  return headers[0] ?? ''
}

export function CsvImportDialog({
  boardId: _boardId,
  workflowId,
  stateId,
  defaultCardType,
  onImportComplete,
  onClose,
}: CsvImportDialogProps) {
  const [step, setStep] = useState<Step>('select')
  const [file, setFile] = useState<File | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<CsvMapping>({
    title: '',
    description: '',
    priority: '',
    labels: '',
    assigned_agent_id: '',
    due_date: '',
  })
  const [isDragOver, setIsDragOver] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback((f: File) => {
    setFile(f)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const { headers: h, rows: r } = parseCsvText(text)
      setHeaders(h)
      setRows(r)
      const detectedTitle = autoDetectTitleColumn(h)
      setMapping({
        title: detectedTitle,
        description: '',
        priority: '',
        labels: '',
        assigned_agent_id: '',
        due_date: '',
      })
      setStep('map')
    }
    reader.readAsText(f)
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) processFile(f)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f && f.name.endsWith('.csv')) {
      processFile(f)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => setIsDragOver(false)

  const handleImport = async () => {
    if (!file || !mapping.title) return
    setIsImporting(true)
    setImportError(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('workflow_id', workflowId)
    formData.append('card_type', defaultCardType)
    formData.append('state_id', stateId)
    // Include column mapping as JSON
    formData.append('mapping', JSON.stringify(mapping))

    try {
      const res = await fetch('/api/cards/import', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? `Import failed (${res.status})`)
      }

      const importResult = (await res.json()) as ImportResult
      setResult(importResult)
      setStep('result')
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setIsImporting(false)
    }
  }

  const handleClose = () => {
    if (result) {
      onImportComplete()
    }
    onClose()
  }

  const getColumnValue = (row: string[], columnName: string): string => {
    const idx = headers.indexOf(columnName)
    return idx >= 0 ? (row[idx] ?? '') : ''
  }

  // Preview: first 5 data rows
  const previewRows = rows.slice(0, 5)

  return (
    /* Modal overlay */
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: "1px solid var(--border-primary)",
          borderRadius: '10px',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '80vh',
          overflowY: 'auto',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2
            style={{
              fontFamily: 'var(--font-sora), system-ui, sans-serif',
              fontSize: '16px',
              fontWeight: 700,
              color: "var(--text-primary-900)",
              margin: 0,
            }}
          >
            Import Cards from CSV
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: "var(--text-tertiary-600)",
              fontSize: '18px',
              lineHeight: 1,
              padding: '2px 6px',
              borderRadius: '4px',
            }}
          >
            &#10005;
          </button>
        </div>

        {/* Step 1: File selection */}
        {step === 'select' && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragOver ? 'var(--brand-600)' : 'var(--border-primary)'}`,
              borderRadius: '8px',
              padding: '48px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              background: isDragOver ? 'rgba(99,102,241,0.04)' : 'transparent',
              transition: 'border-color 0.15s ease, background 0.15s ease',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                fontSize: '14px',
                color: "var(--text-tertiary-600)",
                marginBottom: '8px',
              }}
            >
              Drag and drop a CSV file here, or click to select
            </div>
            <div
              style={{
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                fontSize: '12px',
                color: "var(--text-tertiary-600)",
                opacity: 0.6,
              }}
            >
              .csv files only
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>
        )}

        {/* Step 2: Column mapping + preview */}
        {step === 'map' && file && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* File info */}
            <div
              style={{
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                fontSize: '13px',
                color: "var(--text-tertiary-600)",
              }}
            >
              <strong style={{ color: "var(--text-primary-900)" }}>{file.name}</strong> — {rows.length}{' '}
              rows detected
            </div>

            {/* Read-only pre-filled fields */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                padding: '10px 12px',
                background: 'var(--bg-secondary)',
                border: "1px solid var(--border-primary)",
                borderRadius: '6px',
              }}
            >
              <div>
                <span
                  style={{
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                    fontSize: '11px',
                    color: "var(--text-tertiary-600)",
                    display: 'block',
                    marginBottom: '2px',
                  }}
                >
                  Card Type
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                    fontSize: '13px',
                    color: "var(--text-primary-900)",
                  }}
                >
                  {defaultCardType}
                </span>
              </div>
            </div>

            {/* Mapping fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  fontFamily: 'var(--font-sora), system-ui, sans-serif',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: "var(--text-primary-900)",
                }}
              >
                Column Mapping
              </div>

              {(
                [
                  { key: 'title', label: 'Title *', required: true },
                  { key: 'description', label: 'Description', required: false },
                  { key: 'priority', label: 'Priority', required: false },
                  { key: 'labels', label: 'Labels (comma-separated)', required: false },
                  { key: 'assigned_agent_id', label: 'Assigned Agent ID', required: false },
                  { key: 'due_date', label: 'Due Date', required: false },
                ] as const
              ).map(({ key, label, required }) => (
                <div
                  key={key}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
                >
                  <label
                    style={{
                      fontFamily: 'var(--font-inter), system-ui, sans-serif',
                      fontSize: '12px',
                      color: "var(--text-tertiary-600)",
                      width: '160px',
                      flexShrink: 0,
                    }}
                  >
                    {label}
                  </label>
                  <select
                    value={mapping[key]}
                    onChange={(e) =>
                      setMapping((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    style={{
                      flex: 1,
                      fontFamily: 'var(--font-inter), system-ui, sans-serif',
                      fontSize: '12px',
                      background: 'var(--bg-secondary)',
                      border: "1px solid var(--border-primary)",
                      borderRadius: '4px',
                      color: "var(--text-primary-900)",
                      padding: '4px 8px',
                    }}
                  >
                    {!required && <option value="">(skip)</option>}
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Preview table */}
            {previewRows.length > 0 && mapping.title && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div
                  style={{
                    fontFamily: 'var(--font-sora), system-ui, sans-serif',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: "var(--text-primary-900)",
                  }}
                >
                  Preview (first {previewRows.length} rows)
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontFamily: 'var(--font-inter), system-ui, sans-serif',
                      fontSize: '12px',
                    }}
                  >
                    <thead>
                      <tr>
                        <th
                          style={{
                            textAlign: 'left',
                            padding: '4px 8px',
                            borderBottom: "1px solid var(--border-primary)",
                            color: "var(--text-tertiary-600)",
                            fontWeight: 600,
                          }}
                        >
                          Title
                        </th>
                        {mapping.description && (
                          <th
                            style={{
                              textAlign: 'left',
                              padding: '4px 8px',
                              borderBottom: "1px solid var(--border-primary)",
                              color: "var(--text-tertiary-600)",
                              fontWeight: 600,
                            }}
                          >
                            Description
                          </th>
                        )}
                        {mapping.priority && (
                          <th
                            style={{
                              textAlign: 'left',
                              padding: '4px 8px',
                              borderBottom: "1px solid var(--border-primary)",
                              color: "var(--text-tertiary-600)",
                              fontWeight: 600,
                            }}
                          >
                            Priority
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i}>
                          <td
                            style={{
                              padding: '4px 8px',
                              borderBottom: "1px solid var(--border-primary)",
                              color: "var(--text-primary-900)",
                              maxWidth: '200px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {getColumnValue(row, mapping.title)}
                          </td>
                          {mapping.description && (
                            <td
                              style={{
                                padding: '4px 8px',
                                borderBottom: "1px solid var(--border-primary)",
                                color: "var(--text-tertiary-600)",
                                maxWidth: '200px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {getColumnValue(row, mapping.description)}
                            </td>
                          )}
                          {mapping.priority && (
                            <td
                              style={{
                                padding: '4px 8px',
                                borderBottom: "1px solid var(--border-primary)",
                                color: "var(--text-tertiary-600)",
                              }}
                            >
                              {getColumnValue(row, mapping.priority)}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Import error */}
            {importError && (
              <div
                style={{
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  fontSize: '13px',
                  color: 'var(--error, #ef4444)',
                  padding: '8px 12px',
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: '6px',
                }}
              >
                {importError}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setStep('select')}
                style={{
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  fontSize: '13px',
                  background: 'none',
                  border: "1px solid var(--border-primary)",
                  borderRadius: '6px',
                  color: "var(--text-tertiary-600)",
                  padding: '6px 16px',
                  cursor: 'pointer',
                }}
              >
                Back
              </button>
              <button
                onClick={() => void handleImport()}
                disabled={!mapping.title || isImporting}
                style={{
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  fontSize: '13px',
                  background: mapping.title && !isImporting ? 'var(--brand-600)' : 'var(--bg-secondary)',
                  border: 'none',
                  borderRadius: '6px',
                  color: mapping.title && !isImporting ? 'white' : 'var(--text-tertiary-600)',
                  padding: '6px 16px',
                  cursor: mapping.title && !isImporting ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {isImporting ? 'Importing...' : `Import ${rows.length} cards`}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Result */}
        {step === 'result' && result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                padding: '16px',
                background: 'rgba(34,197,94,0.08)',
                border: '1px solid rgba(34,197,94,0.2)',
                borderRadius: '6px',
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                fontSize: '14px',
                color: "var(--text-primary-900)",
              }}
            >
              {result.imported} card{result.imported !== 1 ? 's' : ''} imported successfully
              {result.errors.length > 0 && `, ${result.errors.length} error${result.errors.length !== 1 ? 's' : ''}`}
            </div>

            {result.errors.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div
                  style={{
                    fontFamily: 'var(--font-sora), system-ui, sans-serif',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: "var(--text-primary-900)",
                  }}
                >
                  Errors
                </div>
                <div
                  style={{
                    maxHeight: '200px',
                    overflowY: 'auto',
                    border: "1px solid var(--border-primary)",
                    borderRadius: '6px',
                  }}
                >
                  {result.errors.map((err, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '6px 12px',
                        borderBottom: i < result.errors.length - 1 ? '1px solid var(--border-primary)' : 'none',
                        fontFamily: 'var(--font-inter), system-ui, sans-serif',
                        fontSize: '12px',
                        color: "var(--text-tertiary-600)",
                      }}
                    >
                      <span style={{ color: 'var(--error, #ef4444)' }}>Row {err.row}:</span>{' '}
                      {err.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleClose}
                style={{
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  fontSize: '13px',
                  background: 'var(--brand-600)',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  padding: '6px 16px',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
