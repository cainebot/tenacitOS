"use client";

import { useState, useReducer, useRef, useEffect } from 'react';
import { Plus, ArrowUp, Upload, Link, Terminal, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { detectInput } from '@/lib/input-detector';
import { SkillPreviewCard } from '@/components/SkillPreviewCard';
import type { SkillDraft, DiscoveredSkill } from '@/types/supabase';
import { DiscoveryPanel } from '@/components/DiscoveryPanel';
import { motion, AnimatePresence } from 'motion/react';

// --- State machine types ---

type ModalState =
  | { phase: 'idle' }
  | { phase: 'detecting'; draft: SkillDraft }
  | { phase: 'preview'; draft: SkillDraft }
  | { phase: 'submitting'; draft: SkillDraft };

type ModalAction =
  | { type: 'DETECT'; payload: SkillDraft }
  | { type: 'PREVIEW'; payload: SkillDraft }
  | { type: 'SUBMIT' }
  | { type: 'RESET' }
  | { type: 'ERROR' }
  | { type: 'DISCOVERY_SELECT'; payload: SkillDraft }
  | { type: 'UPDATE_DRAFT'; payload: SkillDraft };

function modalReducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case 'DETECT':
      if (state.phase === 'idle') return { phase: 'detecting', draft: action.payload };
      return state;
    case 'PREVIEW':
      if (state.phase === 'detecting') return { phase: 'preview', draft: action.payload };
      return state;
    case 'UPDATE_DRAFT':
      if (state.phase === 'preview') return { phase: 'preview', draft: action.payload };
      return state;
    case 'SUBMIT':
      if ((state.phase === 'preview') && 'draft' in state) return { phase: 'submitting', draft: state.draft };
      return state;
    case 'RESET':
      return { phase: 'idle' };
    case 'ERROR':
      if (state.phase === 'detecting') return { phase: 'idle' };
      return state;
    case 'DISCOVERY_SELECT':
      if (state.phase === 'preview') return { phase: 'preview', draft: action.payload };
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

// --- Source chip helper ---

function getSourceChip(draft: SkillDraft): { label: string; icon: string } | null {
  if (draft.type === 'file') {
    const fileMatch = draft.raw_input?.match(/^__file__:\d+:(.+?)(\n|$)/);
    return { label: fileMatch?.[1] ?? 'File', icon: '\u{1F4CE}' };
  }
  if (draft.type === 'github_url' && draft.source_url) {
    const parts = draft.source_url.replace('https://github.com/', '').split('/');
    return { label: `${parts[0]}/${parts[1]}`, icon: '\u{1F517}' };
  }
  if (draft.type === 'command') {
    return { label: draft.raw_input?.slice(0, 30) ?? 'Command', icon: '\u{2328}\u{FE0F}' };
  }
  return null;
}

// --- CAINE contextual review message ---

function getReviewMessage(draft: SkillDraft): string {
  if (draft.type === 'github_url') return 'GitHub repo detected. Review the skill before registering.';
  if (draft.type === 'command') return 'Skill found in registry. Review before registering.';
  if (draft.type === 'file') return 'Archivo procesado. Revisa los datos antes de confirmar.';
  if (draft.type === 'text' && draft.intent === 'skill_description') return 'Detecto que quieres registrar una skill. Revisa el borrador.';
  if (draft.type === 'text' && draft.intent === 'discovery_intent') return 'Skill encontrada. Revisa los datos antes de confirmar.';
  return 'Review the skill draft before registering.';
}

// --- Detection badge ---

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

// --- Detecting interpretation text ---

function getDetectingText(draft: SkillDraft): string {
  if (draft.type === 'github_url') return 'GitHub repo detected. Fetching metadata...';
  if (draft.type === 'command') return 'npx command detected. Looking up registry...';
  if (draft.type === 'file') return 'File received. Processing content...';
  if (draft.type === 'text') return 'Analyzing input...';
  return '';
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
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isReviewMode = state.phase === 'preview' || state.phase === 'submitting';
  const isDetecting = state.phase === 'detecting';
  const isInputDisabled = isDetecting || state.phase === 'submitting';
  const hasInput = inputValue.trim().length > 0;
  const detectionBadge = getDetectionBadge(state);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    }
  }, [inputValue]);

  const handleDraftChange = (updated: SkillDraft) => {
    dispatch({ type: 'UPDATE_DRAFT', payload: updated });
  };

  const handleCancel = () => {
    dispatch({ type: 'RESET' });
    setInlineError(null);
    setInputValue('');
  };

  const handleDetect = async (raw: string) => {
    setInlineError(null);
    setInputValue('');
    const syncDraft = detectInput(raw);

    if (syncDraft.size_error) {
      setInlineError('El archivo supera el limite de 500KB. Usa el formulario manual.');
      return;
    }

    dispatch({ type: 'DETECT', payload: syncDraft });

    try {
      const enriched = await enrichDraft(syncDraft);
      dispatch({ type: 'PREVIEW', payload: enriched });
    } catch {
      setInlineError('No se pudo obtener metadata. \u00bfReintentar?');
      setLastInput(raw);
      dispatch({ type: 'ERROR' });
    }
  };

  const handleConfirm = async () => {
    const draft = (state as { phase: 'preview' | 'submitting'; draft: SkillDraft }).draft;
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
      setInlineError('Error de red. Intentalo de nuevo.');
      dispatch({ type: 'RESET' });
    }
  };

  const handleDiscoverySelect = async (skill: DiscoveredSkill) => {
    let content: string | undefined;
    try {
      const res = await fetch(`/api/skills/discover/content?slug=${encodeURIComponent(skill.slug)}`);
      if (res.ok) {
        const data = await res.json();
        if (typeof data.content === 'string') content = data.content;
      }
    } catch {
      // content remains undefined
    }

    const draft: SkillDraft = {
      type: 'text',
      confidence: 'HIGH',
      intent: 'discovery_intent',
      name: skill.displayName,
      description: skill.summary ?? '',
      icon: '🔧',
      origin: 'skills_sh',
      source_url: `https://clawhub.ai/${skill.slug}`,
      content,
      version: skill.version ?? '1.0.0',
      raw_input: `discovery:${skill.slug}`,
    };

    dispatch({ type: 'DISCOVERY_SELECT', payload: draft });
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

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    if (isInputDisabled) return;
    const file = event.dataTransfer.files[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['md', 'skill', 'txt'].includes(ext ?? '')) {
      setInlineError('Solo se aceptan archivos .md, .skill o .txt');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      handleDetect(`__file__:${file.size}:${file.name}\n${content}`);
    };
    reader.readAsText(file);
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  // --- Source chip data (when in review mode) ---
  const sourceChip = isReviewMode && 'draft' in state ? getSourceChip(state.draft) : null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl p-0 flex flex-col">
        <div style={{ overflowY: 'auto', flex: '1 1 auto', minHeight: 0 }}>

          {/* ========== REVIEW SECTION (visible in preview/submitting) ========== */}
          <AnimatePresence>
            {isReviewMode && 'draft' in state && (
              <motion.div
                key="review-section"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                {/* Review header: CAINE message + source chip */}
                <div style={{
                  padding: '24px 24px 0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{
                      fontSize: '9px',
                      fontFamily: 'var(--font-body)',
                      color: 'var(--accent)',
                      fontWeight: 600,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase' as const,
                      opacity: 0.7,
                    }}>
                      Caine
                    </span>
                    <p style={{
                      fontSize: '14px',
                      fontFamily: 'var(--font-body)',
                      color: 'var(--text-muted)',
                      margin: '4px 0 0',
                      lineHeight: '1.4',
                    }}>
                      {getReviewMessage(state.draft)}
                    </p>
                  </div>

                  {sourceChip && (
                    <span style={{
                      fontSize: '12px',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-muted)',
                      backgroundColor: 'var(--surface-elevated)',
                      padding: '4px 10px',
                      borderRadius: '16px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      flexShrink: 0,
                      whiteSpace: 'nowrap' as const,
                    }}>
                      {sourceChip.icon} {sourceChip.label}
                    </span>
                  )}
                </div>

                {/* Skill card */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: 'easeOut', delay: 0.08 }}
                  style={{ padding: '16px 24px' }}
                >
                  {/* Discovery panel (if discovery_intent without source_url) */}
                  {state.draft.intent === 'discovery_intent' && !state.draft.source_url ? (
                    <DiscoveryPanel
                      initialQuery={state.draft.raw_input?.replace('discovery:', '') ?? ''}
                      onSelect={handleDiscoverySelect}
                    />
                  ) : (
                    <SkillPreviewCard
                      draft={state.draft}
                      onDraftChange={handleDraftChange}
                    />
                  )}
                </motion.div>

                {/* Inline error (inside review section) */}
                {inlineError && (
                  <div style={{ padding: '0 24px 8px' }}>
                    <p style={{
                      fontSize: '13px',
                      color: 'var(--negative)',
                      margin: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}>
                      {inlineError}
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
                    </p>
                  </div>
                )}

                {/* Action buttons */}
                <div style={{
                  display: 'flex',
                  gap: '16px',
                  justifyContent: 'center',
                  padding: '8px 24px 24px',
                }}>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={state.phase === 'submitting'}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleConfirm}
                    disabled={state.phase === 'submitting'}
                  >
                    {state.phase === 'submitting' ? 'Registrando...' : 'Confirm & Register'}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ========== COMPOSER SECTION (always visible) ========== */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            style={{
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0',
              border: dragOver ? '2px dashed var(--accent)' : '1px solid var(--border)',
              borderRadius: '12px',
              transition: 'border-color 150ms ease, opacity 200ms ease',
              opacity: isReviewMode ? 0.5 : 1,
            }}
          >
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
                        width: '32px', height: '32px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '50%',
                        border: '1px solid var(--border)',
                        backgroundColor: 'transparent',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer', padding: 0,
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
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                        padding: '8px 10px', borderRadius: '6px', border: 'none',
                        backgroundColor: 'transparent', color: 'var(--text-primary)',
                        fontFamily: 'var(--font-body)', fontSize: '13px', cursor: 'pointer', textAlign: 'left' as const,
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
                        fontFamily: 'var(--font-body)', fontSize: '13px', cursor: 'pointer', textAlign: 'left' as const,
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
                        fontFamily: 'var(--font-body)', fontSize: '13px', cursor: 'pointer', textAlign: 'left' as const,
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
                  width: '32px', height: '32px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '50%', border: 'none',
                  backgroundColor: hasInput && !isInputDisabled ? 'var(--text-primary)' : 'var(--surface-elevated)',
                  color: hasInput && !isInputDisabled ? 'var(--surface)' : 'var(--text-muted)',
                  cursor: hasInput && !isInputDisabled ? 'pointer' : 'default',
                  padding: 0, transition: 'background-color 150ms, color 150ms',
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

          {/* ========== DETECTION INFO (below composer) ========== */}
          {(isDetecting || detectionBadge || (inlineError && !isReviewMode)) && (
            <div style={{
              padding: '0 16px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              {/* Detection badge + loading dots + interpretation */}
              {(isDetecting || detectionBadge) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <AnimatePresence>
                    {detectionBadge && (
                      <motion.div
                        key={detectionBadge.label}
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.7, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        style={{ display: 'inline-flex' }}
                      >
                        <Badge variant={detectionBadge.variant}>
                          Detected: {detectionBadge.label}
                        </Badge>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {isDetecting && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', marginRight: '6px' }}>
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          style={{
                            width: '4px', height: '4px', borderRadius: '50%',
                            backgroundColor: 'var(--text-muted)', display: 'inline-block',
                          }}
                          animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                          transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.15, ease: 'easeInOut' }}
                        />
                      ))}
                    </span>
                  )}
                  {isDetecting && 'draft' in state && (
                    <p style={{
                      fontSize: '13px',
                      fontFamily: 'var(--font-body)',
                      color: 'var(--text-secondary)',
                      margin: 0,
                      lineHeight: '1.5',
                    }}>
                      {getDetectingText(state.draft)}
                    </p>
                  )}
                  {isReviewMode && 'draft' in state && (
                    <p style={{
                      fontSize: '13px',
                      fontFamily: 'var(--font-body)',
                      color: 'var(--text-secondary)',
                      margin: 0,
                      lineHeight: '1.5',
                    }}>
                      {getReviewMessage(state.draft)}
                    </p>
                  )}
                </div>
              )}

              {/* Inline error (idle mode only) */}
              {inlineError && !isReviewMode && (
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
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SmartAddModal;
export { SmartAddModal };
