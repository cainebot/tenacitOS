'use client'

import ReactMarkdown from 'react-markdown'
import { cx } from '@circos/ui'

interface MarkdownBodyProps {
  content: string
  className?: string
}

/**
 * MarkdownBody — lightweight react-markdown wrapper with CircOS token styling.
 * Used by TranscriptToolCard and TranscriptThinkingBlock for rendered agent output.
 */
export function MarkdownBody({ content, className }: MarkdownBodyProps) {
  return (
    <div
      className={cx(
        'prose prose-sm max-w-none text-secondary',
        '[&_code]:rounded [&_code]:bg-secondary [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-code [&_code]:text-xs [&_code]:text-primary',
        '[&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-secondary [&_pre]:px-3 [&_pre]:py-2',
        '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
        '[&_p]:mb-2 [&_p:last-child]:mb-0',
        '[&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-4',
        '[&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-4',
        '[&_li]:mb-0.5',
        '[&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-primary',
        '[&_h2]:mb-1.5 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-primary',
        '[&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-medium [&_h3]:text-primary',
        '[&_blockquote]:border-l-2 [&_blockquote]:border-secondary [&_blockquote]:pl-3 [&_blockquote]:text-tertiary',
        '[&_strong]:text-primary [&_strong]:font-semibold',
        '[&_a]:text-brand-secondary [&_a]:underline [&_a:hover]:text-brand-primary',
        className,
      )}
    >
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  )
}
