'use client'

import { useState, useRef, useCallback } from 'react'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

// Native contenteditable rich text editor — replaces tiptap while
// Next.js 16 + Turbopack has a bug resolving @tiptap/pm subpath exports.
// Same interface: accepts HTML string value, emits HTML on change.
export function CardRichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const [isFocused, setIsFocused] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const handleInput = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onChangeRef.current(editorRef.current?.innerHTML ?? '')
    }, 500)
  }, [])

  const handleBlur = useCallback(() => {
    setIsFocused(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    onChangeRef.current(editorRef.current?.innerHTML ?? '')
  }, [])

  const exec = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value)
    editorRef.current?.focus()
  }

  const btnStyle = (active?: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, borderRadius: 4, border: 'none', cursor: 'pointer',
    background: active ? 'var(--brand-600)' : 'transparent',
    color: active ? '#fff' : 'var(--text-tertiary-600)',
    fontSize: 12, fontWeight: 600, flexShrink: 0,
  })

  return (
    <div style={{
      border: `1px solid ${isFocused ? 'var(--brand-600)' : 'var(--border-primary)'}`,
      borderRadius: 6, overflow: 'hidden', transition: 'border-color 0.15s',
      background: 'var(--bg-secondary)',
    }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 2, padding: '4px 6px',
        borderBottom: "1px solid var(--border-primary)", background: 'var(--bg-secondary)',
        opacity: isFocused ? 1 : 0.6, transition: 'opacity 0.15s',
      }}>
        <button type="button" title="Bold" style={btnStyle()} onMouseDown={(e) => { e.preventDefault(); exec('bold') }}>B</button>
        <button type="button" title="Italic" style={{ ...btnStyle(), fontStyle: 'italic' }} onMouseDown={(e) => { e.preventDefault(); exec('italic') }}>I</button>
        <button type="button" title="Underline" style={{ ...btnStyle(), textDecoration: 'underline' }} onMouseDown={(e) => { e.preventDefault(); exec('underline') }}>U</button>
        <div style={{ width: 1, background: 'var(--border-primary)', margin: '2px 2px' }} />
        <button type="button" title="Bullet list" style={btnStyle()} onMouseDown={(e) => { e.preventDefault(); exec('insertUnorderedList') }}>• —</button>
        <button type="button" title="Numbered list" style={btnStyle()} onMouseDown={(e) => { e.preventDefault(); exec('insertOrderedList') }}>1.</button>
        <div style={{ width: 1, background: 'var(--border-primary)', margin: '2px 2px' }} />
        <button type="button" title="Clear formatting" style={btnStyle()} onMouseDown={(e) => { e.preventDefault(); exec('removeFormat') }}>Tx</button>
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: value ?? '' }}
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        data-placeholder={placeholder ?? 'Add a description...'}
        style={{
          minHeight: 120, padding: '8px 12px', outline: 'none',
          fontFamily: 'var(--font-inter), system-ui, sans-serif', fontSize: 13, lineHeight: 1.6,
          color: "var(--text-primary-900)", wordBreak: 'break-word',
        }}
      />

      <style>{`
        [contenteditable]:empty:before { content: attr(data-placeholder); color: var(--text-quaternary-500); pointer-events: none; }
        [contenteditable] b, [contenteditable] strong { font-weight: 700; }
        [contenteditable] i, [contenteditable] em { font-style: italic; }
        [contenteditable] ul { margin: 0 0 8px 0; padding-left: 20px; list-style-type: disc; }
        [contenteditable] ol { margin: 0 0 8px 0; padding-left: 20px; }
        [contenteditable] li { margin-bottom: 2px; }
      `}</style>
    </div>
  )
}
