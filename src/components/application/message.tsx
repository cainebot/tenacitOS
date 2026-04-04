'use client'

import { type ReactNode, useState } from 'react'
import { Avatar, FileTypeIcon, cx } from '@circos/ui'
import { Link03, Play, PlayCircle, PauseCircle, VolumeMax, Maximize01 } from '@untitledui/icons'
import { MessageReaction } from './message-reaction'
import { MessageActionPanel, type MessageAction } from './message-action-panel'
import { MessageStatusIcon, type MessageStatus } from './message-status-icon'

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

function AudioWaveformPlaceholder() {
  return (
    <div className="flex items-center gap-px h-8">
      {Array.from({ length: 40 }, (_, i) => {
        const h = Math.max(4, Math.abs(Math.sin(i * 0.4) * 24 + Math.cos(i * 0.7) * 8))
        return (
          <div
            key={i}
            className="w-[3px] rounded-full bg-brand-solid opacity-40"
            style={{ height: `${h}px` }}
          />
        )
      })}
    </div>
  )
}

function AudioBubble({
  duration,
  isPlaying,
  onPlayPause,
  waveform,
  sent,
}: {
  duration: string
  isPlaying?: boolean
  onPlayPause?: () => void
  waveform?: ReactNode
  sent: boolean
}) {
  const Icon = isPlaying ? PauseCircle : PlayCircle

  return (
    <div
      className={cx(
        'bg-primary border border-secondary overflow-clip p-3 w-full',
        bubbleRadius(sent),
      )}
    >
      <div className="flex gap-2 items-center w-full">
        <button
          type="button"
          onClick={onPlayPause}
          className="shrink-0 text-fg-brand-primary hover:opacity-80 transition duration-100 ease-linear"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          <Icon className="size-8" />
        </button>
        <div className="flex-1 min-w-0 overflow-clip px-px">
          {waveform ?? <AudioWaveformPlaceholder />}
        </div>
        <span className="text-xs text-tertiary shrink-0 whitespace-nowrap">{duration}</span>
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
  onClick,
}: {
  src: string
  alt?: string
  fileName?: string
  fileSize?: string
  sent: boolean
  onClick?: () => void
}) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <button
        type="button"
        onClick={onClick}
        className={cx(
          'relative aspect-[4/3] w-full overflow-clip border-[0.5px] border-[rgba(0,0,0,0.1)] rounded-md',
          onClick ? 'cursor-pointer hover:opacity-95 transition duration-100 ease-linear' : 'cursor-default',
        )}
      >
        <img
          src={src}
          alt={alt ?? fileName ?? 'Image'}
          className="size-full object-cover rounded-md"
        />
      </button>
      {(fileName || fileSize) && (
        <div className="flex gap-1 items-start w-full whitespace-nowrap">
          {fileName && (
            <p className="text-sm font-medium text-secondary truncate flex-1 min-w-0">{fileName}</p>
          )}
          {fileSize && (
            <p className="text-sm text-tertiary shrink-0">{fileSize}</p>
          )}
        </div>
      )}
    </div>
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
        'flex gap-3 items-start relative group',
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
      </div>
    </div>
  )
}
