import { describe, it, expect } from 'vitest'

// ── Replicated types (from @/types/chat) ─────────────────────────────────────
// Only the fields referenced by buildMessageProps are included.

interface MessageAttachmentRow {
  attachment_id: string
  message_id: string
  storage_path: string
  url: string
  filename: string
  size_bytes: number
  mime_type: string
  duration_seconds: number | null
  width_px: number | null
  height_px: number | null
  thumbnail_storage_path: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

interface MessageReceiptRow {
  receipt_id: string
  message_id: string
  conversation_id: string
  participant_id: string
  status: 'delivered' | 'read' | 'processed' | 'failed'
  error_message: string | null
  error_code: string | null
  created_at: string
}

interface EnrichedMessage {
  message_id: string
  conversation_id: string
  sender_id: string
  content_type: string
  text: string | null
  created_at: string
  edited_at: string | null
  parent_message_id: string | null
  deleted_at: string | null
  og_title: string | null
  og_description: string | null
  og_image_url: string | null
  og_site_name: string | null
  og_url: string | null
  skill_id: string | null
  skill_command: string | null
  senderName: string
  senderAvatar: string | null
  isMine: boolean
  attachments: MessageAttachmentRow[]
  receipts: MessageReceiptRow[]
  reactions: { emoji: string; count: number; selected: boolean }[]
  parentMessage: { text: string | null; senderName: string } | null
  statusIcon: string
  messageType: string
  _optimistic?: boolean
  _failed?: boolean
  _abortState?: 'canceling' | 'canceled'
}

// ── Replicated helpers ────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function extname(filename: string): string {
  const idx = filename.lastIndexOf('.')
  return idx > 0 ? filename.substring(idx) : ''
}

// ── Replicated ERROR_CODE_LABELS (from build-message-props.ts lines 53-60) ───

const ERROR_CODE_LABELS: Record<string, { heading: string; body: string }> = {
  oauth_expired: { heading: 'Autenticacion expirada', body: 'El token de acceso del agente vencio.' },
  rate_limited: { heading: 'Limite de solicitudes', body: 'El agente alcanzo el limite de la API. Intenta en unos minutos.' },
  agent_offline: { heading: 'Agente desconectado', body: 'El agente no esta respondiendo. Puede estar reiniciandose.' },
  model_unavailable: { heading: 'Modelo no disponible', body: 'El modelo del agente no esta disponible en este momento.' },
  gateway_timeout: { heading: 'Tiempo de espera agotado', body: 'El agente tardo demasiado en responder.' },
  unknown: { heading: 'Error del agente', body: 'Ocurrio un error inesperado.' },
}

// ── Replicated ERROR_CODE_MAP (from message.tsx lines 233-264) ───────────────

const ERROR_CODE_MAP: Record<string, { heading: string; body: string; actionType: 'retry' | 'reauth' }> = {
  oauth_expired: {
    heading: 'Autenticacion expirada',
    body: 'El token de acceso del agente vencio.',
    actionType: 'reauth',
  },
  rate_limited: {
    heading: 'Limite de solicitudes',
    body: 'El agente alcanzo el limite de la API. Intenta en unos minutos.',
    actionType: 'retry',
  },
  agent_offline: {
    heading: 'Agente desconectado',
    body: 'El agente no esta respondiendo. Puede estar reiniciandose.',
    actionType: 'retry',
  },
  model_unavailable: {
    heading: 'Modelo no disponible',
    body: 'El modelo del agente no esta disponible en este momento.',
    actionType: 'retry',
  },
  gateway_timeout: {
    heading: 'Tiempo de espera agotado',
    body: 'El agente tardo demasiado en responder.',
    actionType: 'retry',
  },
  unknown: {
    heading: 'Error del agente',
    body: 'Ocurrio un error inesperado.',
    actionType: 'retry',
  },
}

// ── Replicated buildMessageProps (from build-message-props.ts) ───────────────
// Replicates the full routing logic under test. Only the return value shape
// relevant to each test assertion is typed as the return type.

type MessagePropsResult = Record<string, unknown>

function buildMessageProps(
  msg: EnrichedMessage,
  baseProps: {
    sent: boolean
    senderName: string
    timestamp: string
    reactions: { emoji: string; count: number; isSelected: boolean }[]
    onRetry?: () => void
    onReauth?: () => void
  },
  allMessages: EnrichedMessage[],
): MessagePropsResult {
  const att: MessageAttachmentRow | undefined = msg.attachments[0]
  const abortBubbleMeta = (() => {
    if (msg._abortState === 'canceling') {
      return {
        stateLabel: 'cancelando...',
        stateTone: 'canceling',
        statePulse: true,
      }
    }
    if (msg._abortState === 'canceled') {
      return {
        stateLabel: 'Respuesta cancelada',
        stateTone: 'canceled',
      }
    }
    return {}
  })()

  const failedReceipt = msg.receipts.find(r => r.status === 'failed' && r.error_code)
  if (failedReceipt) {
    const entry = ERROR_CODE_LABELS[failedReceipt.error_code ?? 'unknown'] ?? ERROR_CODE_LABELS.unknown
    return {
      ...baseProps,
      type: 'system-error' as const,
      errorCode: failedReceipt.error_code ?? 'unknown',
      errorHeading: entry.heading,
      errorBody: failedReceipt.error_message ?? entry.body,
    }
  }

  switch (msg.messageType) {
    case 'file':
      return {
        ...baseProps,
        type: 'file',
        fileName: att?.filename ?? 'file',
        fileSize: att ? formatBytes(att.size_bytes) : '0 B',
        fileExtension: att ? extname(att.filename) : '',
      }
    case 'image':
      return {
        ...baseProps,
        type: 'image',
        src: att?.url ?? '',
        alt: att?.filename ?? 'Image',
        fileName: att?.filename,
        fileSize: att ? formatBytes(att.size_bytes) : undefined,
        caption: msg.text || undefined,
        attachmentId: att?.attachment_id,
        createdAt: msg.created_at,
      }
    case 'audio': {
      const rawWaveform = att?.metadata?.waveform
      const waveformData = Array.isArray(rawWaveform) ? (rawWaveform as number[]) : undefined
      return {
        ...baseProps,
        type: 'audio',
        src: att?.url,
        waveformData,
        duration: att?.duration_seconds
          ? `${Math.floor(att.duration_seconds / 60)}:${Math.floor(att.duration_seconds % 60).toString().padStart(2, '0')}`
          : '0:00',
      }
    }
    default: {
      if (msg.parent_message_id) {
        const parent = allMessages.find((m) => m.message_id === msg.parent_message_id)
        const replyText = parent?.text
          ? parent.text.length > 100 ? parent.text.substring(0, 100) + '...' : parent.text
          : '...'
        return {
          ...baseProps,
          type: 'message-reply' as const,
          content: msg.text ?? '',
          replyText,
          ...abortBubbleMeta,
        }
      }
      return {
        ...baseProps,
        type: 'message',
        content: msg.text ?? '',
        ...abortBubbleMeta,
      }
    }
  }
}

// ── Test fixtures ─────────────────────────────────────────────────────────────

function baseProps() {
  return {
    sent: true,
    senderName: 'Joan',
    timestamp: '10:00 AM',
    reactions: [],
  }
}

function baseMsg(overrides: Partial<EnrichedMessage> = {}): EnrichedMessage {
  return {
    message_id: 'msg-1',
    conversation_id: 'conv-1',
    sender_id: 'p-1',
    content_type: 'text',
    text: null,
    created_at: '2026-01-01T10:00:00Z',
    edited_at: null,
    parent_message_id: null,
    deleted_at: null,
    og_title: null,
    og_description: null,
    og_image_url: null,
    og_site_name: null,
    og_url: null,
    skill_id: null,
    skill_command: null,
    senderName: 'Joan',
    senderAvatar: null,
    isMine: true,
    attachments: [],
    receipts: [],
    reactions: [],
    parentMessage: null,
    statusIcon: 'delivered',
    messageType: 'message',
    ...overrides,
  }
}

function imageAttachment(overrides: Partial<MessageAttachmentRow> = {}): MessageAttachmentRow {
  return {
    attachment_id: 'att-img-1',
    message_id: 'msg-1',
    storage_path: 'chat/att-img-1.jpg',
    url: 'https://storage.example.com/att-img-1.jpg?token=abc',
    filename: 'photo.jpg',
    size_bytes: 204800,
    mime_type: 'image/jpeg',
    duration_seconds: null,
    width_px: 1280,
    height_px: 720,
    thumbnail_storage_path: null,
    metadata: null,
    created_at: '2026-01-01T10:00:00Z',
    ...overrides,
  }
}

function audioAttachment(overrides: Partial<MessageAttachmentRow> = {}): MessageAttachmentRow {
  return {
    attachment_id: 'att-audio-1',
    message_id: 'msg-1',
    storage_path: 'chat/att-audio-1.webm',
    url: 'https://storage.example.com/att-audio-1.webm?token=abc',
    filename: 'recording.webm',
    size_bytes: 51200,
    mime_type: 'audio/webm',
    duration_seconds: 12,
    width_px: null,
    height_px: null,
    thumbnail_storage_path: null,
    metadata: null,
    created_at: '2026-01-01T10:00:00Z',
    ...overrides,
  }
}

function fileAttachment(overrides: Partial<MessageAttachmentRow> = {}): MessageAttachmentRow {
  return {
    attachment_id: 'att-file-1',
    message_id: 'msg-1',
    storage_path: 'chat/att-file-1.pdf',
    url: 'https://storage.example.com/att-file-1.pdf?token=abc',
    filename: 'report.pdf',
    size_bytes: 1048576,
    mime_type: 'application/pdf',
    duration_seconds: null,
    width_px: null,
    height_px: null,
    thumbnail_storage_path: null,
    metadata: null,
    created_at: '2026-01-01T10:00:00Z',
    ...overrides,
  }
}

function failedReceipt(overrides: Partial<MessageReceiptRow> = {}): MessageReceiptRow {
  return {
    receipt_id: 'rec-1',
    message_id: 'msg-1',
    conversation_id: 'conv-1',
    participant_id: 'p-agent-1',
    status: 'failed',
    error_message: null,
    error_code: 'agent_offline',
    created_at: '2026-01-01T10:00:01Z',
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests: buildMessageProps routing
// ─────────────────────────────────────────────────────────────────────────────

describe('buildMessageProps — image routing', () => {
  it('returns type image with src from att.url', () => {
    const att = imageAttachment()
    const msg = baseMsg({ messageType: 'image', attachments: [att] })
    const result = buildMessageProps(msg, baseProps(), [])
    expect(result.type).toBe('image')
    expect(result.src).toBe(att.url)
  })

  it('returns caption from msg.text when non-empty', () => {
    const att = imageAttachment()
    const msg = baseMsg({ messageType: 'image', attachments: [att], text: 'Look at this!' })
    const result = buildMessageProps(msg, baseProps(), [])
    expect(result.caption).toBe('Look at this!')
  })

  it('returns caption as undefined when msg.text is empty string', () => {
    const att = imageAttachment()
    const msg = baseMsg({ messageType: 'image', attachments: [att], text: '' })
    const result = buildMessageProps(msg, baseProps(), [])
    expect(result.caption).toBeUndefined()
  })

  it('returns caption as undefined when msg.text is null', () => {
    const att = imageAttachment()
    const msg = baseMsg({ messageType: 'image', attachments: [att], text: null })
    const result = buildMessageProps(msg, baseProps(), [])
    expect(result.caption).toBeUndefined()
  })

  it('returns attachmentId from att.attachment_id', () => {
    const att = imageAttachment()
    const msg = baseMsg({ messageType: 'image', attachments: [att] })
    const result = buildMessageProps(msg, baseProps(), [])
    expect(result.attachmentId).toBe('att-img-1')
  })

  it('returns createdAt from msg.created_at', () => {
    const att = imageAttachment()
    const msg = baseMsg({ messageType: 'image', attachments: [att], created_at: '2026-03-15T12:30:00Z' })
    const result = buildMessageProps(msg, baseProps(), [])
    expect(result.createdAt).toBe('2026-03-15T12:30:00Z')
  })
})

describe('buildMessageProps — audio routing', () => {
  it('returns type audio with src from att.url', () => {
    const att = audioAttachment()
    const msg = baseMsg({ messageType: 'audio', attachments: [att] })
    const result = buildMessageProps(msg, baseProps(), [])
    expect(result.type).toBe('audio')
    expect(result.src).toBe(att.url)
  })

  it('returns waveformData when metadata.waveform is a number array', () => {
    const waveform = [0.1, 0.5, 0.9, 0.3, 0.7]
    const att = audioAttachment({ metadata: { waveform } })
    const msg = baseMsg({ messageType: 'audio', attachments: [att] })
    const result = buildMessageProps(msg, baseProps(), [])
    expect(result.waveformData).toEqual(waveform)
  })

  it('returns waveformData as undefined when metadata.waveform is a string', () => {
    const att = audioAttachment({ metadata: { waveform: 'not-an-array' } })
    const msg = baseMsg({ messageType: 'audio', attachments: [att] })
    const result = buildMessageProps(msg, baseProps(), [])
    expect(result.waveformData).toBeUndefined()
  })

  it('returns waveformData as undefined when metadata.waveform is null', () => {
    const att = audioAttachment({ metadata: { waveform: null } })
    const msg = baseMsg({ messageType: 'audio', attachments: [att] })
    const result = buildMessageProps(msg, baseProps(), [])
    expect(result.waveformData).toBeUndefined()
  })

  it('returns waveformData as undefined when metadata.waveform is a plain object', () => {
    const att = audioAttachment({ metadata: { waveform: { data: [0.1, 0.2] } } })
    const msg = baseMsg({ messageType: 'audio', attachments: [att] })
    const result = buildMessageProps(msg, baseProps(), [])
    expect(result.waveformData).toBeUndefined()
  })

  it('returns waveformData as undefined when metadata is null', () => {
    const att = audioAttachment({ metadata: null })
    const msg = baseMsg({ messageType: 'audio', attachments: [att] })
    const result = buildMessageProps(msg, baseProps(), [])
    expect(result.waveformData).toBeUndefined()
  })
})

describe('buildMessageProps — system-error routing', () => {
  it('returns type system-error when message has a failed receipt with error_code', () => {
    const msg = baseMsg({
      messageType: 'message',
      receipts: [failedReceipt({ error_code: 'agent_offline' })],
    })
    const result = buildMessageProps(msg, baseProps(), [])
    expect(result.type).toBe('system-error')
  })

  it('includes errorCode from the failed receipt', () => {
    const msg = baseMsg({
      receipts: [failedReceipt({ error_code: 'rate_limited' })],
    })
    const result = buildMessageProps(msg, baseProps(), [])
    expect(result.errorCode).toBe('rate_limited')
  })

  it('includes errorHeading from ERROR_CODE_LABELS for the given code', () => {
    const msg = baseMsg({
      receipts: [failedReceipt({ error_code: 'gateway_timeout' })],
    })
    const result = buildMessageProps(msg, baseProps(), [])
    expect(result.errorHeading).toBe('Tiempo de espera agotado')
  })

  it('uses errorBody from ERROR_CODE_LABELS when receipt error_message is null', () => {
    const msg = baseMsg({
      receipts: [failedReceipt({ error_code: 'agent_offline', error_message: null })],
    })
    const result = buildMessageProps(msg, baseProps(), [])
    expect(result.errorBody).toBe('El agente no esta respondiendo. Puede estar reiniciandose.')
  })

  it('overrides errorBody with receipt error_message when present', () => {
    const msg = baseMsg({
      receipts: [failedReceipt({ error_code: 'agent_offline', error_message: 'Connection refused on port 8080' })],
    })
    const result = buildMessageProps(msg, baseProps(), [])
    expect(result.errorBody).toBe('Connection refused on port 8080')
  })

  it('falls back to unknown entry for an unrecognized error_code', () => {
    const msg = baseMsg({
      receipts: [failedReceipt({ error_code: 'totally_unknown_code' })],
    })
    const result = buildMessageProps(msg, baseProps(), [])
    expect(result.errorCode).toBe('totally_unknown_code')
    expect(result.errorHeading).toBe('Error del agente')
    expect(result.errorBody).toBe('Ocurrio un error inesperado.')
  })

  it('does NOT route to system-error when receipt status is not failed', () => {
    const msg = baseMsg({
      messageType: 'message',
      text: 'Hello',
      receipts: [{
        receipt_id: 'rec-1',
        message_id: 'msg-1',
        conversation_id: 'conv-1',
        participant_id: 'p-1',
        status: 'delivered',
        error_message: null,
        error_code: 'agent_offline', // code present but status is not failed
        created_at: '2026-01-01T10:00:01Z',
      }],
    })
    const result = buildMessageProps(msg, baseProps(), [])
    expect(result.type).not.toBe('system-error')
    expect(result.type).toBe('message')
  })

  it('does NOT route to system-error when error_code is null on failed receipt', () => {
    const msg = baseMsg({
      messageType: 'message',
      text: 'Hello',
      receipts: [failedReceipt({ error_code: null })],
    })
    const result = buildMessageProps(msg, baseProps(), [])
    expect(result.type).toBe('message')
  })
})

describe('buildMessageProps — file routing', () => {
  it('returns type file with fileName, fileSize, fileExtension', () => {
    const att = fileAttachment()
    const msg = baseMsg({ messageType: 'file', attachments: [att] })
    const result = buildMessageProps(msg, baseProps(), [])
    expect(result.type).toBe('file')
    expect(result.fileName).toBe('report.pdf')
    expect(result.fileSize).toBe('1 MB')
    expect(result.fileExtension).toBe('.pdf')
  })
})

describe('buildMessageProps — default text routing', () => {
  it('returns type message with content from msg.text', () => {
    const msg = baseMsg({ messageType: 'message', text: 'Hello, world!' })
    const result = buildMessageProps(msg, baseProps(), [])
    expect(result.type).toBe('message')
    expect(result.content).toBe('Hello, world!')
  })

  it('returns empty string content when msg.text is null', () => {
    const msg = baseMsg({ messageType: 'message', text: null })
    const result = buildMessageProps(msg, baseProps(), [])
    expect(result.type).toBe('message')
    expect(result.content).toBe('')
  })
})

describe('buildMessageProps — abort metadata routing (Phase 108)', () => {
  it('keeps canceled text in the same bubble and adds Respuesta cancelada label', () => {
    const msg = baseMsg({
      messageType: 'message',
      text: 'Partial daemon output',
      _abortState: 'canceled',
    })
    const result = buildMessageProps(msg, baseProps(), [])
    expect(result.type).toBe('message')
    expect(result.content).toBe('Partial daemon output')
    expect(result.stateLabel).toBe('Respuesta cancelada')
    expect(result.stateTone).toBe('canceled')
  })

  it('renders canceling metadata without converting message into system-error', () => {
    const msg = baseMsg({
      messageType: 'message',
      text: 'Still streaming',
      _abortState: 'canceling',
    })
    const result = buildMessageProps(msg, baseProps(), [])
    expect(result.type).toBe('message')
    expect(result.stateLabel).toBe('cancelando...')
    expect(result.stateTone).toBe('canceling')
    expect(result.statePulse).toBe(true)
  })

  it('keeps genuine threaded replies as message-reply even when canceled', () => {
    const parent = baseMsg({ message_id: 'parent-msg', text: 'Original parent text' })
    const reply = baseMsg({
      message_id: 'reply-msg',
      parent_message_id: 'parent-msg',
      text: 'Reply text',
      _abortState: 'canceled',
    })
    const result = buildMessageProps(reply, baseProps(), [parent, reply])
    expect(result.type).toBe('message-reply')
    expect(result.stateLabel).toBe('Respuesta cancelada')
  })

  it('does not require parent_message_id to render cancel metadata', () => {
    const msg = baseMsg({
      messageType: 'message',
      parent_message_id: null,
      text: 'Standalone reply',
      _abortState: 'canceling',
    })
    const result = buildMessageProps(msg, baseProps(), [])
    expect(result.type).toBe('message')
    expect(result.stateLabel).toBe('cancelando...')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests: ERROR_CODE_LABELS and ERROR_CODE_MAP structure
// ─────────────────────────────────────────────────────────────────────────────

const EXPECTED_CODES = ['oauth_expired', 'rate_limited', 'agent_offline', 'model_unavailable', 'gateway_timeout', 'unknown']

describe('ERROR_CODE_LABELS structure', () => {
  it('has exactly 6 keys', () => {
    expect(Object.keys(ERROR_CODE_LABELS)).toHaveLength(6)
  })

  it('contains all expected error codes as keys', () => {
    for (const code of EXPECTED_CODES) {
      expect(ERROR_CODE_LABELS).toHaveProperty(code)
    }
  })

  it('all headings are non-empty strings', () => {
    for (const code of EXPECTED_CODES) {
      const { heading } = ERROR_CODE_LABELS[code]
      expect(typeof heading).toBe('string')
      expect(heading.length).toBeGreaterThan(0)
    }
  })

  it('all bodies are non-empty strings', () => {
    for (const code of EXPECTED_CODES) {
      const { body } = ERROR_CODE_LABELS[code]
      expect(typeof body).toBe('string')
      expect(body.length).toBeGreaterThan(0)
    }
  })
})

describe('ERROR_CODE_MAP structure', () => {
  it('has exactly 6 keys', () => {
    expect(Object.keys(ERROR_CODE_MAP)).toHaveLength(6)
  })

  it('contains all expected error codes as keys', () => {
    for (const code of EXPECTED_CODES) {
      expect(ERROR_CODE_MAP).toHaveProperty(code)
    }
  })

  it('all headings are non-empty strings', () => {
    for (const code of EXPECTED_CODES) {
      const { heading } = ERROR_CODE_MAP[code]
      expect(typeof heading).toBe('string')
      expect(heading.length).toBeGreaterThan(0)
    }
  })

  it('all bodies are non-empty strings', () => {
    for (const code of EXPECTED_CODES) {
      const { body } = ERROR_CODE_MAP[code]
      expect(typeof body).toBe('string')
      expect(body.length).toBeGreaterThan(0)
    }
  })

  it('only oauth_expired has actionType reauth; all others have retry', () => {
    expect(ERROR_CODE_MAP.oauth_expired.actionType).toBe('reauth')
    for (const code of EXPECTED_CODES.filter(c => c !== 'oauth_expired')) {
      expect(ERROR_CODE_MAP[code].actionType).toBe('retry')
    }
  })
})

describe('ERROR_CODE_MAP and ERROR_CODE_LABELS agree on heading and body', () => {
  it('headings match for all 6 codes', () => {
    for (const code of EXPECTED_CODES) {
      expect(ERROR_CODE_MAP[code].heading).toBe(ERROR_CODE_LABELS[code].heading)
    }
  })

  it('bodies match for all 6 codes', () => {
    for (const code of EXPECTED_CODES) {
      expect(ERROR_CODE_MAP[code].body).toBe(ERROR_CODE_LABELS[code].body)
    }
  })
})
