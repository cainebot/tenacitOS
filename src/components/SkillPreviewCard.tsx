"use client";

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import type { SkillDraft } from '@/types/supabase';

const EMOJI_OPTIONS = ['🔧','🛠️','⚙️','🧰','💻','🖥️','📦','🔌','🤖','🧠','📊','🔍','🚀','✨','🎯','📝','🔐','🌐','📁','⚡','🎨','🧪','📈','🔗','💡','🗂️','🏗️','📡','🧩','💬','🔔','🛡️','📋','🎮','🏷️','📐','🔥','💾','🗃️','🪝'];

interface SkillPreviewCardProps {
  draft: SkillDraft;
  onConfirm: () => void;
  onDraftChange: (updated: SkillDraft) => void;
  confirming?: boolean;
}

function SkillPreviewCard({ draft, onConfirm, onDraftChange, confirming }: SkillPreviewCardProps) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [titleHover, setTitleHover] = useState(false);
  const [titleFocus, setTitleFocus] = useState(false);
  const [descHover, setDescHover] = useState(false);
  const [descFocus, setDescFocus] = useState(false);

  function getOriginBadge() {
    switch (draft.origin) {
      case 'local':
        return <Badge variant="default">Local</Badge>;
      case 'github':
        return <Badge variant="accent">GitHub</Badge>;
      case 'skills_sh':
        return <Badge variant="success">skills.sh</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  }

  const fieldBaseStyle: React.CSSProperties = {
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    width: '100%',
    transition: 'background-color 150ms, border-color 150ms',
  };

  const titleStyle: React.CSSProperties = {
    ...fieldBaseStyle,
    fontFamily: 'var(--font-heading)',
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    padding: '2px 6px',
    borderRadius: '6px',
    margin: '0 -6px',
    backgroundColor: titleFocus ? 'var(--surface)' : titleHover ? 'var(--surface)' : 'transparent',
    border: titleFocus ? '1px solid var(--border)' : '1px solid transparent',
  };

  const descStyle: React.CSSProperties = {
    ...fieldBaseStyle,
    fontFamily: 'var(--font-body)',
    fontSize: '13px',
    color: 'var(--text-secondary)',
    padding: '2px 6px',
    borderRadius: '6px',
    margin: '2px -6px 0',
    minHeight: '60px',
    resize: 'vertical',
    overflowY: 'auto',
    lineHeight: '1.5',
    backgroundColor: descFocus ? 'var(--surface)' : descHover ? 'var(--surface)' : 'transparent',
    border: descFocus ? '1px solid var(--border)' : '1px solid transparent',
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--surface-elevated)',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginTop: '12px',
      }}
    >
      {/* Header row: icon + name + description */}
      <div style={{ display: 'flex', flexDirection: 'row', gap: '12px', alignItems: 'flex-start' }}>
        {/* Emoji picker */}
        <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              style={{
                fontSize: '36px',
                flexShrink: 0,
                lineHeight: 1,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px',
                borderRadius: '6px',
                transition: 'background-color 150ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--surface)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              title="Change icon"
            >
              {draft.icon ?? '🔧'}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-2">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(8, 1fr)',
                gap: '4px',
              }}
            >
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onDraftChange({ ...draft, icon: emoji });
                    setEmojiOpen(false);
                  }}
                  style={{
                    fontSize: '22px',
                    padding: '6px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: draft.icon === emoji ? 'var(--surface-elevated)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background-color 100ms',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--surface-elevated)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = draft.icon === emoji ? 'var(--surface-elevated)' : 'transparent'; }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
          <input
            type="text"
            value={draft.name ?? ''}
            placeholder="Untitled Skill"
            onChange={(e) => onDraftChange({ ...draft, name: e.target.value })}
            onMouseEnter={() => setTitleHover(true)}
            onMouseLeave={() => setTitleHover(false)}
            onFocus={() => setTitleFocus(true)}
            onBlur={() => setTitleFocus(false)}
            style={titleStyle}
          />
          <textarea
            value={draft.description ?? ''}
            placeholder="No description detected"
            onChange={(e) => onDraftChange({ ...draft, description: e.target.value })}
            onMouseEnter={() => setDescHover(true)}
            onMouseLeave={() => setDescHover(false)}
            onFocus={() => setDescFocus(true)}
            onBlur={() => setDescFocus(false)}
            style={descStyle}
          />
        </div>
      </div>

      {/* Meta row: origin badge + source URL */}
      <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', alignItems: 'center' }}>
        {getOriginBadge()}
        {draft.source_url && (
          <a
            href={draft.source_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '12px',
              color: 'var(--accent)',
              fontFamily: 'var(--font-mono)',
              textDecoration: 'none',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '280px',
            }}
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
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--text-muted)',
            backgroundColor: 'var(--surface)',
            borderRadius: '6px',
            padding: '8px 10px',
            margin: 0,
            minHeight: '140px',
            resize: 'vertical',
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            border: '1px solid transparent',
            outline: 'none',
            width: '100%',
            transition: 'border-color 150ms',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'transparent'; }}
        />
      )}

      {/* Action row — only Confirm & Register */}
      <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', justifyContent: 'flex-end' }}>
        <Button variant="primary" size="sm" onClick={onConfirm} disabled={confirming}>
          {confirming ? 'Registrando...' : 'Confirm & Register'}
        </Button>
      </div>
    </div>
  );
}

export { SkillPreviewCard };
export default SkillPreviewCard;
