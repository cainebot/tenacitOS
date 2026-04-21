import type { Meta, StoryObj } from '@storybook/react'
import { StateCard } from './state-card'
import type { ProjectStateRow } from '@/types/project'

const meta: Meta<typeof StateCard> = {
  title: 'Phase85/StateCard',
  component: StateCard,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="w-[272px]">
        <Story />
      </div>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof StateCard>

const backlogState: ProjectStateRow = {
  state_id: 's-1',
  project_id: 'p-1',
  name: 'Backlog',
  category: 'to-do',
  color: '#667085',
  position: 0,
  created_at: '2026-01-01T00:00:00Z',
}

const desarrolloState: ProjectStateRow = {
  state_id: 's-2',
  project_id: 'p-1',
  name: 'Desarrollo',
  category: 'in_progress',
  color: '#2E90FA',
  position: 1,
  created_at: '2026-01-01T00:00:00Z',
}

const desplegadoState: ProjectStateRow = {
  state_id: 's-3',
  project_id: 'p-1',
  name: 'Desplegado',
  category: 'done',
  color: '#17B26A',
  position: 2,
  created_at: '2026-01-01T00:00:00Z',
}

export const ToDo: Story = {
  args: {
    state: backlogState,
    taskCount: 12,
    onDeleteClick: () => console.log('delete'),
  },
}

export const InProgress: Story = {
  args: {
    state: desarrolloState,
    taskCount: 6,
    onDeleteClick: () => console.log('delete'),
  },
}

export const Done: Story = {
  args: {
    state: desplegadoState,
    taskCount: 7,
    onDeleteClick: () => console.log('delete'),
  },
}

export const ZeroTasks: Story = {
  args: {
    state: backlogState,
    taskCount: 0,
    onDeleteClick: () => console.log('delete'),
  },
}

export const Dragging: Story = {
  args: {
    state: desarrolloState,
    taskCount: 6,
    isDragging: true,
    onDeleteClick: () => console.log('delete'),
  },
}

export const AllCards: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <StateCard state={backlogState} taskCount={0} onDeleteClick={() => {}} />
      <StateCard state={desarrolloState} taskCount={6} onDeleteClick={() => {}} />
      <StateCard state={desplegadoState} taskCount={7} onDeleteClick={() => {}} />
    </div>
  ),
}
