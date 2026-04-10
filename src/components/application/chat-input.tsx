'use client'

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type KeyboardEvent,
  type ClipboardEvent,
  type ChangeEvent,
  type DragEvent,
} from 'react'
import { toast } from 'sonner'
import { Avatar, ButtonUtility, cx } from '@circos/ui'
import { Button as AriaButton } from 'react-aria-components'
import {
  Attachment01,
  ChevronDown,
  FaceSmile,
  ItalicSquare,
  Microphone02,
  Recording02,
  Send01,
  StopCircle,
  XClose,
} from '@untitledui/icons'
import Picker from '@emoji-mart/react'
// eslint-disable-next-line @typescript-eslint/no-require-imports
import data from '@emoji-mart/data'

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_IMAGES = 10
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB per D-01

// ── Types ────────────────────────────────────────────────────────────────────

interface AttachedImage {
  id: string
  file: File
  preview: string
}

export interface ChatShortcut {
  id: string
  label: string
  description?: string
  icon?: React.FC<{ className?: string }>
}

export interface ChatInputPayload {
  text: string
  images: File[]
  files?: File[]          // Non-image attachments (PDFs, docs, etc.)
  audioBlob?: Blob        // Audio recording from MediaRecorder
  waveformData?: number[] // Normalized frequency bars [0..1], 40 samples captured at stop
  command?: string
}

/** D-02: Resize image to max 800px on longest side using Canvas. Returns original if already within bounds. */
function resizeImageToMax800(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const maxDim = 800
      let { width, height } = img
      // Skip resize if already within bounds
      if (width <= maxDim && height <= maxDim) {
        URL.revokeObjectURL(url)
        resolve(file)
        return
      }
      const ratio = Math.min(maxDim / width, maxDim / height)
      width = Math.round(width * ratio)
      height = Math.round(height * ratio)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url)
          if (blob) {
            // Wrap blob back into File to preserve .name and .type
            resolve(new File([blob], file.name, { type: file.type }))
          } else {
            reject(new Error('Canvas toBlob failed'))
          }
        },
        file.type,
        0.9
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Image load failed'))
    }
    img.src = url
  })
}

interface ChatInputProps {
  /** Visual variant matching Figma specs */
  type?: 'minimal' | 'textarea' | 'advanced'
  placeholder?: string
  onSend?: (payload: ChatInputPayload) => void
  isDisabled?: boolean
  /** Slash command shortcuts — shown when user types "/" (textarea & advanced only) */
  shortcuts?: ChatShortcut[]
  /** For Advanced variant — user avatar */
  avatarSrc?: string
  /** For Advanced variant — user display name */
  userName?: string
  className?: string
  /** Reply context — shown as a dismissible banner above the input */
  replyTo?: { senderName: string; text: string } | null
  /** Called when user dismisses the reply banner */
  onClearReply?: () => void
  /** Phase 102 D-08: True when agent is streaming a response — send button morphs to stop */
  isStreaming?: boolean
  /** Phase 102 D-08: Called when user clicks the stop/abort button */
  onAbort?: () => void
}

// ── ChatInput ────────────────────────────────────────────────────────────────

export function ChatInput({
  type = 'textarea',
  placeholder,
  onSend,
  isDisabled = false,
  shortcuts = [],
  avatarSrc,
  userName = 'User',
  className,
  replyTo,
  onClearReply,
  isStreaming = false,
  onAbort,
}: ChatInputProps) {
  const [text, setText] = useState('')
  const [images, setImages] = useState<AttachedImage[]>([])
  const [nonImageFiles, setNonImageFiles] = useState<File[]>([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isDragOver, setIsDragOver] = useState(false)
  const [waveformBars, setWaveformBars] = useState<number[]>(Array(32).fill(4))

  // Slash commands state
  const [activeCommand, setActiveCommand] = useState<ChatShortcut | null>(null)
  const [showShortcutPanel, setShowShortcutPanel] = useState(false)
  const [shortcutQuery, setShortcutQuery] = useState('')
  const [shortcutIndex, setShortcutIndex] = useState(0)
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 })

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const emojiButtonRef = useRef<HTMLDivElement>(null)
  const shortcutPanelRef = useRef<HTMLDivElement>(null)
  const mirrorRef = useRef<HTMLDivElement>(null)
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const waveformDataRef = useRef<number[]>([])
  // Track mount state to prevent DOM operations after unmount (WR-04: mirror div leak)
  const isMountedRef = useRef(true)
  useEffect(() => { return () => { isMountedRef.current = false } }, [])

  const hasContent = text.trim().length > 0 || images.length > 0 || nonImageFiles.length > 0 || activeCommand != null
  const supportsShortcuts = type !== 'minimal' && shortcuts.length > 0

  const defaultPlaceholder =
    type === 'advanced' ? 'Ask me anything...' : 'Message'

  // ── Auto-resize textarea ───────────────────────────────────────────────

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [])

  useEffect(() => {
    if (type !== 'minimal') resizeTextarea()
  }, [text, resizeTextarea, type])

  // ── Close emoji picker on outside click ────────────────────────────────

  useEffect(() => {
    if (!showEmojiPicker) return
    const handleClick = (e: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showEmojiPicker])

  // ── Slash commands — caret position helper ──────────────────────────────

  const getCaretCoords = useCallback(() => {
    const ta = textareaRef.current
    if (!ta) return { top: 0, left: 0 }

    // Create or reuse a mirror div with matching styles
    let mirror = mirrorRef.current
    if (!mirror) {
      mirror = document.createElement('div')
      mirrorRef.current = mirror
      document.body.appendChild(mirror)
    }
    const style = getComputedStyle(ta)
    const copyProps = [
      'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing',
      'wordSpacing', 'textIndent', 'whiteSpace', 'overflowWrap', 'wordBreak',
      'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
      'boxSizing',
    ] as const
    mirror.style.cssText = 'position:absolute;visibility:hidden;overflow:hidden;pointer-events:none;'
    mirror.style.width = `${ta.offsetWidth}px`
    for (const p of copyProps) mirror.style[p] = style[p]

    const pos = ta.selectionStart ?? 0
    const before = ta.value.substring(0, pos)
    mirror.textContent = before

    const span = document.createElement('span')
    span.textContent = '\u200b' // zero-width space
    mirror.appendChild(span)

    const top = span.offsetTop - ta.scrollTop
    const left = span.offsetLeft

    mirror.textContent = ''
    return { top, left }
  }, [])

  // ── Slash commands — detect "/" and filter ──────────────────────────────

  const filteredShortcuts = shortcuts.filter((s) =>
    shortcutQuery
      ? s.label.toLowerCase().startsWith(shortcutQuery.toLowerCase())
      : true,
  )

  const handleTextChange = useCallback(
    (newText: string) => {
      setText(newText)

      if (!supportsShortcuts) return

      // Find a slash command pattern: "/" at start or after whitespace
      const match = newText.match(/(?:^|\s)\/([\w-]*)$/)
      if (match) {
        const query = match[1]
        setShortcutQuery(query)
        setShortcutIndex(0)
        setShowShortcutPanel(true)

        // Calculate position for the panel (guarded: skip if unmounted to prevent mirror div leak)
        requestAnimationFrame(() => {
          if (!isMountedRef.current) return
          const coords = getCaretCoords()
          setPanelPos(coords)
        })
      } else {
        setShowShortcutPanel(false)
        setShortcutQuery('')
      }
    },
    [supportsShortcuts, getCaretCoords],
  )

  const selectShortcut = useCallback(
    (shortcut: ChatShortcut) => {
      // Remove the "/query" from text
      const cleaned = text.replace(/(?:^|\s)\/[\w-]*$/, '').trim()
      setText(cleaned)
      setActiveCommand(shortcut)
      setShowShortcutPanel(false)
      setShortcutQuery('')
      textareaRef.current?.focus()
    },
    [text],
  )

  const removeCommand = useCallback(() => {
    setActiveCommand(null)
    textareaRef.current?.focus()
  }, [])

  // Cleanup mirror on unmount
  useEffect(() => {
    return () => {
      if (mirrorRef.current) {
        document.body.removeChild(mirrorRef.current)
        mirrorRef.current = null
      }
    }
  }, [])

  // Close shortcut panel on outside click
  useEffect(() => {
    if (!showShortcutPanel) return
    const handleClick = (e: MouseEvent) => {
      if (shortcutPanelRef.current && !shortcutPanelRef.current.contains(e.target as Node)) {
        setShowShortcutPanel(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showShortcutPanel])

  // ── Recording timer ────────────────────────────────────────────────────

  useEffect(() => {
    if (isRecording) {
      setRecordingTime(0)
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1)
      }, 1000)
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
        recordingIntervalRef.current = null
      }
      setRecordingTime(0)
    }
    return () => {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current)
    }
  }, [isRecording])

  // ── Image helpers ──────────────────────────────────────────────────────

  const addFiles = useCallback(async (fileList: FileList | File[]) => {
    const fileArray = Array.from(fileList)
    const newImages: AttachedImage[] = []
    const newFiles: File[] = []

    for (const file of fileArray) {
      // D-01: Client-side 25MB limit
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`"${file.name}" exceeds 25MB limit`)
        continue
      }

      if (ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        if (images.length + newImages.length >= MAX_IMAGES) continue
        // D-02: Resize image to max 800px before preview and upload
        let resizedFile = file
        try {
          resizedFile = await resizeImageToMax800(file)
        } catch {
          // If resize fails, use original file
        }
        newImages.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file: resizedFile,
          preview: URL.createObjectURL(resizedFile),
        })
      } else {
        newFiles.push(file)
      }
    }

    if (newImages.length > 0) {
      setImages((prev) => [...prev, ...newImages].slice(0, MAX_IMAGES))
    }
    if (newFiles.length > 0) {
      setNonImageFiles((prev) => [...prev, ...newFiles])
    }
  }, [images.length])

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id)
      if (img) URL.revokeObjectURL(img.preview)
      return prev.filter((i) => i.id !== id)
    })
  }, [])

  // ── MediaRecorder audio capture ────────────────────────────────────────

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4',
      })
      audioChunksRef.current = []
      waveformDataRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      recorder.start()
      mediaRecorderRef.current = recorder

      // ── AnalyserNode: real-time frequency waveform ─────────────────────
      const audioCtx = new AudioContext()
      audioContextRef.current = audioCtx
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 64  // 32 frequency bins
      analyserRef.current = analyser
      audioCtx.createMediaStreamSource(stream).connect(analyser)

      const freqData = new Uint8Array(analyser.frequencyBinCount) // 32 bins

      const tick = () => {
        analyser.getByteFrequencyData(freqData)
        const bars = Array.from(freqData).map((v) => Math.max(4, (v / 255) * 28 + 4))
        setWaveformBars(bars)
        // Snapshot for persistence: normalize to [0..1]
        waveformDataRef.current = Array.from(freqData).map((v) => v / 255)
        animationFrameRef.current = requestAnimationFrame(tick)
      }
      animationFrameRef.current = requestAnimationFrame(tick)

      setIsRecording(true)
    } catch {
      toast.error('Microphone access denied')
    }
  }, [])

  const stopRecordingAndSend = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (!recorder) return

    // Cancel RAF and close AudioContext
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    audioContextRef.current?.close().catch(() => {})
    audioContextRef.current = null
    analyserRef.current = null

    // Capture waveform snapshot before clearing
    const capturedWaveform = waveformDataRef.current.slice()
    waveformDataRef.current = []
    setWaveformBars(Array(32).fill(4))

    recorder.onstop = () => {
      const mimeType = recorder.mimeType || 'audio/webm'
      const blob = new Blob(audioChunksRef.current, { type: mimeType })
      audioChunksRef.current = []

      // Send immediately via onSend with audioBlob + waveformData snapshot
      onSend?.({
        text: '',
        images: [],
        audioBlob: blob,
        waveformData: capturedWaveform.length > 0 ? capturedWaveform : undefined,
      })
    }
    recorder.stop()
    recorder.stream.getTracks().forEach((t) => t.stop())
    setIsRecording(false)
    mediaRecorderRef.current = null
  }, [onSend])

  // Cleanup MediaRecorder + AudioContext + RAF on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      audioContextRef.current?.close().catch(() => {})
      const recorder = mediaRecorderRef.current
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop()
        recorder.stream.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  // ── Send ───────────────────────────────────────────────────────────────

  const handleSend = useCallback(() => {
    if (!hasContent || isDisabled) return
    onSend?.({
      text: text.trim(),
      images: images.map((i) => i.file),
      ...(nonImageFiles.length > 0 ? { files: nonImageFiles } : {}),
      ...(activeCommand ? { command: activeCommand.id } : {}),
    })
    setText('')
    setActiveCommand(null)
    images.forEach((i) => URL.revokeObjectURL(i.preview))
    setImages([])
    setNonImageFiles([])
    setTimeout(() => {
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    }, 0)
  }, [hasContent, isDisabled, onSend, text, images, nonImageFiles, activeCommand])

  // ── Keyboard ───────────────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      // Shortcut panel navigation
      if (showShortcutPanel && filteredShortcuts.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setShortcutIndex((i) => (i + 1) % filteredShortcuts.length)
          return
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          setShortcutIndex((i) => (i - 1 + filteredShortcuts.length) % filteredShortcuts.length)
          return
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault()
          selectShortcut(filteredShortcuts[shortcutIndex])
          return
        }
        if (e.key === 'Escape') {
          e.preventDefault()
          setShowShortcutPanel(false)
          return
        }
      }

      // Backspace on empty text removes active command
      if (e.key === 'Backspace' && text === '' && activeCommand) {
        e.preventDefault()
        removeCommand()
        return
      }

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend, showShortcutPanel, filteredShortcuts, shortcutIndex, selectShortcut, text, activeCommand, removeCommand],
  )

  // ── Paste images ───────────────────────────────────────────────────────

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      const items = e.clipboardData?.items
      if (!items) return
      const imageFiles: File[] = []
      for (const item of Array.from(items)) {
        if (item.kind === 'file' && ACCEPTED_IMAGE_TYPES.includes(item.type)) {
          const file = item.getAsFile()
          if (file) imageFiles.push(file)
        }
      }
      if (imageFiles.length > 0) {
        e.preventDefault()
        void addFiles(imageFiles)
      }
    },
    [addFiles],
  )

  // ── Drag & drop ────────────────────────────────────────────────────────

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      if (e.dataTransfer?.files) void addFiles(e.dataTransfer.files)
    },
    [addFiles],
  )

  // ── File input change ──────────────────────────────────────────────────

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        void addFiles(e.target.files)
        e.target.value = ''
      }
    },
    [addFiles],
  )

  // ── Emoji select ───────────────────────────────────────────────────────

  const handleEmojiSelect = useCallback((emoji: { native: string }) => {
    setText((prev) => prev + emoji.native)
    setShowEmojiPicker(false)
    ;(textareaRef.current ?? inputRef.current)?.focus()
  }, [])

  // ── Format recording time ──────────────────────────────────────────────

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // ── Hidden file input (shared) ─────────────────────────────────────────

  const hiddenFileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
      multiple
      onChange={handleFileChange}
      className="hidden"
    />
  )

  // ── Emoji picker popover (shared) ──────────────────────────────────────

  const emojiPickerPopover = showEmojiPicker && (
    <div
      ref={emojiPickerRef}
      className="absolute bottom-full left-0 z-50 mb-2"
    >
      <Picker
        data={data}
        onEmojiSelect={handleEmojiSelect}
        theme="dark"
        previewPosition="none"
        skinTonePosition="search"
        maxFrequentRows={2}
      />
    </div>
  )

  // ── Active command chip (shared) ────────────────────────────────────────

  const commandChip = activeCommand && (
    <span className="inline-flex items-center gap-1 rounded-md bg-brand-solid/10 px-2 py-0.5 text-sm font-medium text-brand-secondary">
      /{activeCommand.label}
      <AriaButton
        onPress={removeCommand}
        className="flex items-center justify-center rounded-sm p-0.5 transition duration-100 ease-linear hover:bg-brand-solid/10"
      >
        <XClose className="size-3 text-brand-secondary" />
      </AriaButton>
    </span>
  )

  // ── Shortcut suggestions panel (shared) ────────────────────────────────

  const shortcutPanel = showShortcutPanel && filteredShortcuts.length > 0 && (
    <div
      ref={shortcutPanelRef}
      className="absolute z-50 w-[240px] overflow-hidden rounded-lg border border-secondary bg-primary shadow-lg"
      style={{
        bottom: `calc(100% - ${panelPos.top}px + 4px)`,
        left: `${panelPos.left}px`,
      }}
    >
      <div className="px-3 py-2">
        <p className="text-xs font-semibold text-tertiary">Shortcuts</p>
      </div>
      <div className="max-h-[200px] overflow-y-auto">
        {filteredShortcuts.map((shortcut, i) => {
          const Icon = shortcut.icon
          return (
            <button
              key={shortcut.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault() // prevent blur
                selectShortcut(shortcut)
              }}
              onMouseEnter={() => setShortcutIndex(i)}
              className={cx(
                'flex w-full items-center gap-2 px-3 py-2 text-left transition duration-100 ease-linear',
                i === shortcutIndex
                  ? 'bg-active text-primary'
                  : 'text-secondary hover:bg-primary_hover',
              )}
            >
              {Icon && <Icon className="size-4 shrink-0 text-fg-tertiary" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">/{shortcut.label}</p>
                {shortcut.description && (
                  <p className="truncate text-xs text-tertiary">{shortcut.description}</p>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )

  // ── Image previews (shared) ────────────────────────────────────────────

  const imagePreviews = images.length > 0 && (
    <div className="flex gap-3 overflow-x-auto px-3.5 pt-3 pb-2">
      {images.map((img) => (
        <div key={img.id} className="group relative shrink-0">
          <img
            src={img.preview}
            alt="Attached"
            className="h-[100px] w-auto rounded-lg border border-secondary object-cover"
          />
          <AriaButton
            onPress={() => removeImage(img.id)}
            className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full border border-secondary bg-primary shadow-xs opacity-0 transition duration-100 ease-linear group-hover:opacity-100"
          >
            <XClose className="size-3 text-fg-quaternary" />
          </AriaButton>
        </div>
      ))}
    </div>
  )

  // ── Recording UI ───────────────────────────────────────────────────────
  // Same rounded-md container style as Textarea variant

  if (isRecording) {
    return (
      <div
        className={cx(
          'flex items-center gap-3 rounded-md border border-primary bg-primary px-3 py-2.5 shadow-xs',
          className,
        )}
      >
        <ButtonUtility
          icon={XClose}
          size="xs"
          color="tertiary"
          onClick={() => {
            // Cancel RAF and close AudioContext before stopping recorder
            if (animationFrameRef.current !== null) {
              cancelAnimationFrame(animationFrameRef.current)
              animationFrameRef.current = null
            }
            audioContextRef.current?.close().catch(() => {})
            audioContextRef.current = null
            analyserRef.current = null
            waveformDataRef.current = []
            setWaveformBars(Array(32).fill(4))
            const recorder = mediaRecorderRef.current
            if (recorder && recorder.state !== 'inactive') {
              recorder.stop()
              recorder.stream.getTracks().forEach((t) => t.stop())
            }
            audioChunksRef.current = []
            mediaRecorderRef.current = null
            setIsRecording(false)
          }}
        />

        <div className="flex flex-1 items-center gap-1">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-error-solid opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-error-solid" />
          </span>
          <div className="flex flex-1 items-center gap-px px-2">
            {waveformBars.map((h, i) => (
              <div
                key={i}
                className="w-[3px] rounded-full bg-brand-solid"
                style={{
                  height: `${h}px`,
                  transition: 'height 0.1s ease',
                }}
              />
            ))}
          </div>
        </div>

        <span className="text-xs font-semibold text-tertiary tabular-nums">
          {formatTime(recordingTime)}
        </span>

        <AriaButton
          onPress={stopRecordingAndSend}
          className="flex items-center justify-center rounded-full bg-error-solid p-1.5 text-white transition duration-100 ease-linear hover:opacity-90"
        >
          <StopCircle className="size-4" />
        </AriaButton>
      </div>
    )
  }

  // =====================================================================
  // VARIANT: Minimal
  // Figma node 9206:602510 — Inline input + send icon button, single row
  // Layout: flex row, gap-3, items-start
  // Input: rounded-md, border-primary, bg-primary, shadow-xs, px-[14px] py-[10px], single line
  // Send button: rounded-md, border-primary, shadow-xs-skeuomorphic, p-3, Send01 icon size-5
  // =====================================================================

  if (type === 'minimal') {
    return (
      <div
        className={cx('relative flex items-start gap-3', className)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Input field */}
        <div className="flex flex-1 flex-col">
          {imagePreviews && (
            <div className="mb-1 flex gap-2 overflow-x-auto">
              {images.map((img) => (
                <div key={img.id} className="group relative shrink-0">
                  <img
                    src={img.preview}
                    alt="Attached"
                    className="size-12 rounded-md border border-secondary object-cover"
                  />
                  <AriaButton
                    onPress={() => removeImage(img.id)}
                    className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full border border-secondary bg-primary shadow-xs opacity-0 transition duration-100 ease-linear group-hover:opacity-100"
                  >
                    <XClose className="size-2.5 text-fg-quaternary" />
                  </AriaButton>
                </div>
              ))}
            </div>
          )}
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder ?? defaultPlaceholder}
            disabled={isDisabled}
            className={cx(
              'w-full rounded-md border border-primary bg-primary px-3.5 py-2.5 text-md leading-6 text-primary shadow-xs outline-none',
              'placeholder:text-placeholder disabled:cursor-not-allowed disabled:opacity-50',
              isDragOver && 'border-brand ring-1 ring-brand',
            )}
          />
        </div>

        {/* Send/Stop icon button — morphs to StopCircle during streaming (Phase 102 D-08) */}
        {isStreaming ? (
          <AriaButton
            onPress={() => onAbort?.()}
            aria-label="Stop generation"
            className={cx(
              'flex shrink-0 items-center justify-center rounded-md border border-primary p-3 shadow-xs-skeumorphic transition duration-100 ease-linear',
              'bg-tertiary text-fg-secondary hover:bg-error-solid hover:text-white',
            )}
          >
            <StopCircle className="size-5" />
          </AriaButton>
        ) : (
          <AriaButton
            onPress={handleSend}
            isDisabled={!hasContent || isDisabled}
            className={cx(
              'flex shrink-0 items-center justify-center rounded-md border border-primary bg-primary p-3 shadow-xs-skeumorphic transition duration-100 ease-linear',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'hover:bg-primary_hover',
            )}
          >
            <Send01 className="size-5 text-fg-quaternary" />
          </AriaButton>
        )}

        {hiddenFileInput}
        {emojiPickerPopover}
      </div>
    )
  }

  // =====================================================================
  // VARIANT: Advanced
  // Figma node 9206:602526 — Outer bg-secondary container with inner textarea + bottom toolbar
  // Outer: rounded-xl (12px), bg-secondary, border-secondary, h-[160px]
  // Inner textarea: rounded-xl, border-primary, bg-primary, shadow-xs, flex-1, resize
  // Mic: absolute top-[7px] right-[7px], Microphone02
  // Bottom bar: px-3 py-2, avatar + name + chevron | shortcuts + attach
  // =====================================================================

  if (type === 'advanced') {
    return (
      <div
        className={cx('relative flex flex-col', className)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Image previews — outside, above the main container */}
        {images.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-3">
            {images.map((img) => (
              <div key={img.id} className="group relative shrink-0">
                <img
                  src={img.preview}
                  alt="Attached"
                  className="size-[72px] rounded-xl border border-secondary object-cover"
                />
                <AriaButton
                  onPress={() => removeImage(img.id)}
                  className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full border border-secondary bg-primary shadow-xs opacity-0 transition duration-100 ease-linear group-hover:opacity-100"
                >
                  <XClose className="size-3 text-fg-quaternary" />
                </AriaButton>
              </div>
            ))}
          </div>
        )}

        {/* Main input container */}
        <div className="relative flex min-h-[160px] flex-col items-center rounded-xl border border-secondary bg-secondary">
          {replyTo && (
            <div className="flex items-center gap-2 w-full px-3 py-2 border-b border-secondary bg-secondary rounded-t-xl">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-brand-secondary truncate">
                  Replying to {replyTo.senderName}
                </p>
                <p className="text-xs text-tertiary truncate">{replyTo.text}</p>
              </div>
              <AriaButton
                onPress={onClearReply}
                className="shrink-0 p-0.5 rounded-sm hover:bg-primary_hover transition duration-100 ease-linear"
                aria-label="Cancel reply"
              >
                <XClose className="size-3.5 text-fg-quaternary" />
              </AriaButton>
            </div>
          )}
          {/* Inner textarea area — grows independently, never shrinks */}
          <div className="relative flex w-full flex-1 flex-col">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={activeCommand ? `Message for /${activeCommand.label}...` : (placeholder ?? defaultPlaceholder)}
              disabled={isDisabled}
              rows={1}
              className={cx(
                'w-full flex-1 resize rounded-xl border border-primary bg-primary px-3.5 py-3 text-md leading-6 text-primary shadow-xs outline-none',
                'placeholder:text-placeholder disabled:cursor-not-allowed disabled:opacity-50',
                isDragOver && 'border-brand ring-1 ring-brand',
              )}
            />

            {/* Mic button — Figma: absolute top-[7px] right-[7px], Microphone02 */}
            {!hasContent && (
              <div className="absolute right-[7px] top-[7px]">
                <ButtonUtility
                  icon={Microphone02}
                  size="xs"
                  color="tertiary"
                  onClick={startRecording}
                  tooltip="Voice note"
                />
              </div>
            )}
          </div>

          {/* Bottom toolbar — Figma: px-3 py-2, gap-3 */}
          <div className="flex w-full shrink-0 items-center gap-3 px-3 py-2">
            {/* Left: Avatar + Name + Chevron */}
            <div className="flex flex-1 items-center">
              <div className="flex items-center gap-1">
                <Avatar src={avatarSrc} alt={userName} size="xs" />
                <div className="flex items-center gap-0.5">
                  <span className="text-xs font-semibold text-tertiary">{userName}</span>
                  <ChevronDown className="size-3 text-fg-tertiary" />
                </div>
              </div>
            </div>

            {/* Right: Shortcuts + Attach + Stop (Phase 102 D-08) */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="flex items-center gap-1 text-xs font-semibold text-tertiary transition duration-100 ease-linear hover:text-secondary"
              >
                <ItalicSquare className="size-4 text-fg-tertiary" />
                Shortcuts
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 text-xs font-semibold text-tertiary transition duration-100 ease-linear hover:text-secondary"
              >
                <Attachment01 className="size-4 text-fg-tertiary" />
                Attach
              </button>
              {/* Stop button — visible only during streaming */}
              {isStreaming && (
                <AriaButton
                  onPress={() => onAbort?.()}
                  aria-label="Stop generation"
                  className={cx(
                    'flex items-center justify-center rounded-full p-1.5 transition duration-100 ease-linear',
                    'bg-tertiary text-fg-secondary hover:bg-error-solid hover:text-white',
                  )}
                >
                  <StopCircle className="size-4" />
                </AriaButton>
              )}
            </div>
          </div>

          {/* Command chip + shortcut panel */}
          {activeCommand && (
            <div className="absolute left-3.5 top-3">{commandChip}</div>
          )}
          {shortcutPanel}
        </div>

        {hiddenFileInput}
        {emojiPickerPopover}
      </div>
    )
  }

  // =====================================================================
  // VARIANT: Textarea (default)
  // Figma node 9206:602516 — Multiline textarea with actions overlay
  // Container: rounded-md (8px), border-primary, bg-primary, shadow-xs, min-h-[128px]
  // Textarea: flex-1, px-[14px] py-3, text-md
  // Recording02: absolute top-[8px] right-[8px]
  // Actions: absolute bottom-[8px] right-[14px]
  //   Utilities (gap-0.5): Attachment01 + FaceSmile (ButtonUtility xs tertiary)
  //   "Send" text: text-sm font-semibold text-brand-secondary
  // =====================================================================

  return (
    <div
      className={cx(
        'relative flex min-h-[128px] flex-col rounded-md border bg-primary shadow-xs transition duration-100 ease-linear',
        isDragOver ? 'border-brand ring-1 ring-brand' : 'border-primary',
        className,
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {replyTo && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-secondary bg-secondary rounded-t-md">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-brand-secondary truncate">
              Replying to {replyTo.senderName}
            </p>
            <p className="text-xs text-tertiary truncate">{replyTo.text}</p>
          </div>
          <AriaButton
            onPress={onClearReply}
            className="shrink-0 p-0.5 rounded-sm hover:bg-primary_hover transition duration-100 ease-linear"
            aria-label="Cancel reply"
          >
            <XClose className="size-3.5 text-fg-quaternary" />
          </AriaButton>
        </div>
      )}
      {imagePreviews}

      {/* Command chip — shown above textarea text when a shortcut is active */}
      {activeCommand && (
        <div className="px-3.5 pt-3 pb-0">{commandChip}</div>
      )}

      {/* Textarea — Figma: px-[14px] py-3, text-md, flex-1 */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => handleTextChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={activeCommand ? `Message for /${activeCommand.label}...` : (placeholder ?? defaultPlaceholder)}
        disabled={isDisabled}
        rows={1}
        className={cx(
          'w-full flex-1 resize-none bg-transparent px-3.5 py-3 text-md leading-6 text-primary outline-none',
          'placeholder:text-placeholder disabled:cursor-not-allowed disabled:opacity-50',
          (images.length > 0 || activeCommand) && 'pt-2',
        )}
      />

      {/* Recording button — Figma: absolute right-[8px] top-[8px] */}
      {!hasContent && (
        <div className="absolute right-2 top-2">
          <ButtonUtility
            icon={Recording02}
            size="xs"
            color="tertiary"
            onClick={startRecording}
            tooltip="Voice note"
          />
        </div>
      )}

      {/* Actions row — Figma: absolute bottom-[8px] right-[14px], gap-2 */}
      <div className="absolute bottom-2 right-3.5 flex items-center gap-2">
        <div className="flex items-center gap-0.5">
          <ButtonUtility
            icon={Attachment01}
            size="xs"
            color="tertiary"
            onClick={() => fileInputRef.current?.click()}
            tooltip="Attach image"
          />
          <div ref={emojiButtonRef}>
            <ButtonUtility
              icon={FaceSmile}
              size="xs"
              color="tertiary"
              onClick={() => setShowEmojiPicker((v) => !v)}
              tooltip="Emoji"
            />
          </div>
        </div>

        {/* Send/Stop — morphs to StopCircle during streaming (Phase 102 D-08) */}
        {isStreaming ? (
          <AriaButton
            onPress={() => onAbort?.()}
            aria-label="Stop generation"
            className={cx(
              'flex items-center justify-center rounded-full p-1.5 transition duration-100 ease-linear',
              'bg-tertiary text-fg-secondary hover:bg-error-solid hover:text-white',
            )}
          >
            <StopCircle className="size-4" />
          </AriaButton>
        ) : (
          <AriaButton
            onPress={handleSend}
            isDisabled={!hasContent || isDisabled}
            className={cx(
              'text-sm font-semibold leading-5 transition duration-100 ease-linear',
              hasContent
                ? 'cursor-pointer text-brand-secondary'
                : 'cursor-default text-disabled',
            )}
          >
            Send
          </AriaButton>
        )}
      </div>

      {shortcutPanel}
      {hiddenFileInput}
      {emojiPickerPopover}
    </div>
  )
}
