import type { Meta, StoryObj } from '@storybook/react'
import { StateChip } from './state-chip'
import type { ProjectStateRow } from '@/types/project'

const mockState = (overrides: Partial<ProjectStateRow> = {}): ProjectStateRow => ({
  state_id: '1',
  project_id: 'p1',
  name: 'Open',
  category: 'to-do',
  color: '#444CE7',
  position: 0,
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

const meta = {
  title: 'Phase85/StateChip',
  component: StateChip,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="flex items-center gap-3 p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StateChip>

export default meta
type Story = StoryObj<typeof meta>

export const BadgeWithDot: Story = {
  name: 'DragOverlay (BadgeWithDot)',
  args: {
    state: mockState({ name: 'In Review', color: '#7A5AF8' }),
  },
}

export const BadgeWithButton: Story = {
  name: 'Column Card (BadgeWithButton)',
  args: {
    state: mockState({ name: 'Done', color: '#17B26A' }),
    onRemove: (id) => console.log('Remove:', id),
  },
}

export const AllColors: Story = {
  name: 'All 10 Colors',
  render: () => {
    const colors = [
      { hex: '#667085', name: 'Gray' },
      { hex: '#444CE7', name: 'Brand' },
      { hex: '#F04438', name: 'Error' },
      { hex: '#F79009', name: 'Warning' },
      { hex: '#17B26A', name: 'Success' },
      { hex: '#2E90FA', name: 'Blue' },
      { hex: '#7A5AF8', name: 'Purple' },
      { hex: '#EE46BC', name: 'Pink' },
      { hex: '#EF6820', name: 'Orange' },
      { hex: '#6172F3', name: 'Indigo' },
    ]
    return (
      <div className="flex flex-wrap gap-2">
        {colors.map((c) => (
          <StateChip key={c.hex} state={mockState({ name: c.name, color: c.hex })} />
        ))}
      </div>
    )
  },
}
