'use client'

import { useEffect, useCallback, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Link as LinkIcon,
} from 'lucide-react'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

const toolbarButtonStyle = (active: boolean): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '28px',
  height: '28px',
  borderRadius: '4px',
  border: 'none',
  cursor: 'pointer',
  background: active ? 'var(--accent, #6366f1)' : 'transparent',
  color: active ? '#fff' : 'var(--text-secondary)',
  transition: 'background 0.1s, color 0.1s',
  flexShrink: 0,
})

export function CardRichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  // Debounce timer ref
  const debounceRef = { current: null as ReturnType<typeof setTimeout> | null }

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: placeholder ?? 'Add a description...',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        onChange(editor.getHTML())
      }, 500)
    },
    onFocus: () => setIsFocused(true),
    onBlur: ({ editor }) => {
      setIsFocused(false)
      // Immediate save on blur
      if (debounceRef.current) clearTimeout(debounceRef.current)
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        style: [
          'min-height: 120px',
          'outline: none',
          'font-family: var(--font-body)',
          'font-size: 13px',
          'line-height: 1.6',
          'color: var(--text-primary)',
          'word-break: break-word',
        ].join('; '),
      },
    },
  })

  // Sync external value changes (e.g., navigating to different card)
  useEffect(() => {
    if (editor && !editor.isFocused) {
      const current = editor.getHTML()
      if (current !== value) {
        editor.commands.setContent(value ?? '', false)
      }
    }
  }, [value, editor])

  const insertLink = useCallback(() => {
    if (!editor || !linkUrl) return
    if (editor.state.selection.empty) {
      editor.chain().focus().setLink({ href: linkUrl }).insertContent(linkUrl).run()
    } else {
      editor.chain().focus().setLink({ href: linkUrl }).run()
    }
    setLinkUrl('')
    setShowLinkInput(false)
  }, [editor, linkUrl])

  if (!editor) return null

  const containerStyle: React.CSSProperties = {
    border: `1px solid ${isFocused ? 'var(--accent, #6366f1)' : 'var(--border)'}`,
    borderRadius: '6px',
    overflow: 'hidden',
    transition: 'border-color 0.15s',
    background: 'var(--surface)',
  }

  const toolbarStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '2px',
    padding: '4px 6px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--surface)',
    opacity: isFocused ? 1 : 0.6,
    transition: 'opacity 0.15s',
  }

  const editorAreaStyle: React.CSSProperties = {
    padding: '8px 12px',
  }

  return (
    <div style={containerStyle}>
      {/* Formatting toolbar */}
      <div style={toolbarStyle}>
        {/* Headings */}
        <button
          type="button"
          title="Heading 1"
          style={toolbarButtonStyle(editor.isActive('heading', { level: 1 }))}
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 1 }).run() }}
        >
          <Heading1 size={14} />
        </button>
        <button
          type="button"
          title="Heading 2"
          style={toolbarButtonStyle(editor.isActive('heading', { level: 2 }))}
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run() }}
        >
          <Heading2 size={14} />
        </button>
        <button
          type="button"
          title="Heading 3"
          style={toolbarButtonStyle(editor.isActive('heading', { level: 3 }))}
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 3 }).run() }}
        >
          <Heading3 size={14} />
        </button>

        <div style={{ width: '1px', background: 'var(--border)', margin: '2px 2px' }} />

        {/* Inline formats */}
        <button
          type="button"
          title="Bold"
          style={toolbarButtonStyle(editor.isActive('bold'))}
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run() }}
        >
          <Bold size={14} />
        </button>
        <button
          type="button"
          title="Italic"
          style={toolbarButtonStyle(editor.isActive('italic'))}
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run() }}
        >
          <Italic size={14} />
        </button>
        <button
          type="button"
          title="Strikethrough"
          style={toolbarButtonStyle(editor.isActive('strike'))}
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleStrike().run() }}
        >
          <Strikethrough size={14} />
        </button>
        <button
          type="button"
          title="Code"
          style={toolbarButtonStyle(editor.isActive('code'))}
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleCode().run() }}
        >
          <Code size={14} />
        </button>

        <div style={{ width: '1px', background: 'var(--border)', margin: '2px 2px' }} />

        {/* Lists */}
        <button
          type="button"
          title="Bullet List"
          style={toolbarButtonStyle(editor.isActive('bulletList'))}
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run() }}
        >
          <List size={14} />
        </button>
        <button
          type="button"
          title="Ordered List"
          style={toolbarButtonStyle(editor.isActive('orderedList'))}
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run() }}
        >
          <ListOrdered size={14} />
        </button>
        <button
          type="button"
          title="Blockquote"
          style={toolbarButtonStyle(editor.isActive('blockquote'))}
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBlockquote().run() }}
        >
          <Quote size={14} />
        </button>

        <div style={{ width: '1px', background: 'var(--border)', margin: '2px 2px' }} />

        {/* Link */}
        <button
          type="button"
          title="Insert Link"
          style={toolbarButtonStyle(editor.isActive('link') || showLinkInput)}
          onMouseDown={(e) => { e.preventDefault(); setShowLinkInput(!showLinkInput) }}
        >
          <LinkIcon size={14} />
        </button>
      </div>

      {/* Link input */}
      {showLinkInput && (
        <div style={{ display: 'flex', gap: '6px', padding: '6px 8px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
          <input
            type="url"
            placeholder="https://..."
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); insertLink() }
              if (e.key === 'Escape') { setShowLinkInput(false); setLinkUrl('') }
            }}
            autoFocus
            style={{
              flex: 1,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              padding: '3px 8px',
              fontSize: '12px',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
              outline: 'none',
            }}
          />
          <button
            type="button"
            onClick={insertLink}
            style={{
              background: 'var(--accent, #6366f1)',
              border: 'none',
              borderRadius: '4px',
              padding: '3px 10px',
              cursor: 'pointer',
              color: '#fff',
              fontSize: '12px',
              fontFamily: 'var(--font-body)',
            }}
          >
            Insert
          </button>
          <button
            type="button"
            onClick={() => { setShowLinkInput(false); setLinkUrl('') }}
            style={{
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              padding: '3px 8px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              fontSize: '12px',
              fontFamily: 'var(--font-body)',
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Editor content */}
      <div style={editorAreaStyle}>
        <EditorContent editor={editor} />
      </div>

      {/* Tiptap content styles */}
      <style>{`
        .tiptap p { margin: 0 0 8px 0; }
        .tiptap p:last-child { margin-bottom: 0; }
        .tiptap h1 { font-size: 18px; font-weight: 700; margin: 0 0 8px 0; color: var(--text-primary); }
        .tiptap h2 { font-size: 16px; font-weight: 600; margin: 0 0 8px 0; color: var(--text-primary); }
        .tiptap h3 { font-size: 14px; font-weight: 600; margin: 0 0 6px 0; color: var(--text-primary); }
        .tiptap ul, .tiptap ol { margin: 0 0 8px 16px; padding: 0; }
        .tiptap li { margin-bottom: 2px; }
        .tiptap blockquote { border-left: 3px solid var(--accent, #6366f1); margin: 0 0 8px 0; padding-left: 12px; color: var(--text-secondary); font-style: italic; }
        .tiptap code { background: var(--surface, rgba(0,0,0,0.2)); border-radius: 3px; padding: 1px 4px; font-size: 12px; font-family: monospace; }
        .tiptap a { color: var(--accent, #6366f1); text-decoration: underline; }
        .tiptap .is-editor-empty:first-child::before { content: attr(data-placeholder); color: var(--text-muted); pointer-events: none; float: left; height: 0; }
      `}</style>
    </div>
  )
}
