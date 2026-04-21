import React from 'react'

export const MENTION_REGEX = /@([\w-]+)/gi

/**
 * Parse all @mentions from a string.
 * Returns an array of mention names (without the @ prefix).
 * Case-insensitive: @Pomni and @pomni both match (GROUP-04, D-11).
 */
export function parseMentions(text: string): string[] {
  const matches: string[] = []
  const regex = new RegExp(MENTION_REGEX.source, 'gi')
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1])
  }
  return matches
}

/**
 * Split text into an array of React nodes where @mentions are highlighted.
 * Mention spans get an accent background and color.
 */
export function renderMentionText(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const regex = new RegExp(MENTION_REGEX.source, 'gi')
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = regex.exec(text)) !== null) {
    const start = match.index
    const end = regex.lastIndex

    // Plain text before this mention
    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start))
    }

    // Highlighted mention span
    parts.push(
      React.createElement(
        'span',
        {
          key: key++,
          style: {
            background: 'rgba(99, 102, 241, 0.15)',
            color: 'var(--brand-600)',
            borderRadius: '3px',
            padding: '0 2px',
            fontWeight: 500,
          },
        },
        match[0],
      ),
    )

    lastIndex = end
  }

  // Remaining plain text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts
}
