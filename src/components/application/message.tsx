'use client'

import { type ReactNode, useState, useRef, useCallback, useEffect } from 'react'
import { Avatar, FileTypeIcon, cx } from '@circos/ui'
import { Button as AriaButton } from 'react-aria-components'
import { AlertCircle, Link03, Play, PlayCircle, PauseCircle, VolumeMax, Maximize01, XClose } from '@untitledui/icons'
import Picker from '@emoji-mart/react'
// eslint-disable-next-line @typescript-eslint/no-require-imports
import emojiData from '@emoji-mart/data'
import { MessageReaction } from './message-reaction'
import { MessageActionPanel, type MessageAction } from './message-action-panel'
import { MessageStatusIcon, type MessageStatus } from './message-status-icon'

// ── Quick reaction preset ────────────────────────────────────────────────────

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '✅', '🚀'] as const

// ── D-01: Module-level session cache for refreshed signed URLs ───────────────
// Key: attachmentId, Value: { url: fresh signed URL, fetchedAt: timestamp }
const signedUrlCache = new Map<string, { url: string; fetchedAt: number }>()

// D-01: Detect URLs near expiration — >50min old relative to message creation time
function isUrlNearExpiry(createdAt: string): boolean {
  const ageMs = Date.now() - new Date(createdAt).getTime()
  return ageMs > 50 * 60 * 1000 // 50 minutes
}

// D-01: Fetch fresh URL with cache — at most one network request per attachment per 50-min window
async function fetchFreshSignedUrl(attachmentId: string): Promise<string | null> {
  // Check cache first — reuse if fetched within last 50 minutes
  const cached = signedUrlCache.get(attachmentId)
  if (cached && (Date.now() - cached.fetchedAt) < 50 * 60 * 1000) {
    return cached.url
  }

  try {
    const res = await fetch(`/api/attachments/${attachmentId}/signed-url`)
    if (res.ok) {
      const { url } = await res.json() as { url: string }
      signedUrlCache.set(attachmentId, { url, fetchedAt: Date.now() })
      return url
    }
  } catch {
    // Swallow — caller handles null
  }
  return null
}

// ── File type → color mapping ───────────────────────────────────────────────

const FILE_TYPE_COLORS: Record<string, string> = {
  pdf: 'bg-error-600',
  doc: 'bg-brand-600',
  docx: 'bg-brand-600',
  xls: 'bg-success-600',
  xlsx: 'bg-success-600',
  csv: 'bg-success-600',
  png: 'bg-purple-600',
  jpg: 'bg-brand-600',
  jpeg: 'bg-brand-600',
  gif: 'bg-purple-600',
  svg: 'bg-purple-600',
  webp: 'bg-purple-600',
  mp4: 'bg-orange-600',
  mpeg: 'bg-orange-600',
  avi: 'bg-orange-600',
  mkv: 'bg-orange-600',
  mp3: 'bg-purple-600',
  wav: 'bg-purple-600',
  zip: 'bg-warning-600',
  rar: 'bg-warning-600',
  ppt: 'bg-orange-600',
  pptx: 'bg-orange-600',
  txt: 'bg-[#525866]',
  html: 'bg-orange-600',
  css: 'bg-brand-600',
  js: 'bg-warning-600',
  ts: 'bg-brand-600',
  json: 'bg-[#525866]',
  fig: 'bg-purple-600',
  ai: 'bg-orange-600',
  psd: 'bg-brand-600',
}

export function getFileTypeColor(extension: string): string {
  return FILE_TYPE_COLORS[extension.toLowerCase().replace('.', '')] ?? 'bg-[#525866]'
}

// ── Types ────────────────────────────────────────────────────────────────────

export type MessageType =
  | 'message'
  | 'message-reply'
  | 'file'
  | 'audio'
  | 'video'
  | 'image'
  | 'link-preview'
  | 'link-minimal'
  | 'writing'
  | 'system-error'

export interface ReactionData {
  emoji: ReactNode
  count?: number
  isSelected?: boolean
  onPress?: () => void
}

interface MessageBase {
  sent?: boolean
  senderName: string
  senderAvatar?: string
  senderStatus?: 'online' | 'offline'
  timestamp: string
  status?: MessageStatus
  reactions?: ReactionData[]
  actions?: MessageAction[]
  onAction?: (action: MessageAction) => void
  /** Callback when user selects an emoji reaction from the quick picker */
  onReact?: (emoji: string) => void
  className?: string
}

type MessageTextProps = MessageBase & {
  type: 'message'
  content: string
}

type MessageReplyProps = MessageBase & {
  type: 'message-reply'
  content: string
  replyText: string
}

type MessageFileProps = MessageBase & {
  type: 'file'
  fileName: string
  fileSize: string
  fileExtension: string
  fileTypeColor?: string
  onDownload?: () => void
}

type MessageAudioProps = MessageBase & {
  type: 'audio'
  duration: string
  src?: string             // T-99-05: audio file URL for real playback
  waveformData?: number[]  // T-99-05: normalized frequency bars [0..1], 32 samples
  /** @deprecated Pass src + waveformData instead. Kept for legacy callers. */
  isPlaying?: boolean
  onPlayPause?: () => void
  waveform?: ReactNode
}

type MessageVideoProps = MessageBase & {
  type: 'video'
  thumbnailSrc: string
  onPlay?: () => void
}

type MessageImageProps = MessageBase & {
  type: 'image'
  src: string
  alt?: string
  fileName?: string
  fileSize?: string
  caption?: string           // D-03: text content for text+image messages
  attachmentId?: string      // D-01: for on-demand signed URL refresh
  createdAt?: string         // D-01: message timestamp for proactive expiry detection
  onClick?: () => void
}

type MessageLinkPreviewProps = MessageBase & {
  type: 'link-preview'
  url: string
  imageSrc?: string
}

type MessageLinkMinimalProps = MessageBase & {
  type: 'link-minimal'
  url: string
  title: string
  description?: string
}

type MessageWritingProps = Pick<MessageBase, 'senderName' | 'senderAvatar' | 'senderStatus' | 'timestamp' | 'className'> & {
  type: 'writing'
}

type MessageSystemErrorProps = MessageBase & {
  type: 'system-error'
  errorCode: string
  errorHeading: string
  errorBody: string
  onRetry?: () => void
  onReauth?: () => void
}

export type MessageProps =
  | MessageTextProps
  | MessageReplyProps
  | MessageFileProps
  | MessageAudioProps
  | MessageVideoProps
  | MessageImageProps
  | MessageLinkPreviewProps
  | MessageLinkMinimalProps
  | MessageWritingProps
  | MessageSystemErrorProps

// ── D-08: Error code → Spanish user-facing strings ──────────────────────────

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

function SystemErrorBubble({
  errorCode,
  errorHeading,
  errorBody,
  onRetry,
  onReauth,
}: {
  errorCode: string
  errorHeading: string
  errorBody: string
  onRetry?: () => void
  onReauth?: () => void
}) {
  const mapped = ERROR_CODE_MAP[errorCode] ?? ERROR_CODE_MAP.unknown

  return (
    <div
      className={cx(
        'bg-primary border border-secondary border-l-4 border-l-error',
        'rounded-bl-md rounded-br-md rounded-tr-md',
        'p-3 max-w-[70%]',
      )}
    >
      <div className="flex gap-2 items-start">
        <AlertCircle className="size-4 text-fg-error-primary shrink-0 mt-0.5" />
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <p className="text-sm font-semibold text-error-primary">{errorHeading}</p>
          <p className="text-sm text-tertiary">{errorBody}</p>
          <div className="flex gap-2 mt-2">
            {mapped.actionType === 'reauth' && onReauth && (
              <AriaButton
                onPress={onReauth}
                className="inline-flex items-center px-3 py-1.5 text-sm font-semibold rounded-md bg-error-solid text-white hover:opacity-90 transition duration-100 ease-linear"
              >
                Re-autenticar
              </AriaButton>
            )}
            {onRetry && (
              <AriaButton
                onPress={onRetry}
                className="inline-flex items-center px-3 py-1.5 text-sm font-semibold rounded-md border border-secondary bg-primary text-secondary hover:bg-secondary transition duration-100 ease-linear"
              >
                Reintentar
              </AriaButton>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── QuickReactionPicker ─────────────────────────────────────────────────────

function QuickReactionPicker({ onReact }: { onReact: (emoji: string) => void }) {
  const [showFullPicker, setShowFullPicker] = useState(false)

  return (
    <div className="flex items-center gap-0.5 bg-primary border border-secondary rounded-lg shadow-xl px-1 py-0.5">
      {QUICK_REACTIONS.map((emoji) => (
        <AriaButton
          key={emoji}
          onPress={() => onReact(emoji)}
          className="p-1 rounded-sm hover:bg-secondary_hover transition duration-100 ease-linear text-sm leading-none"
          aria-label={`React with ${emoji}`}
        >
          {emoji}
        </AriaButton>
      ))}
      <AriaButton
        onPress={() => setShowFullPicker((prev) => !prev)}
        className="p-1 rounded-sm hover:bg-secondary_hover transition duration-100 ease-linear"
        aria-label="More reactions"
      >
        <span className="text-sm text-fg-quaternary leading-none">+</span>
      </AriaButton>
      {showFullPicker && (
        <div className="absolute bottom-full right-0 mb-1 z-20">
          <Picker
            data={emojiData}
            onEmojiSelect={(e: { native: string }) => { onReact(e.native); setShowFullPicker(false) }}
            theme="dark"
            previewPosition="none"
            skinTonePosition="none"
          />
        </div>
      )}
    </div>
  )
}

// ── Bubble radius helper ────────────────────────────────────────────────────

const bubbleRadius = (sent: boolean) =>
  sent
    ? 'rounded-bl-md rounded-br-md rounded-tl-md'
    : 'rounded-bl-md rounded-br-md rounded-tr-md'

// ── Bubble sub-components ───────────────────────────────────────────────────

function TextBubble({ content, sent }: { content: string; sent: boolean }) {
  return (
    <div
      className={cx(
        'border border-secondary overflow-clip px-3 py-2 w-full',
        bubbleRadius(sent),
        'bg-primary',
      )}
    >
      <p className="text-md text-primary leading-6 whitespace-pre-wrap">{content}</p>
    </div>
  )
}

function ReplyBubble({ content, replyText, sent }: { content: string; replyText: string; sent: boolean }) {
  return (
    <div
      className={cx(
        'border border-secondary overflow-clip px-3 py-2 w-full flex flex-col gap-1.5',
        bubbleRadius(sent),
        'bg-primary',
      )}
    >
      <div className="border-l-[3px] border-brand rounded-md overflow-clip">
        <div className="bg-primary border border-secondary rounded-md px-3 py-2">
          <p className="text-sm text-tertiary truncate">{replyText}</p>
        </div>
      </div>
      <p className="text-md text-primary leading-6 whitespace-pre-wrap">{content}</p>
    </div>
  )
}

function FileBubble({
  fileName,
  fileSize,
  fileExtension,
  fileTypeColor,
  sent,
  onDownload,
}: {
  fileName: string
  fileSize: string
  fileExtension: string
  fileTypeColor?: string
  sent: boolean
  onDownload?: () => void
}) {
  const ext = fileExtension.toUpperCase().replace('.', '')
  const color = fileTypeColor ?? getFileTypeColor(fileExtension)
  const Tag = onDownload ? 'button' : 'div'

  return (
    <Tag
      {...(onDownload ? { type: 'button' as const, onClick: onDownload } : {})}
      className={cx(
        'bg-primary border border-secondary overflow-clip p-3 w-full text-left',
        bubbleRadius(sent),
        onDownload && 'cursor-pointer hover:bg-primary_hover transition duration-100 ease-linear',
      )}
    >
      <div className="flex gap-3 items-start w-full">
        <FileTypeIcon fileType={ext} color={color} size="md" />
        <div className="flex flex-col flex-1 min-w-0">
          <p className="text-sm font-medium text-secondary truncate">{fileName}</p>
          <p className="text-sm text-tertiary">{fileSize}</p>
        </div>
      </div>
    </Tag>
  )
}

// T-99-05: Render waveform bars from real frequency data or static fallback
function AudioWaveform({ data, progress = 0 }: { data?: number[]; progress?: number }) {
  const bars = data && data.length > 0
    ? data
    : Array.from({ length: 32 }, (_, i) => Math.max(0.15, Math.abs(Math.sin(i * 0.4) * 0.75 + Math.cos(i * 0.7) * 0.25)))

  return (
    <div className="flex items-center gap-px h-8" aria-hidden="true">
      {bars.map((v, i) => {
        const h = Math.max(3, v * 28 + 3)
        const filled = i / bars.length < progress
        return (
          <div
            key={i}
            className={cx(
              'w-[3px] rounded-full transition-colors duration-100',
              filled ? 'bg-brand-solid' : 'bg-brand-solid opacity-35',
            )}
            style={{ height: `${h}px` }}
          />
        )
      })}
    </div>
  )
}

// T-99-05: Rebuilt AudioBubble with real <audio> playback + progress tracking
function AudioBubble({
  duration,
  src,
  waveformData,
  sent,
  // Legacy props — kept for compatibility but ignored when src is provided
  isPlaying: _isPlaying,
  onPlayPause: _onPlayPause,
  waveform,
}: {
  duration: string
  src?: string
  waveformData?: number[]
  sent: boolean
  isPlaying?: boolean
  onPlayPause?: () => void
  waveform?: ReactNode
}) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState<number | null>(null)

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !src) return
    if (playing) {
      audio.pause()
    } else {
      audio.play().catch(() => {})
    }
  }, [playing, src])

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    const dur = audio.duration || 0
    setCurrentTime(audio.currentTime)
    setProgress(dur > 0 ? audio.currentTime / dur : 0)
  }, [])

  const handleEnded = useCallback(() => {
    setPlaying(false)
    setProgress(0)
    setCurrentTime(0)
    if (audioRef.current) audioRef.current.currentTime = 0
  }, [])

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !src) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const dur = audio.duration || 0
    if (dur > 0) {
      audio.currentTime = ratio * dur
      setProgress(ratio)
    }
  }, [src])

  // Format seconds as m:ss
  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const displayDuration = audioDuration != null ? fmtTime(audioDuration) : duration
  const displayTime = playing || progress > 0 ? fmtTime(currentTime) : displayDuration

  const Icon = playing ? PauseCircle : PlayCircle

  return (
    <div
      className={cx(
        'bg-primary border border-secondary overflow-clip p-3 w-full',
        bubbleRadius(sent),
      )}
    >
      {src && (
        <audio
          ref={audioRef}
          src={src}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onLoadedMetadata={() => {
            if (audioRef.current) setAudioDuration(audioRef.current.duration)
          }}
          className="hidden"
        />
      )}
      <div className="flex gap-2 items-center w-full">
        <button
          type="button"
          onClick={src ? togglePlay : undefined}
          className={cx(
            'shrink-0 text-fg-brand-primary transition duration-100 ease-linear',
            src ? 'hover:opacity-80 cursor-pointer' : 'opacity-40 cursor-default',
          )}
          aria-label={playing ? 'Pause audio' : 'Play audio'}
          disabled={!src}
        >
          <Icon className="size-8" />
        </button>
        <div
          className="flex-1 min-w-0 overflow-clip px-px cursor-pointer"
          onClick={src ? handleSeek : undefined}
          role={src ? 'slider' : undefined}
          aria-label={src ? 'Audio progress' : undefined}
          aria-valuenow={src ? Math.round(progress * 100) : undefined}
          aria-valuemin={src ? 0 : undefined}
          aria-valuemax={src ? 100 : undefined}
        >
          {waveform ?? <AudioWaveform data={waveformData} progress={progress} />}
        </div>
        <span className="text-xs text-tertiary shrink-0 whitespace-nowrap tabular-nums">
          {displayTime}
        </span>
      </div>
    </div>
  )
}

function VideoBubble({
  thumbnailSrc,
  sent,
  onPlay,
}: {
  thumbnailSrc: string
  sent: boolean
  onPlay?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onPlay}
      className={cx(
        'relative aspect-video w-full overflow-clip border-[0.5px] border-[rgba(0,0,0,0.1)] cursor-pointer',
        bubbleRadius(sent),
      )}
    >
      <img
        src={thumbnailSrc}
        alt="Video thumbnail"
        loading="lazy"
        className={cx('size-full object-cover', bubbleRadius(sent))}
      />
      {/* Play overlay */}
      <div className="absolute inset-0 bg-[rgba(0,0,0,0.1)] flex items-center justify-center">
        <div className="size-16 rounded-full backdrop-blur-md flex items-center justify-center">
          <Play className="size-5 text-fg-white" />
        </div>
      </div>
      {/* Bottom action bar */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[rgba(0,0,0,0.3)] to-transparent pt-6 pb-1 px-1">
        <div className="flex items-center gap-0.5">
          <div className="flex-1 flex items-center gap-0.5">
            <span className="p-2 rounded-sm">
              <Play className="size-4 text-fg-white" />
            </span>
            <span className="p-2 rounded-sm">
              <VolumeMax className="size-4 text-fg-white" />
            </span>
          </div>
          <span className="p-2 rounded-sm">
            <Maximize01 className="size-4 text-fg-white" />
          </span>
        </div>
      </div>
    </button>
  )
}

function ImageBubble({
  src,
  alt,
  fileName,
  fileSize,
  caption,
  attachmentId,
  createdAt,
  sent,
}: {
  src: string
  alt?: string
  fileName?: string
  fileSize?: string
  caption?: string
  attachmentId?: string
  createdAt?: string
  sent: boolean
  onClick?: () => void
}) {
  const [imgError, setImgError] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [activeSrc, setActiveSrc] = useState(src)
  const [refreshing, setRefreshing] = useState(false)
  const refreshAttemptedRef = useRef(false)
  const hasRefreshedRef = useRef(false)
  const dialogRef = useRef<HTMLDialogElement>(null)

  // D-01: Proactive expiry check on mount — if URL is >50min old, refresh immediately
  useEffect(() => {
    if (!attachmentId || !createdAt || refreshAttemptedRef.current) return
    if (!isUrlNearExpiry(createdAt)) return

    // Check session cache first
    const cached = signedUrlCache.get(attachmentId)
    if (cached && (Date.now() - cached.fetchedAt) < 50 * 60 * 1000) {
      setActiveSrc(cached.url)
      refreshAttemptedRef.current = true
      return
    }

    refreshAttemptedRef.current = true
    setRefreshing(true)
    void fetchFreshSignedUrl(attachmentId).then((freshUrl) => {
      if (freshUrl) {
        setActiveSrc(freshUrl)
      }
      setRefreshing(false)
    })
  }, [attachmentId, createdAt])

  // D-01: On-demand signed URL refresh when image fails to load (fallback)
  // WR-01: hasRefreshedRef guards against infinite refresh — at most one retry per mount
  const handleImgError = useCallback(async () => {
    if (refreshing) return
    if (!attachmentId || hasRefreshedRef.current) {
      setImgError(true)
      return
    }
    hasRefreshedRef.current = true
    setRefreshing(true)
    const freshUrl = await fetchFreshSignedUrl(attachmentId)
    if (freshUrl && freshUrl !== activeSrc) {
      setActiveSrc(freshUrl)
      setImgError(false)
    } else {
      setImgError(true)
    }
    setRefreshing(false)
  }, [attachmentId, refreshing, activeSrc])

  // Lightbox open/close — useEffect calls showModal() after dialog mounts in DOM
  useEffect(() => {
    if (lightboxOpen && dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal()
    }
  }, [lightboxOpen])

  const openLightbox = useCallback(() => {
    setLightboxOpen(true)
  }, [])

  const closeLightbox = useCallback(() => {
    dialogRef.current?.close()
    setLightboxOpen(false)
  }, [])

  // Guard: empty src — FileBubble fallback
  if (!src && !activeSrc) {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        <div className={cx(
          'bg-primary border border-secondary overflow-clip p-3 w-full',
          'rounded-bl-md rounded-br-md rounded-tr-md',
        )}>
          <div className="flex gap-3 items-start w-full">
            <FileTypeIcon fileType={fileName?.split('.').pop()?.toUpperCase() ?? 'IMG'} color="bg-purple-600" size="md" />
            <div className="flex flex-col flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary truncate">{fileName ?? 'Image'}</p>
              {fileSize && <p className="text-xs text-tertiary">{fileSize}</p>}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={cx('flex flex-col w-full', caption ? '' : 'gap-1.5')}>
        <button
          type="button"
          onClick={openLightbox}
          className={cx(
            'relative max-w-[280px] overflow-clip border border-secondary cursor-pointer hover:opacity-95 transition duration-100 ease-linear',
            caption ? 'rounded-t-md' : bubbleRadius(sent),
          )}
        >
          {/* Loading placeholder */}
          {!imgLoaded && !imgError && !refreshing && (
            <div className="w-[280px] h-[180px] bg-tertiary" />
          )}

          {/* Refreshing spinner */}
          {refreshing && (
            <div className="flex items-center justify-center w-[280px] h-[180px] bg-tertiary">
              <div className="size-4 border-2 border-fg-brand-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Error fallback */}
          {imgError && (
            <div className="flex items-center justify-center w-[280px] h-[120px] bg-secondary rounded-md">
              <FileTypeIcon fileType={fileName?.split('.').pop()?.toUpperCase() ?? 'IMG'} color="bg-purple-600" size="md" />
            </div>
          )}

          {/* Actual image */}
          {!imgError && !refreshing && (
            <img
              src={activeSrc}
              alt={alt ?? fileName ?? 'Image'}
              loading="lazy"
              className={cx(
                'max-w-[280px] max-h-[320px] object-contain',
                imgLoaded ? 'block' : 'hidden',
              )}
              onLoad={() => setImgLoaded(true)}
              onError={handleImgError}
            />
          )}
        </button>

        {/* D-03: Caption below image — WhatsApp/Telegram style */}
        {caption && (
          <div className={cx(
            'max-w-[280px] border border-secondary border-t-0 px-3 py-2',
            'rounded-b-md',
          )}>
            <p className="text-sm text-secondary">{caption}</p>
          </div>
        )}
      </div>

      {/* Lightbox dialog — native <dialog> with accessibility attributes.
          UUI CLI `npx untitledui@latest add dialog` returned "No components found",
          so using native <dialog> with aria-label and showModal() for focus trap. */}
      {lightboxOpen && (
        <dialog
          ref={dialogRef}
          className="fixed inset-0 z-50 bg-overlay p-0 m-0 w-screen h-screen flex items-center justify-center backdrop:bg-transparent"
          onClick={(e) => { if (e.target === e.currentTarget) closeLightbox() }}
          onCancel={closeLightbox}
          aria-label="Image lightbox"
        >
          <div className="relative flex items-center justify-center w-full h-full">
            <button
              type="button"
              onClick={closeLightbox}
              className="absolute top-4 right-4 p-2 rounded-full bg-primary border border-secondary hover:bg-secondary transition duration-150 ease-linear z-10"
              aria-label="Close"
            >
              <XClose className="size-5 text-fg-primary" />
            </button>
            <img
              src={activeSrc}
              alt={alt ?? fileName ?? 'Image'}
              className="max-w-[90vw] max-h-[90vh] object-contain transition-opacity duration-150"
            />
          </div>
        </dialog>
      )}
    </>
  )
}

function LinkPreviewBubble({ url, imageSrc, sent }: { url: string; imageSrc?: string; sent: boolean }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cx(
        'border border-secondary overflow-clip p-3 w-full flex flex-col gap-1.5 block',
        bubbleRadius(sent),
        'bg-primary',
        'hover:opacity-95 transition duration-100 ease-linear',
      )}
    >
      {imageSrc && (
        <div className="relative aspect-[1200/630] w-full overflow-clip border-[0.5px] border-[rgba(0,0,0,0.1)] rounded-md">
          <img
            src={imageSrc}
            alt="Link preview"
            loading="lazy"
            className="size-full object-cover rounded-md"
          />
        </div>
      )}
      <p className="text-md text-brand-secondary underline truncate">{url}</p>
    </a>
  )
}

function LinkMinimalBubble({
  url,
  title,
  description,
  sent,
}: {
  url: string
  title: string
  description?: string
  sent: boolean
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cx(
        'border border-secondary overflow-clip p-3 w-full flex flex-col gap-1.5 block',
        bubbleRadius(sent),
        'bg-primary',
        'hover:opacity-95 transition duration-100 ease-linear',
      )}
    >
      <div className="bg-primary border border-secondary rounded-md pl-2 pr-3 py-2 flex gap-1.5 items-start">
        <div className="flex items-center pt-0.5 shrink-0">
          <Link03 className="size-4 text-fg-quaternary" />
        </div>
        <div className="flex flex-col flex-1 min-w-0 text-sm leading-5">
          <p className="font-medium text-secondary truncate">{title}</p>
          {description && (
            <p className="text-tertiary truncate">{description}</p>
          )}
        </div>
      </div>
      <p className="text-md text-brand-secondary underline truncate">{url}</p>
    </a>
  )
}

function WritingBubble() {
  return (
    <div className="bg-primary border border-secondary overflow-clip rounded-bl-md rounded-br-md rounded-tr-md p-2.5 inline-flex gap-1.5 items-center w-fit">
      <span className="size-1.5 rounded-full bg-brand-solid opacity-60 animate-bounce [animation-delay:0ms]" />
      <span className="size-1.5 rounded-full bg-brand-solid opacity-60 animate-bounce [animation-delay:150ms]" />
      <span className="size-1.5 rounded-full bg-brand-solid opacity-60 animate-bounce [animation-delay:300ms]" />
    </div>
  )
}

// ── Main Message component ──────────────────────────────────────────────────

export function Message(props: MessageProps) {
  const [isHovered, setIsHovered] = useState(false)
  const sent = props.type !== 'writing' && (props.sent ?? false)
  const isWriting = props.type === 'writing'
  const hasActions = !isWriting && 'actions' in props && !!props.actions?.length

  return (
    <div
      className={cx(
        'flex gap-3 items-start relative group w-fit',
        sent ? 'ml-auto max-w-[70%]' : 'max-w-[80%]',
        props.className,
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Avatar — incoming only */}
      {!sent && (
        <Avatar
          src={props.senderAvatar}
          alt={props.senderName}
          size="md"
          status={props.senderStatus}
        />
      )}

      {/* Content column */}
      <div className="flex flex-col gap-1.5 flex-1 min-w-0 relative">
        {/* Name + time header */}
        <div className="flex gap-2 items-center w-full">
          <p className="text-sm font-medium text-secondary truncate flex-1 min-w-0">
            {sent ? 'You' : props.senderName}
          </p>
          <div className="flex gap-0.5 items-center shrink-0">
            <span className="text-xs text-tertiary whitespace-nowrap">{props.timestamp}</span>
            {sent && !isWriting && 'status' in props && props.status && (
              <MessageStatusIcon status={props.status} />
            )}
          </div>
        </div>

        {/* Type-specific bubble */}
        {props.type === 'message' && (
          <TextBubble content={props.content} sent={sent} />
        )}
        {props.type === 'message-reply' && (
          <ReplyBubble content={props.content} replyText={props.replyText} sent={sent} />
        )}
        {props.type === 'file' && (
          <FileBubble
            fileName={props.fileName}
            fileSize={props.fileSize}
            fileExtension={props.fileExtension}
            fileTypeColor={props.fileTypeColor}
            sent={sent}
            onDownload={props.onDownload}
          />
        )}
        {props.type === 'audio' && (
          <AudioBubble
            duration={props.duration}
            src={props.src}
            waveformData={props.waveformData}
            isPlaying={props.isPlaying}
            onPlayPause={props.onPlayPause}
            waveform={props.waveform}
            sent={sent}
          />
        )}
        {props.type === 'video' && (
          <VideoBubble
            thumbnailSrc={props.thumbnailSrc}
            sent={sent}
            onPlay={props.onPlay}
          />
        )}
        {props.type === 'image' && (
          <ImageBubble
            src={props.src}
            alt={props.alt}
            fileName={props.fileName}
            fileSize={props.fileSize}
            caption={props.caption}
            attachmentId={props.attachmentId}
            createdAt={props.createdAt}
            sent={sent}
            onClick={props.onClick}
          />
        )}
        {props.type === 'link-preview' && (
          <LinkPreviewBubble url={props.url} imageSrc={props.imageSrc} sent={sent} />
        )}
        {props.type === 'link-minimal' && (
          <LinkMinimalBubble
            url={props.url}
            title={props.title}
            description={props.description}
            sent={sent}
          />
        )}
        {props.type === 'writing' && <WritingBubble />}
        {props.type === 'system-error' && (
          <SystemErrorBubble
            errorCode={props.errorCode}
            errorHeading={props.errorHeading}
            errorBody={props.errorBody}
            onRetry={props.onRetry}
            onReauth={props.onReauth}
          />
        )}

        {/* Reactions row */}
        {!isWriting && 'reactions' in props && props.reactions && props.reactions.length > 0 && (
          <div className="flex gap-1 items-center justify-end w-full">
            {props.reactions.map((reaction, i) => (
              <MessageReaction
                key={i}
                emoji={reaction.emoji}
                count={reaction.count}
                isSelected={reaction.isSelected}
                onPress={reaction.onPress}
              />
            ))}
          </div>
        )}

        {/* Action panel on hover */}
        {hasActions && isHovered && (
          <div className="absolute -bottom-5 right-2 z-10">
            <MessageActionPanel
              actions={(props as MessageBase).actions}
              onAction={(props as MessageBase).onAction}
            />
          </div>
        )}

        {/* Quick reaction picker on hover (D-08) */}
        {!isWriting && 'onReact' in props && props.onReact && isHovered && (
          <div className={cx('absolute -top-8 z-10', sent ? 'right-0' : 'left-0')}>
            <QuickReactionPicker onReact={props.onReact} />
          </div>
        )}
      </div>
    </div>
  )
}
