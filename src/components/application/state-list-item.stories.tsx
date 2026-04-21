import type { Meta, StoryObj } from '@storybook/react'
import { StateListItem } from './state-list-item'
import type { ProjectStateRow } from '@/types/project'

const mockStates: ProjectStateRow[] = [
  { state_id: '1', project_id: 'p1', name: 'Open', category: 'to-do', color: '#444CE7', position: 0, created_at: '2026-01-01T00:00:00Z' },
  { state_id: '2', project_id: 'p1', name: 'In Progress', category: 'in_progress', color: '#F79009', position: 1, created_at: '2026-01-01T00:00:00Z' },
  { state_id: '3', project_id: 'p1', name: 'Done', category: 'done', color: '#17B26A', position: 2, created_at: '2026-01-01T00:00:00Z' },
  { state_id: '4', project_id: 'p1', name: 'Backlog', category: 'to-do', color: '#667085', position: 3, created_at: '2026-01-01T00:00:00Z' },
]

const columnStateMap: Record<string, string[]> = {
  'col-1': ['1', '2', '3'],
}

const defaultHandlers = {
  onUpdateState: async (stateId: string, data: Record<string, unknown>) => {
    console.log('onUpdateState', stateId, data)
    return mockStates[0]
  },
  onDeleteClick: (state: ProjectStateRow) => console.log('onDeleteClick', state.name),
}

const meta = {
  title: 'Phase85/StateListItem',
  component: StateListItem,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[360px] p-4">
        <Story />
      </div>
    ),
  ],
  args: {
    states: mockStates,
    columnStateMap,
    ...defaultHandlers,
  },
} satisfies Meta<typeof StateListItem>

export default meta
type Story = StoryObj<typeof meta>

export const ToDo: Story = {
  name: 'To Do (assigned)',
  args: {
    state: mockStates[0],
  },
}

export const InProgress: Story = {
  name: 'In Progress',
  args: {
    state: mockStates[1],
  },
}

export const Done: Story = {
  name: 'Done',
  args: {
    state: mockStates[2],
  },
}

export const Unassigned: Story = {
  name: 'Unassigned (warning)',
  args: {
    state: mockStates[3],
    columnStateMap: { 'col-1': ['1', '2', '3'] },
  },
}

export const LastOfCategory: Story = {
  name: 'Last of Category (Required)',
  args: {
    state: mockStates[2],
    states: [mockStates[0], mockStates[1], mockStates[2]],
  },
}

export const Dragging: Story = {
  name: 'Dragging (opacity)',
  args: {
    state: mockStates[0],
    isDragging: true,
  },
}
