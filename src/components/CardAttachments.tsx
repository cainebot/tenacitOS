'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { CardAttachmentRow } from '@/types/workflow'
import { Paperclip, FileText, FileSpreadsheet, File, Download, X } from 'lucide-react'

interface CardAttachmentsProps {
  cardId: string
  attachments: CardAttachmentRow[]
  onAttachmentAdded: () => void
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function FileIcon({ mimeType }: { mimeType: string | null }) {
  if (!mimeType) return <File size={20} />
  if (mimeType.startsWith('image/')) return null // handled by thumbnail
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv') {
    return <FileSpreadsheet size={20} />
  }
  if (mimeType.includes('pdf') || mimeType.includes('text') || mimeType.includes('document')) {
    return <FileText size={20} />
  }
  return <File size={20} />
}

export function CardAttachments({ cardId, attachments, onAttachmentAdded }: CardAttachmentsProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Generate signed URLs via server endpoint (service role has storage access)
  useEffect(() => {
    if (attachments.length === 0) return

    const fetchUrls = async () => {
      const paths: Record<string, string> = {}
      for (const att of attachments) {
        paths[att.attachment_id] = att.storage_path
      }
      try {
        const res = await fetch(`/api/cards/${cardId}/attachments/urls`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paths }),
        })
        if (res.ok) {
          const urls = await res.json() as Record<string, string>
          setSignedUrls(urls)
        }
      } catch {
        // Silent — thumbnails won't show but functionality still works
      }
    }

    fetchUrls().catch(() => {})
  }, [attachments, cardId])

  const uploadFile = useCallback(
    async (file: File) => {
      setUploading(true)
      setUploadError(null)
      try {
        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch(`/api/cards/${cardId}/attachments`, {
          method: 'POST',
          body: formData,
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.message ?? `Upload failed (${res.status})`)
        }
        onAttachmentAdded()
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : String(err))
      } finally {
        setUploading(false)
      }
    },
    [cardId, onAttachmentAdded]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) uploadFile(file)
      // Reset input so same file can be re-uploaded if needed
      e.target.value = ''
    },
    [uploadFile]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) uploadFile(file)
    },
    [uploadFile]
  )

  const handleDeleteAttachment = useCallback(
    async (attachmentId: string) => {
      try {
        const res = await fetch(`/api/cards/${cardId}/attachments/${attachmentId}`, {
          method: 'DELETE',
        })
        if (!res.ok) {
          console.error('Failed to delete attachment')
          return
        }
        onAttachmentAdded() // refetch
      } catch (err) {
        console.error('Delete attachment error:', err)
      }
    },
    [cardId, onAttachmentAdded]
  )

  const sectionStyle: React.CSSProperties = {
    marginBottom: '16px',
  }

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  }

  const titleStyle: React.CSSProperties = {
    fontFamily: 'var(--font-inter), system-ui, sans-serif',
    fontSize: '11px',
    fontWeight: 600,
    color: "var(--text-quaternary-500)",
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  }

  const attachButtonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    background: 'none',
    border: "1px solid var(--border-primary)",
    borderRadius: '4px',
    padding: '3px 8px',
    cursor: 'pointer',
    color: "var(--text-tertiary-600)",
    fontFamily: 'var(--font-inter), system-ui, sans-serif',
    fontSize: '12px',
  }

  const dropZoneStyle: React.CSSProperties = {
    border: `2px dashed ${dragOver ? 'var(--brand-600)' : 'var(--border-primary)'}`,
    borderRadius: '6px',
    padding: '16px',
    textAlign: 'center',
    color: "var(--text-quaternary-500)",
    fontFamily: 'var(--font-inter), system-ui, sans-serif',
    fontSize: '12px',
    transition: 'border-color 0.15s, background 0.15s',
    background: dragOver ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
    cursor: 'pointer',
  }

  return (
    <div style={sectionStyle}>
      <div style={headerStyle}>
        <span style={titleStyle}>
          <Paperclip size={12} />
          Attachments
          {attachments.length > 0 && (
            <span
              style={{
                background: 'var(--bg-secondary)',
                border: "1px solid var(--border-primary)",
                borderRadius: '10px',
                padding: '0 6px',
                fontSize: '10px',
                color: "var(--text-tertiary-600)",
              }}
            >
              {attachments.length}
            </span>
          )}
        </span>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={attachButtonStyle}
        >
          <Paperclip size={12} />
          {uploading ? 'Uploading...' : 'Attach'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />
      </div>

      {/* Upload error */}
      {uploadError && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '4px',
            padding: '6px 10px',
            fontSize: '12px',
            color: '#ef4444',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            marginBottom: '8px',
          }}
        >
          {uploadError}
        </div>
      )}

      {/* Attachment list */}
      {attachments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
          {attachments.map((att) => {
            const isImage = att.mime_type?.startsWith('image/')
            const signedUrl = signedUrls[att.attachment_id]

            return (
              <div
                key={att.attachment_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 8px',
                  background: 'var(--bg-secondary)',
                  border: "1px solid var(--border-primary)",
                  borderRadius: '6px',
                }}
              >
                {/* Thumbnail or file icon */}
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    flexShrink: 0,
                    borderRadius: '4px',
                    overflow: 'hidden',
                    background: 'var(--border-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: "var(--text-quaternary-500)",
                  }}
                >
                  {isImage && signedUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={signedUrl}
                      alt={att.filename}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <FileIcon mimeType={att.mime_type} />
                  )}
                </div>

                {/* File info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <a
                    href={signedUrl ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontFamily: 'var(--font-inter), system-ui, sans-serif',
                      fontSize: '12px',
                      color: "var(--text-primary-900)",
                      textDecoration: 'none',
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {att.filename}
                  </a>
                  <div
                    style={{
                      fontFamily: 'var(--font-inter), system-ui, sans-serif',
                      fontSize: '11px',
                      color: "var(--text-quaternary-500)",
                    }}
                  >
                    {formatBytes(att.size_bytes)}
                    {att.size_bytes ? ' · ' : ''}
                    {formatDate(att.created_at)}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  {signedUrl && (
                    <a
                      href={signedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Download"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '24px',
                        height: '24px',
                        background: 'none',
                        border: 'none',
                        borderRadius: '4px',
                        color: "var(--text-quaternary-500)",
                        cursor: 'pointer',
                        textDecoration: 'none',
                      }}
                    >
                      <Download size={13} />
                    </a>
                  )}
                  <button
                    onClick={() => handleDeleteAttachment(att.attachment_id)}
                    title="Remove attachment"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '24px',
                      height: '24px',
                      background: 'none',
                      border: 'none',
                      borderRadius: '4px',
                      color: "var(--text-quaternary-500)",
                      cursor: 'pointer',
                    }}
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Drop zone (always shown when no attachments, or as additional drop target) */}
      <div
        style={dropZoneStyle}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? 'Uploading...' : 'Drop files here or click Attach'}
      </div>
    </div>
  )
}
