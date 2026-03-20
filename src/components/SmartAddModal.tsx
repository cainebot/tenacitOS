"use client";

import { useState, useReducer, useRef, useEffect } from 'react';
import { Plus, ArrowUp, Upload, Link, Terminal, X } from 'lucide-react';
import { Modal, ModalBody, Badge, Popover, cx } from '@openclaw/ui';

import { detectInput } from '@/lib/input-detector';
import { SkillPreviewCard } from '@/components/SkillPreviewCard';
import type { SkillDraft, DiscoveredSkill } from '@/types/supabase';
import { DiscoveryPanel } from '@/components/DiscoveryPanel';

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
      if (state.phase === 'idle' || state.phase === 'preview') return { phase: 'detecting', draft: action.payload };
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

function getDetectionBadge(state: ModalState): { label: string; variant: 'default' | 'brand' | 'success' | 'gray' } | null {
  if (state.phase === 'idle') return null;
  if (!('draft' in state)) return null;
  const { draft } = state;
  switch (draft.type) {
    case 'github_url': return { label: 'GitHub URL', variant: 'brand' };
    case 'command': return { label: 'npx command', variant: 'success' };
    case 'file': return { label: 'File upload', variant: 'default' };
    case 'text': return { label: 'Text', variant: 'gray' };
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

  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isReviewMode = state.phase === 'preview' || state.phase === 'submitting';
  const isDetecting = state.phase === 'detecting';
  const isInputDisabled = isDetecting || state.phase === 'submitting';
  const hasInput = inputValue.trim().length > 0;
  const detectionBadge = getDetectionBadge(state);

  // Scroll to top when entering review mode
  useEffect(() => {
    if (isReviewMode && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [isReviewMode]);

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
    <Modal isOpen onOpenChange={(open) => !open && onClose()} size="xl">
      <ModalBody className="p-0 flex flex-col">
        <div ref={scrollRef} className="overflow-y-auto flex-1 min-h-0">

          {/* ========== REVIEW SECTION (visible in preview/submitting) ========== */}
          {isReviewMode && 'draft' in state && (
            <div className="animate-in fade-in duration-300">
              {/* Review header: chat-style message + source chip */}
              <div className="pt-10 px-6 flex flex-col gap-2 opacity-60">
                {/* Source chip — right-aligned like a user message */}
                {sourceChip && (
                  <div className="flex justify-end">
                    <span className="text-xs font-mono bg-foreground text-background px-3 py-1.5 rounded-[12px_12px_2px_12px] inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
                      {sourceChip.icon} {sourceChip.label}
                    </span>
                  </div>
                )}

                {/* Assistant message bubble */}
                <div className="max-w-[85%] px-3 py-2 rounded-[12px_12px_12px_2px] bg-tertiary text-[13px] font-sans text-quaternary leading-[1.4]">
                  {getReviewMessage(state.draft)}
                </div>
              </div>

              {/* Skill card */}
              <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 delay-75 fill-mode-forwards p-6 -mt-3 relative z-[1]">
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
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                    confirming={state.phase === 'submitting'}
                  />
                )}
              </div>

              {/* Inline error (inside review section) */}
              {inlineError && (
                <div className="px-6 pb-2">
                  <p className="text-[13px] text-destructive m-0 flex items-center gap-1.5">
                    {inlineError}
                    <button
                      type="button"
                      onClick={() => setInlineError(null)}
                      className="bg-transparent border-0 cursor-pointer text-destructive p-0 flex items-center"
                    >
                      <X size={12} />
                    </button>
                  </p>
                </div>
              )}

              {/* Action buttons are inside SkillPreviewCard */}
            </div>
          )}

          {/* ========== COMPOSER SECTION (always visible) ========== */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={cx(
              'p-4 flex flex-col gap-0 rounded-xl transition-[border-color,opacity] duration-150',
              isReviewMode ? 'mx-6 mb-6' : 'm-0',
              dragOver
                ? 'border-2 border-dashed border-accent'
                : isReviewMode
                  ? 'border border-[#393939]'
                  : 'border-2 border-dashed border-transparent',
            )}
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
              className={cx(
                'w-full resize-none border-0 outline-none bg-transparent text-primary font-sans text-sm leading-[1.5] px-1 py-2 min-h-[44px] max-h-[200px]',
                isInputDisabled && 'opacity-50',
              )}
              style={{ height: 'auto' }}
            />

            {/* Bottom toolbar: + button left, send button right */}
            <div className="flex items-center justify-between pt-1">
              {/* Left side: + button */}
              <div className="flex items-center gap-1">
                <Popover
                  trigger={
                    <button
                      type="button"
                      className="w-8 h-8 flex items-center justify-center rounded-full border border-secondary bg-transparent text-quaternary cursor-pointer p-0 transition-[background-color,color] duration-150 hover:bg-tertiary hover:text-primary"
                    >
                      <Plus size={18} />
                    </button>
                  }
                  placement="top start"
                  className="w-48 p-1"
                >
                  <button
                    type="button"
                    onClick={() => { fileInputRef.current?.click(); }}
                    className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md border-0 bg-transparent text-primary font-sans text-[13px] cursor-pointer text-left hover:bg-secondary"
                  >
                    <Upload size={14} className="text-quaternary" />
                    Upload file
                  </button>
                  <button
                    type="button"
                    onClick={() => { setInputValue('https://github.com/'); setTimeout(() => textareaRef.current?.focus(), 0); }}
                    className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md border-0 bg-transparent text-primary font-sans text-[13px] cursor-pointer text-left hover:bg-secondary"
                  >
                    <Link size={14} className="text-quaternary" />
                    Paste URL
                  </button>
                  <button
                    type="button"
                    onClick={() => { setInputValue('npx skills add '); setTimeout(() => textareaRef.current?.focus(), 0); }}
                    className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md border-0 bg-transparent text-primary font-sans text-[13px] cursor-pointer text-left hover:bg-secondary"
                  >
                    <Terminal size={14} className="text-quaternary" />
                    Paste command
                  </button>
                </Popover>
              </div>

              {/* Right side: send button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!hasInput || isInputDisabled}
                className={cx(
                  'w-8 h-8 flex items-center justify-center rounded-full border-0 p-0 transition-[background-color,color] duration-150',
                  hasInput && !isInputDisabled
                    ? 'bg-foreground text-background cursor-pointer'
                    : 'bg-tertiary text-quaternary cursor-default',
                )}
              >
                <ArrowUp size={18} />
              </button>
            </div>

            {/* ========== DETECTION INFO (inside composer box) ========== */}
            {(isDetecting || detectionBadge || (inlineError && !isReviewMode)) && (
              <div className="flex flex-col gap-2 pt-2">
                {/* Detection badge + loading dots + interpretation */}
                {(isDetecting || detectionBadge) && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {detectionBadge && (
                      <div className="animate-in zoom-in-75 fade-in duration-200 inline-flex">
                        <Badge variant={detectionBadge.variant}>
                          Detected: {detectionBadge.label}
                        </Badge>
                      </div>
                    )}
                    {isDetecting && (
                      <span className="inline-flex items-center gap-[3px] mr-1.5">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="inline-block w-1 h-1 rounded-full bg-muted-foreground animate-pulse"
                            style={{ animationDelay: `${i * 150}ms` }}
                          />
                        ))}
                      </span>
                    )}
                    {isDetecting && 'draft' in state && (
                      <p className="text-[13px] font-sans text-quaternary m-0 leading-[1.5]">
                        {getDetectingText(state.draft)}
                      </p>
                    )}
                    {isReviewMode && 'draft' in state && (
                      <p className="text-[13px] font-sans text-quaternary m-0 leading-[1.5]">
                        {getReviewMessage(state.draft)}
                      </p>
                    )}
                  </div>
                )}

                {/* Inline error (idle mode only) */}
                {inlineError && !isReviewMode && (
                  <p className="text-[13px] text-destructive m-0 flex items-center gap-1.5">
                    {inlineError}
                    {inlineError.includes('Reintentar') ? (
                      <button
                        type="button"
                        onClick={() => { setInlineError(null); if (lastInput) handleDetect(lastInput); }}
                        className="bg-transparent border-0 cursor-pointer text-brand-600 p-0 text-[13px] font-sans underline"
                      >
                        Reintentar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setInlineError(null)}
                        className="bg-transparent border-0 cursor-pointer text-destructive p-0 flex items-center"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.skill,.txt"
            className="hidden"
            onChange={handleFileChange}
          />

        </div>
      </ModalBody>
    </Modal>
  );
}

export default SmartAddModal;
export { SmartAddModal };
