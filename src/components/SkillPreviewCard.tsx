"use client";

import { useState } from 'react';
import { Badge, Button, Popover, cx } from '@openclaw/ui';
import type { SkillDraft } from '@/types/supabase';

const EMOJI_OPTIONS = ['🔧','🛠️','⚙️','🧰','💻','🖥️','📦','🔌','🤖','🧠','📊','🔍','🚀','✨','🎯','📝','🔐','🌐','📁','⚡','🎨','🧪','📈','🔗','💡','🗂️','🏗️','📡','🧩','💬','🔔','🛡️','📋','🎮','🏷️','📐','🔥','💾','🗃️','🪝'];

interface SkillPreviewCardProps {
  draft: SkillDraft;
  onDraftChange: (updated: SkillDraft) => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirming?: boolean;
}

function SkillPreviewCard({ draft, onDraftChange, onConfirm, onCancel, confirming }: SkillPreviewCardProps) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [titleHover, setTitleHover] = useState(false);
  const [titleFocus, setTitleFocus] = useState(false);
  const [descHover, setDescHover] = useState(false);
  const [descFocus, setDescFocus] = useState(false);
  const [contentFocus, setContentFocus] = useState(false);

  function getOriginBadge() {
    switch (draft.origin) {
      case 'local':
        return <Badge variant="default">Local</Badge>;
      case 'github':
        return <Badge variant="brand">GitHub</Badge>;
      case 'skills_sh':
        return <Badge variant="success">skills.sh</Badge>;
      default:
        return <Badge variant="gray">Unknown</Badge>;
    }
  }

  return (
    <div className="bg-tertiary rounded-xl border border-white/[0.06] p-5 flex flex-col gap-3">
      {/* Header row: icon + name + description */}
      <div className="flex flex-row gap-3 items-start">
        {/* Emoji picker */}
        <Popover
          isOpen={emojiOpen}
          onOpenChange={setEmojiOpen}
          trigger={
            <button
              type="button"
              className="text-[36px] flex-shrink-0 leading-none bg-transparent border-none cursor-pointer p-0.5 rounded-md transition-colors hover:bg-secondary"
              title="Change icon"
            >
              {draft.icon ?? '🔧'}
            </button>
          }
        >
          <div className="grid grid-cols-8 gap-1">
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => { onDraftChange({ ...draft, icon: emoji }); setEmojiOpen(false); }}
                className={cx(
                  'text-[22px] p-1.5 rounded-md border-none cursor-pointer transition-colors hover:bg-tertiary',
                  draft.icon === emoji ? 'bg-tertiary' : 'bg-transparent'
                )}
              >
                {emoji}
              </button>
            ))}
          </div>
        </Popover>

        <div className="flex flex-col min-w-0 flex-1">
          <input
            type="text"
            value={draft.name ?? ''}
            placeholder="Untitled Skill"
            onChange={(e) => onDraftChange({ ...draft, name: e.target.value })}
            onMouseEnter={() => setTitleHover(true)}
            onMouseLeave={() => setTitleHover(false)}
            onFocus={() => setTitleFocus(true)}
            onBlur={() => setTitleFocus(false)}
            className={cx(
              'border-none outline-none bg-transparent w-full transition-colors font-display text-lg font-bold text-primary px-1.5 py-0.5 rounded-md -mx-1.5',
              titleFocus ? 'bg-secondary border border-secondary' : titleHover ? 'bg-secondary border border-transparent' : 'border border-transparent'
            )}
          />
          <textarea
            value={draft.description ?? ''}
            placeholder="No description detected"
            onChange={(e) => onDraftChange({ ...draft, description: e.target.value })}
            onMouseEnter={() => setDescHover(true)}
            onMouseLeave={() => setDescHover(false)}
            onFocus={() => setDescFocus(true)}
            onBlur={() => setDescFocus(false)}
            className={cx(
              'border-none outline-none bg-transparent w-full transition-colors font-sans text-[13px] text-quaternary px-1.5 py-0.5 rounded-md -mx-1.5 mt-0.5 min-h-[60px] overflow-y-auto leading-relaxed resize-none',
              descFocus ? 'bg-secondary border border-secondary' : descHover ? 'bg-secondary border border-transparent' : 'border border-transparent'
            )}
          />
        </div>
      </div>

      {/* Meta row: origin badge + source URL */}
      <div className="flex flex-row gap-2 items-center">
        {getOriginBadge()}
        {draft.source_url && (
          <a
            href={draft.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-brand-600 font-mono no-underline overflow-hidden text-ellipsis whitespace-nowrap max-w-[280px]"
          >
            {draft.source_url}
          </a>
        )}
      </div>

      {/* Content — editable textarea */}
      {draft.content != null && (
        <textarea
          value={draft.content}
          onChange={(e) => onDraftChange({ ...draft, content: e.target.value })}
          onFocus={() => setContentFocus(true)}
          onBlur={() => setContentFocus(false)}
          className={cx(
            'font-mono text-[13px] text-[#8B8B8B] bg-secondary rounded-md px-2.5 py-2 m-0 min-h-[160px] overflow-y-auto whitespace-pre-wrap break-words outline-none w-full transition-colors resize-none',
            contentFocus ? 'border border-secondary' : 'border border-transparent'
          )}
        />
      )}

      {/* Action buttons — right-aligned inside card */}
      {onConfirm && (
        <div className="flex gap-3 justify-end">
          {onCancel && (
            <Button variant="outline" onPress={onCancel} isDisabled={confirming} className="h-12 px-6">
              Cancelar
            </Button>
          )}
          <Button variant="primary" onPress={onConfirm} isDisabled={confirming} className="h-12 px-6">
            {confirming ? 'Registrando...' : 'Confirm & Register'}
          </Button>
        </div>
      )}
    </div>
  );
}

export { SkillPreviewCard };
export default SkillPreviewCard;
