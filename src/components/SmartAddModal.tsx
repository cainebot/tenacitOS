"use client";

import { useState, useReducer, useRef, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
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
      if (state.phase === 'idle') {
        return { phase: 'detecting', draft: action.payload };
      }
      return state;

    case 'PREVIEW':
      if (state.phase === 'detecting') {
        return { phase: 'preview', draft: action.payload };
      }
      return state;

    case 'EDIT':
      if (state.phase === 'preview' && 'draft' in state) {
        return { phase: 'editing', draft: state.draft };
      }
      return state;

    case 'SUBMIT':
      if ((state.phase === 'preview' || state.phase === 'editing') && 'draft' in state) {
        return { phase: 'submitting', draft: state.draft };
      }
      return state;

    case 'RESET':
      return { phase: 'idle' };

    case 'ERROR':
      if (state.phase === 'detecting') {
        return { phase: 'idle' };
      }
      return state;

    default:
      return state;
  }
}

// --- Async enrichment ---

async function enrichDraft(draft: SkillDraft): Promise<SkillDraft> {
  // GitHub URL: fetch metadata
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

  // Text: call /api/skills/detect for LLM enrichment
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

  // Command, file, unknown: use draft as-is, fill defaults
  return { ...draft, icon: draft.icon ?? '🔧', version: draft.version ?? '1.0.0' };
}

// --- IA interpretation text derivation ---

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

// --- Component props ---

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
  const mainInputRef = useRef<HTMLInputElement>(null);

  // Edit field state — pre-populated when transitioning to editing
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editContent, setEditContent] = useState('');

  // Populate edit fields when transitioning to editing phase
  useEffect(() => {
    if (state.phase === 'editing') {
      setEditName(state.draft.name ?? '');
      setEditDescription(state.draft.description ?? '');
      setEditIcon(state.draft.icon ?? '🔧');
      setEditContent(state.draft.content ?? '');
    }
  }, [state.phase]);

  const interpretationText = getInterpretationText(state);

  // Build edited draft from edit field state
  function buildEditedDraft(): SkillDraft {
    if (state.phase !== 'editing') {
      throw new Error('buildEditedDraft called outside editing phase');
    }
    return {
      ...state.draft,
      name: editName,
      description: editDescription,
      icon: editIcon,
      content: editContent,
    };
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

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && inputValue.trim()) {
      handleDetect(inputValue.trim());
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const pastedText = event.clipboardData.getData('text');
    if (pastedText.trim()) {
      setTimeout(() => {
        handleDetect(pastedText.trim());
      }, 0);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const raw = `__file__:${file.size}:${file.name}\n${content}`;
      handleDetect(raw);
    };
    reader.readAsText(file);

    // Reset file input so the same file can be re-selected
    event.target.value = '';
  }

  const isInputDisabled = state.phase === 'detecting' || state.phase === 'submitting';

  // Input style reused in edit form
  const inputStyle: React.CSSProperties = {
    padding: '8px 10px',
    borderRadius: '6px',
    backgroundColor: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: '13px',
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Skill</DialogTitle>
        </DialogHeader>

        {/* Input wrapper with Add button */}
        <div style={{ position: 'relative', marginTop: '16px' }}>
          <input
            ref={mainInputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={isInputDisabled}
            placeholder="Paste a GitHub URL, npm command, or describe what you need..."
            style={{
              width: '100%',
              padding: '10px 44px 10px 12px',
              borderRadius: '8px',
              backgroundColor: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              boxSizing: 'border-box',
              outline: 'none',
              opacity: isInputDisabled ? 0.6 : 1,
            }}
          />

          {/* Add button popover */}
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <Plus size={16} />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-48 p-1"
            >
              {/* Upload file */}
              <button
                type="button"
                onClick={() => {
                  setPopoverOpen(false);
                  fileInputRef.current?.click();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                Upload file
              </button>

              {/* Paste URL */}
              <button
                type="button"
                onClick={() => {
                  setPopoverOpen(false);
                  setInputValue('https://github.com/');
                  setTimeout(() => mainInputRef.current?.focus(), 0);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                Paste URL
              </button>

              {/* Paste command */}
              <button
                type="button"
                onClick={() => {
                  setPopoverOpen(false);
                  setInputValue('npx skills add ');
                  setTimeout(() => mainInputRef.current?.focus(), 0);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                Paste command
              </button>
            </PopoverContent>
          </Popover>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.skill,.txt"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {/* IA interpretation text */}
        <p
          style={{
            fontSize: '12px',
            fontFamily: 'var(--font-body)',
            color: 'var(--text-secondary)',
            marginTop: '8px',
            minHeight: '18px',
            transition: 'opacity 200ms ease',
            opacity: interpretationText ? 1 : 0,
          }}
        >
          {interpretationText}
        </p>

        {/* Inline error */}
        {inlineError && (
          <p style={{ fontSize: '12px', color: 'var(--negative)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {inlineError}
            {inlineError.includes('Reintentar') ? (
              <button
                type="button"
                onClick={() => {
                  setInlineError(null);
                  if (lastInput) handleDetect(lastInput);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--accent)',
                  padding: 0,
                  fontSize: '12px',
                  fontFamily: 'var(--font-body)',
                  textDecoration: 'underline',
                }}
              >
                Reintentar
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setInlineError(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--negative)',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={12} />
              </button>
            )}
          </p>
        )}

        {/* Preview area */}
        <div style={{ marginTop: '16px' }}>
          {/* discovery_intent: show stub instead of SkillPreviewCard */}
          {(state.phase === 'preview' || state.phase === 'editing' || state.phase === 'submitting') &&
            'draft' in state &&
            state.draft.intent === 'discovery_intent' ? (
            <div
              style={{
                marginTop: '12px',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface-elevated)',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                fontFamily: 'var(--font-body)',
              }}
            >
              Discovery de skills disponible en la próxima versión. Puedes registrar la skill manualmente usando el formulario.
            </div>
          ) : (state.phase === 'preview' || state.phase === 'editing' || state.phase === 'submitting') && 'draft' in state ? (
            <SkillPreviewCard
              draft={state.phase === 'editing' ? buildEditedDraft() : state.draft}
              onConfirm={handleConfirm}
              onEdit={() => dispatch({ type: 'EDIT' })}
              confirming={state.phase === 'submitting'}
            />
          ) : null}

          {/* Edit form — shown when in editing phase */}
          {state.phase === 'editing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  value={editIcon}
                  onChange={(e) => setEditIcon(e.target.value)}
                  style={{ width: '52px', ...inputStyle, textAlign: 'center', fontSize: '20px' }}
                />
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Skill name"
                  style={{ flex: 1, ...inputStyle }}
                />
              </div>
              <input
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Description"
                style={{ ...inputStyle }}
              />
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Skill content (Markdown)"
                rows={6}
                style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontSize: '12px', resize: 'vertical' }}
              />
            </div>
          )}
        </div>

        {/* Fill in manually escape hatch */}
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
            textDecoration: 'underline',
            padding: '4px 0',
          }}
        >
          Fill in manually
        </button>
      </DialogContent>
    </Dialog>
  );
}

export default SmartAddModal;
export { SmartAddModal };
