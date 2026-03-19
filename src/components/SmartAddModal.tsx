"use client";

import { useState, useReducer, useRef, useEffect } from 'react';
import { Plus, ArrowUp, Upload, Link, Terminal, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { detectInput } from '@/lib/input-detector';
import { SkillPreviewCard } from '@/components/SkillPreviewCard';
import type { SkillDraft } from '@/types/supabase';

// --- State machine types ---

type ModalState =
  | { phase: 'idle' }
  | { phase: 'detecting'; draft: SkillDraft }
  | { phase: 'preview'; draft: SkillDraft }
  | { phase: 'editing'; draft: SkillDraft }
  | { phase: 'submitting'; draft: SkillDraft };

type ModalAction =
  | { type: 'DETECT'; payload: SkillDraft }
  | { type: 'PREVIEW'; payload: SkillDraft }
  | { type: 'EDIT' }
  | { type: 'SUBMIT' }
  | { type: 'RESET' }
  | { type: 'ERROR' };

function modalReducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case 'DETECT':
      if (state.phase === 'idle') return { phase: 'detecting', draft: action.payload };
      return state;
    case 'PREVIEW':
      if (state.phase === 'detecting') return { phase: 'preview', draft: action.payload };
      return state;
    case 'EDIT':
      if (state.phase === 'preview' && 'draft' in state) return { phase: 'editing', draft: state.draft };
      return state;
    case 'SUBMIT':
      if ((state.phase === 'preview' || state.phase === 'editing') && 'draft' in state) return { phase: 'submitting', draft: state.draft };
      return state;
    case 'RESET':
      return { phase: 'idle' };
    case 'ERROR':
      if (state.phase === 'detecting') return { phase: 'idle' };
      return state;
    default:
      return state;
  }
}

// --- Async enrichment ---

async function enrichDraft(draft: SkillDraft): Promise<SkillDraft> {
  if (draft.type === 'github_url' && draft.source_url) {
    const res = await fetch(`/api/skills/metadata?url=${encodeURIComponent(draft.source_url)}`);
    if (!res.ok) throw new Error('metadata_fetch_failed');
    const meta = await res.json();
    return {
      ...draft,
      name: meta.name ?? draft.name,
      description: meta.description ?? draft.description,
      content: meta.skill_md ?? meta.readme ?? draft.content,
      icon: draft.icon ?? '🔧',
      version: '1.0.0',
    };
  }

  if (draft.type === 'text') {
    const res = await fetch('/api/skills/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: draft.raw_input }),
    });
    if (!res.ok) throw new Error('detect_failed');
    const enriched: SkillDraft = await res.json();
    return { ...enriched, icon: enriched.icon ?? '🔧', version: '1.0.0' };
  }

  return { ...draft, icon: draft.icon ?? '🔧', version: draft.version ?? '1.0.0' };
}

// --- IA interpretation text ---

function getInterpretationText(state: ModalState): string {
  if (state.phase === 'idle') return '';

  if (state.phase === 'detecting') {
    const { draft } = state;
    if (draft.type === 'github_url') return 'Interpreto que quieres registrar una skill desde GitHub. Obteniendo metadata...';
    if (draft.type === 'command') return 'Interpreto que quieres instalar una skill desde el registro. Te preparo una preview.';
    if (draft.type === 'file') return 'Interpreto que quieres registrar una skill desde un archivo. Te preparo una preview.';
    if (draft.type === 'text') return 'Analizando tu descripción...';
    return '';
  }

  if (state.phase === 'preview' || state.phase === 'editing' || state.phase === 'submitting') {
    const { draft } = state;
    if (draft.type === 'github_url') return 'Interpreto que quieres registrar una skill desde GitHub. Te preparo una preview.';
    if (draft.type === 'command') return 'Interpreto que quieres instalar una skill desde el registro. Aquí está la preview.';
    if (draft.type === 'file') return 'Interpreto que quieres registrar una skill desde un archivo. Aquí está la preview.';
    if (draft.type === 'text') {
      if (draft.intent === 'skill_description') return 'Interpreto que quieres registrar una skill propia. Te preparo una preview.';
      if (draft.intent === 'discovery_intent') return 'Interpreto que buscas una skill existente. Discovery disponible en próxima versión.';
    }
    return '';
  }

  return '';
}

// --- Detection badge label ---

function getDetectionBadge(state: ModalState): { label: string; variant: 'default' | 'accent' | 'success' | 'outline' } | null {
  if (state.phase === 'idle') return null;
  if (!('draft' in state)) return null;
  const { draft } = state;
  switch (draft.type) {
    case 'github_url': return { label: 'GitHub URL', variant: 'accent' };
    case 'command': return { label: 'npx command', variant: 'success' };
    case 'file': return { label: 'File upload', variant: 'default' };
    case 'text': return { label: 'Text', variant: 'outline' };
    default: return null;
  }
}

// --- Component ---

interface SmartAddModalProps {
  onClose: () => void;
  onCreated: () => void;
  onToast?: (msg: string) => void;
  onManual?: () => void;
}

function SmartAddModal({ onClose, onCreated, onToast, onManual }: SmartAddModalProps) {
  const [state, dispatch] = useReducer(modalReducer, { phase: 'idle' });
  const [inputValue, setInputValue] = useState('');
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [lastInput, setLastInput] = useState<string | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Edit field state
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    if (state.phase === 'editing') {
      setEditName(state.draft.name ?? '');
      setEditDescription(state.draft.description ?? '');
      setEditIcon(state.draft.icon ?? '🔧');
      setEditContent(state.draft.content ?? '');
    }
  }, [state.phase]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    }
  }, [inputValue]);

  const interpretationText = getInterpretationText(state);
  const detectionBadge = getDetectionBadge(state);

  function buildEditedDraft(): SkillDraft {
    if (state.phase !== 'editing') throw new Error('buildEditedDraft called outside editing phase');
    return { ...state.draft, name: editName, description: editDescription, icon: editIcon, content: editContent };
  }

  const handleDetect = async (raw: string) => {
    setInlineError(null);
    const syncDraft = detectInput(raw);

    if (syncDraft.size_error) {
      setInlineError('El archivo supera el límite de 500KB. Usa el formulario manual.');
      return;
    }

    dispatch({ type: 'DETECT', payload: syncDraft });

    try {
      const enriched = await enrichDraft(syncDraft);
      dispatch({ type: 'PREVIEW', payload: enriched });
    } catch {
      setInlineError('No se pudo obtener metadata. ¿Reintentar?');
      setLastInput(raw);
      dispatch({ type: 'ERROR' });
    }
  };

  const handleConfirm = async () => {
    const draft = state.phase === 'editing' ? buildEditedDraft() : (state as { phase: 'preview' | 'submitting'; draft: SkillDraft }).draft;
    if (!draft.name?.trim()) {
      setInlineError('El nombre de la skill es obligatorio.');
      return;
    }
    dispatch({ type: 'SUBMIT' });
    try {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name.trim(),
          description: draft.description ?? '',
          icon: draft.icon ?? '🔧',
          origin: draft.origin ?? 'local',
          source_url: draft.source_url ?? null,
          content: draft.content ?? null,
          version: draft.version ?? '1.0.0',
        }),
      });
      if (res.ok) {
        onToast?.('Skill registered successfully');
        onCreated();
        onClose();
      } else {
        const err = await res.json().catch(() => ({ error: 'unknown' }));
        setInlineError(`Error al registrar: ${err.error ?? 'unknown'}`);
        dispatch({ type: 'RESET' });
      }
    } catch {
      setInlineError('Error de red. Inténtalo de nuevo.');
      dispatch({ type: 'RESET' });
    }
  };

  function handleSubmit() {
    if (inputValue.trim()) {
      handleDetect(inputValue.trim());
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && inputValue.trim()) {
      event.preventDefault();
      handleDetect(inputValue.trim());
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    const pastedText = event.clipboardData.getData('text');
    if (pastedText.trim()) {
      setTimeout(() => handleDetect(pastedText.trim()), 0);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      handleDetect(`__file__:${file.size}:${file.name}\n${content}`);
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  const isInputDisabled = state.phase === 'detecting' || state.phase === 'submitting';
  const hasInput = inputValue.trim().length > 0;

  // Edit form input style
  const editInputStyle: React.CSSProperties = {
    padding: '8px 10px',
    borderRadius: '8px',
    backgroundColor: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: '13px',
    outline: 'none',
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl p-0 overflow-visible">
        {/* Chat-style input container */}
        <div style={{
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0',
        }}>
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={isInputDisabled}
            placeholder="Paste a GitHub URL, command, or describe the skill you need..."
            rows={1}
            style={{
              width: '100%',
              resize: 'none',
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              lineHeight: '1.5',
              padding: '8px 4px',
              minHeight: '44px',
              maxHeight: '200px',
              opacity: isInputDisabled ? 0.5 : 1,
            }}
          />

          {/* Bottom toolbar: + button left, send button right */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '4px',
          }}>
            {/* Left side: + button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    style={{
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      border: '1px solid var(--border)',
                      backgroundColor: 'transparent',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      padding: 0,
                      transition: 'background-color 150ms, color 150ms',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--surface-elevated)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    <Plus size={18} />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-48 p-1">
                  <button
                    type="button"
                    onClick={() => { setPopoverOpen(false); fileInputRef.current?.click(); }}
                    className="popover-item"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                      padding: '8px 10px', borderRadius: '6px', border: 'none',
                      backgroundColor: 'transparent', color: 'var(--text-primary)',
                      fontFamily: 'var(--font-body)', fontSize: '13px', cursor: 'pointer', textAlign: 'left',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <Upload size={14} style={{ color: 'var(--text-muted)' }} />
                    Upload file
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPopoverOpen(false); setInputValue('https://github.com/'); setTimeout(() => textareaRef.current?.focus(), 0); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                      padding: '8px 10px', borderRadius: '6px', border: 'none',
                      backgroundColor: 'transparent', color: 'var(--text-primary)',
                      fontFamily: 'var(--font-body)', fontSize: '13px', cursor: 'pointer', textAlign: 'left',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <Link size={14} style={{ color: 'var(--text-muted)' }} />
                    Paste URL
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPopoverOpen(false); setInputValue('npx skills add '); setTimeout(() => textareaRef.current?.focus(), 0); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                      padding: '8px 10px', borderRadius: '6px', border: 'none',
                      backgroundColor: 'transparent', color: 'var(--text-primary)',
                      fontFamily: 'var(--font-body)', fontSize: '13px', cursor: 'pointer', textAlign: 'left',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <Terminal size={14} style={{ color: 'var(--text-muted)' }} />
                    Paste command
                  </button>
                </PopoverContent>
              </Popover>
            </div>

            {/* Right side: send button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!hasInput || isInputDisabled}
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: hasInput && !isInputDisabled ? 'var(--text-primary)' : 'var(--surface-elevated)',
                color: hasInput && !isInputDisabled ? 'var(--surface)' : 'var(--text-muted)',
                cursor: hasInput && !isInputDisabled ? 'pointer' : 'default',
                padding: 0,
                transition: 'background-color 150ms, color 150ms',
              }}
            >
              <ArrowUp size={18} />
            </button>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.skill,.txt"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {/* Below input: IA interpretation + errors + preview */}
        {(interpretationText || inlineError || state.phase !== 'idle') && (
          <div style={{
            padding: '0 16px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            {/* Detection badge + IA interpretation */}
            {(detectionBadge || interpretationText) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {detectionBadge && (
                  <Badge variant={detectionBadge.variant}>
                    Detected: {detectionBadge.label}
                  </Badge>
                )}
                {interpretationText && (
                  <p style={{
                    fontSize: '13px',
                    fontFamily: 'var(--font-body)',
                    color: 'var(--text-secondary)',
                    margin: 0,
                    lineHeight: '1.5',
                    transition: 'opacity 200ms ease',
                  }}>
                    {interpretationText}
                  </p>
                )}
              </div>
            )}

            {/* Inline error */}
            {inlineError && (
              <p style={{
                fontSize: '13px',
                color: 'var(--negative)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                {inlineError}
                {inlineError.includes('Reintentar') ? (
                  <button
                    type="button"
                    onClick={() => { setInlineError(null); if (lastInput) handleDetect(lastInput); }}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--accent)', padding: 0, fontSize: '13px',
                      fontFamily: 'var(--font-body)', textDecoration: 'underline',
                    }}
                  >
                    Reintentar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setInlineError(null)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--negative)', padding: 0, display: 'flex', alignItems: 'center',
                    }}
                  >
                    <X size={12} />
                  </button>
                )}
              </p>
            )}

            {/* Discovery intent stub */}
            {(state.phase === 'preview' || state.phase === 'editing' || state.phase === 'submitting') &&
              'draft' in state && state.draft.intent === 'discovery_intent' && (
              <div style={{
                padding: '14px 16px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface-elevated)',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                fontFamily: 'var(--font-body)',
              }}>
                Discovery de skills disponible en la próxima versión. Puedes registrar la skill manualmente usando el formulario.
              </div>
            )}

            {/* Preview card */}
            {(state.phase === 'preview' || state.phase === 'editing' || state.phase === 'submitting') &&
              'draft' in state && state.draft.intent !== 'discovery_intent' && (
              <SkillPreviewCard
                draft={state.phase === 'editing' ? buildEditedDraft() : state.draft}
                onConfirm={handleConfirm}
                onEdit={() => dispatch({ type: 'EDIT' })}
                confirming={state.phase === 'submitting'}
              />
            )}

            {/* Edit form */}
            {state.phase === 'editing' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    value={editIcon}
                    onChange={(e) => setEditIcon(e.target.value)}
                    style={{ width: '48px', ...editInputStyle, textAlign: 'center', fontSize: '20px' }}
                  />
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Skill name"
                    style={{ flex: 1, ...editInputStyle }}
                  />
                </div>
                <input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Description"
                  style={editInputStyle}
                />
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Skill content (Markdown)"
                  rows={5}
                  style={{ ...editInputStyle, fontFamily: 'var(--font-mono)', fontSize: '12px', resize: 'vertical' }}
                />
              </div>
            )}
          </div>
        )}

        {/* Fill in manually — always visible at bottom */}
        <div style={{
          padding: '0 16px 12px',
          textAlign: 'center',
        }}>
          <button
            type="button"
            onClick={() => onManual ? onManual() : onClose()}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              fontSize: '12px',
              fontFamily: 'var(--font-body)',
              padding: '4px 8px',
              borderRadius: '4px',
              transition: 'color 150ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            Fill in manually
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SmartAddModal;
export { SmartAddModal };
