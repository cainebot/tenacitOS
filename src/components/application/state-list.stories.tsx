import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { StateList } from './state-list'
import type { ProjectStateRow, StateCategory } from '@/types/project'

const initialStates: ProjectStateRow[] = [
  { state_id: '1', project_id: 'p1', name: 'Open', category: 'to-do', color: '#444CE7', position: 0, created_at: '2026-01-01T00:00:00Z' },
  { state_id: '2', project_id: 'p1', name: 'Backlog', category: 'to-do', color: '#667085', position: 1, created_at: '2026-01-01T00:00:00Z' },
  { state_id: '3', project_id: 'p1', name: 'In Progress', category: 'in_progress', color: '#F79009', position: 2, created_at: '2026-01-01T00:00:00Z' },
  { state_id: '4', project_id: 'p1', name: 'In Review', category: 'in_progress', color: '#7A5AF8', position: 3, created_at: '2026-01-01T00:00:00Z' },
  { state_id: '5', project_id: 'p1', name: 'Done', category: 'done', color: '#17B26A', position: 4, created_at: '2026-01-01T00:00:00Z' },
  { state_id: '6', project_id: 'p1', name: 'Cancelled', category: 'done', color: '#F04438', position: 5, created_at: '2026-01-01T00:00:00Z' },
]

const columnStateMap: Record<string, string[]> = {
  'col-open': ['1'],
  'col-progress': ['3', '4'],
  'col-done': ['5'],
  // state_id '2' (Backlog) and '6' (Cancelled) are unassigned
}

function InteractiveStateList() {
  const [states, setStates] = useState(initialStates)

  const handleCreate = async (data: { name: string; category: StateCategory; color?: string }) => {
    await new Promise((r) => setTimeout(r, 300))
    const newState: ProjectStateRow = {
      state_id: `new-${Date.now()}`,
      project_id: 'p1',
      name: data.name,
      category: data.category,
      color: data.color ?? '#667085',
      position: states.length,
      created_at: new Date().toISOString(),
    }
    setStates((prev) => [...prev, newState])
  }

  const handleUpdate = async (stateId: string, data: { name?: string; category?: StateCategory; color?: string }) => {
    await new Promise((r) => setTimeout(r, 200))
    setStates((prev) =>
      prev.map((s) => (s.state_id === stateId ? { ...s, ...data } : s))
    )
    return states.find((s) => s.state_id === stateId) ?? null
  }

  const handleDelete = async (stateId: string, _targetStateId?: string) => {
    await new Promise((r) => setTimeout(r, 200))
    setStates((prev) => prev.filter((s) => s.state_id !== stateId))
    return true
  }

  return (
    <StateList
      states={states}
      columnStateMap={columnStateMap}
      onCreateState={handleCreate}
      onUpdateState={handleUpdate}
      onDeleteState={handleDelete}
    />
  )
}

const meta = {
  title: 'Phase85/StateList',
  component: StateList,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[400px] rounded-lg border border-secondary bg-primary p-4">
        <h3 className="mb-3 text-sm font-semibold text-secondary">States</h3>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StateList>

export default meta
type Story = StoryObj<typeof meta>

export const Interactive: Story = {
  name: 'Full Interactive',
  render: () => <InteractiveStateList />,
}

export const Static: Story = {
  name: 'Static (no interaction)',
  args: {
    states: initialStates,
    columnStateMap,
    onCreateState: async (data) => console.log('create', data),
    onUpdateState: async (id, data) => { console.log('update', id, data); return null },
    onDeleteState: async (id) => { console.log('delete', id); return true },
  },
}
