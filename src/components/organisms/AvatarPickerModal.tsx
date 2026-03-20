'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Upload, Image as ImageIcon } from 'lucide-react'

// ---- Constants ----

const EMOJI_GRID = [
  // Faces & People
  '😀','😎','🤖','👻','🥷','🧙','🧑‍🚀','🧑‍💻','🧑‍🔬','🦸',
  '😈','🤓','🥸','🫡','🤗','😤','🫠','🤩','🥳','😵‍💫',
  // Animals
  '🐱','🐶','🦊','🐸','🐻','🐼','🦁','🐯','🐨','🐵',
  '🐙','🦑','🦄','🐝','🦋','🐢','🦅','🐺','🦖','🐧',
  // Nature & Weather
  '🌟','⚡','🔥','💎','❄️','🌈','☀️','🌙','🌸','🌊',
  '🍄','🌵','🏔️','🌋','☄️','🌪️',
  // Objects & Tech
  '🚀','🛸','💻','🧠','👾','⚙️','🔮','📡','🔬','💡',
  '🎯','🎪','🎭','🎨','🎸','🎲','🗡️','🛡️','📦','🔑',
  // Sports & Activities
  '🏆','🎵','💰','🧩','🎃','🏀','⚽','🎳','🏄','🧗',
  // Symbols & Misc
  '💜','❤️','💚','💙','🧡','💛','🖤','🤍','♠️','♦️',
]

const BG_COLORS = [
  { name: 'slate', hex: '#8B9DB5' },
  { name: 'rose', hex: '#E8A0A0' },
  { name: 'peach', hex: '#E8B88A' },
  { name: 'amber', hex: '#E8D08A' },
  { name: 'mint', hex: '#8AD4A0' },
  { name: 'teal', hex: '#8AC8C4' },
  { name: 'sky', hex: '#8AB8E8' },
  { name: 'lavender', hex: '#A8A0E8' },
  { name: 'purple', hex: '#C4A0E8' },
  { name: 'pink', hex: '#E8A0C8' },
]

const sectionLabel: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
  color: "var(--text-quaternary-500)",
  marginBottom: '8px',
}

// ---- Types ----

export interface AvatarPickerResult {
  avatarType: 'emoji' | 'photo'
  emoji: string
  bgColor: string
  photoFile: File | null
  photoPreview: string | null
}

interface AvatarPickerModalProps {
  open: boolean
  onClose: () => void
  agentName: string
  currentEmoji: string
  currentPhotoPreview: string | null
  currentAvatarType: 'emoji' | 'photo'
  currentBgColor: string
  onConfirm: (result: AvatarPickerResult) => void
}

// ---- Component ----

export function AvatarPickerModal({
  open,
  onClose,
  agentName,
  currentEmoji,
  currentPhotoPreview,
  currentAvatarType,
  currentBgColor,
  onConfirm,
}: AvatarPickerModalProps) {
  const [activeTab, setActiveTab] = useState<'emoji' | 'photo'>(currentAvatarType)
  const [selectedEmoji, setSelectedEmoji] = useState(currentEmoji || agentName.charAt(0).toUpperCase())
  const [selectedColor, setSelectedColor] = useState(currentBgColor || '#8B9DB5')
  const [localPhotoFile, setLocalPhotoFile] = useState<File | null>(null)
  const [localPhotoPreview, setLocalPhotoPreview] = useState<string | null>(currentPhotoPreview)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  // ESC to close
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  // Preview display
  const previewIsPhoto = activeTab === 'photo' && localPhotoPreview
  const previewChar = selectedEmoji || agentName.charAt(0).toUpperCase() || '?'

  const handleFileSelect = (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      alert('Max 2MB')
      return
    }
    setLocalPhotoFile(file)
    setLocalPhotoPreview(URL.createObjectURL(file))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) handleFileSelect(file)
  }

  const handleConfirm = () => {
    onConfirm({
      avatarType: activeTab,
      emoji: activeTab === 'emoji' ? selectedEmoji : (currentEmoji || agentName.charAt(0)),
      bgColor: selectedColor,
      photoFile: activeTab === 'photo' ? localPhotoFile : null,
      photoPreview: activeTab === 'photo' ? localPhotoPreview : null,
    })
  }

  // ---- Color Dot Row (shared) ----
  const ColorDots = () => (
    <>
      <div style={sectionLabel}>Background</div>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
        {BG_COLORS.map((c) => (
          <button
            key={c.hex}
            type="button"
            title={c.name}
            onClick={() => setSelectedColor(c.hex)}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: c.hex,
              border: selectedColor === c.hex ? '2px solid #fff' : '2px solid transparent',
              outline: selectedColor === c.hex ? `2px solid ${c.hex}` : 'none',
              cursor: 'pointer',
              padding: 0,
              flexShrink: 0,
            }}
          />
        ))}
      </div>
    </>
  )

  // ---- Divider ----
  const Divider = () => (
    <div style={{ borderTop: "1px solid var(--border-primary)", margin: '12px 0' }} />
  )

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 200,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '400px',
          maxHeight: '80vh',
          background: 'var(--bg-tertiary)',
          borderRadius: '12px',
          border: "1px solid var(--border-primary)",
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          zIndex: 201,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: "1px solid var(--border-primary)",
          }}
        >
          <span style={{ fontFamily: 'var(--font-sora), system-ui, sans-serif', fontSize: '14px', fontWeight: 700, color: "var(--text-primary-900)" }}>
            Choose Avatar
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: "var(--text-quaternary-500)", padding: '4px' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Live Preview */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0 12px 0' }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: previewIsPhoto ? 'var(--bg-secondary)' : selectedColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              border: '2px solid var(--border-primary)',
            }}
          >
            {previewIsPhoto ? (
              <img src={localPhotoPreview!} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '36px', lineHeight: 1 }}>{previewChar}</span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: "1px solid var(--border-primary)", padding: '0 20px' }}>
          {([
            { id: 'emoji' as const, label: 'Emoji', icon: '😀' },
            { id: 'photo' as const, label: 'Photo', icon: null },
          ]).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px 4px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid var(--brand-600)' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: activeTab === tab.id ? 600 : 500,
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                color: activeTab === tab.id ? 'var(--text-primary-900)' : 'var(--text-quaternary-500)',
              }}
            >
              {tab.icon && <span>{tab.icon}</span>}
              {!tab.icon && <ImageIcon size={13} />}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {/* Emoji Tab */}
          {activeTab === 'emoji' && (
            <>
              {/* Color dots first */}
              <ColorDots />
              <Divider />
              {/* Emoji grid */}
              <div style={sectionLabel}>Emoji</div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  gap: '4px',
                }}
              >
                {EMOJI_GRID.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setSelectedEmoji(em)}
                    style={{
                      width: '100%',
                      aspectRatio: '1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '22px',
                      background: selectedEmoji === em ? 'rgba(255,59,48,0.15)' : 'none',
                      border: selectedEmoji === em ? '2px solid var(--brand-600)' : '2px solid transparent',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Photo Tab */}
          {activeTab === 'photo' && (
            <>
              {/* Color dots first */}
              <ColorDots />
              <Divider />
              <div style={sectionLabel}>Upload</div>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                style={{
                  width: '100%',
                  height: '140px',
                  border: `2px dashed ${dragOver ? 'var(--brand-600)' : 'var(--border-primary)'}`,
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  background: dragOver ? 'rgba(255,59,48,0.05)' : 'var(--bg-secondary)',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                {localPhotoPreview ? (
                  <img
                    src={localPhotoPreview}
                    alt="Upload preview"
                    style={{ maxHeight: '100px', maxWidth: '100%', borderRadius: '6px', objectFit: 'contain' }}
                  />
                ) : (
                  <>
                    <Upload size={24} style={{ color: "var(--text-quaternary-500)" }} />
                    <span style={{ fontSize: '12px', color: "var(--text-quaternary-500)", fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
                      Drag & drop or click to upload
                    </span>
                    <span style={{ fontSize: '10px', color: "var(--text-quaternary-500)" }}>Max 2MB</span>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileSelect(file)
                }}
              />
              {localPhotoPreview && (
                <button
                  type="button"
                  onClick={() => { setLocalPhotoFile(null); setLocalPhotoPreview(null) }}
                  style={{
                    marginTop: '8px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--error-500)',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  }}
                >
                  Remove photo
                </button>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            padding: '12px 20px',
            borderTop: "1px solid var(--border-primary)",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: "1px solid var(--border-primary)",
              background: 'none',
              color: "var(--text-tertiary-600)",
              fontSize: '12px',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: 'var(--brand-600)',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 600,
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              cursor: 'pointer',
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </>
  )
}
