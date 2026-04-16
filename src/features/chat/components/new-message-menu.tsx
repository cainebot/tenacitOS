'use client'

import { Button, Dropdown } from '@circos/ui'
import { Edit02, Hash01, User01 } from '@untitledui/icons'

// ── Types ────────────────────────────────────────────────────────────────────

interface NewMessageMenuProps {
  onSelectDm: () => void
  onSelectChannel: () => void
}

// ── Component ────────────────────────────────────────────────────────────────

export function NewMessageMenu({ onSelectDm, onSelectChannel }: NewMessageMenuProps) {
  return (
    <Dropdown.Root>
      <Button size="sm" color="secondary" iconLeading={Edit02}>
        New message
      </Button>
      <Dropdown.Popover>
        <Dropdown.Menu
          className="min-w-[160px]"
          onAction={(key) => {
            if (key === 'dm') onSelectDm()
            else if (key === 'channel') onSelectChannel()
          }}
        >
          <Dropdown.Item id="dm" icon={User01} label="Direct message" />
          <Dropdown.Item id="channel" icon={Hash01} label="Channel" />
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown.Root>
  )
}
