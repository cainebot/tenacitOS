import type { Meta, StoryObj } from '@storybook/react'
import { BoardSetting } from './board-setting'
import type { ProjectStateRow } from '@/types/project'
import type { ColumnWithStates } from '@/hooks/use-board-settings'

const meta: Meta<typeof BoardSetting> = {
  title: 'Phase85/BoardSetting',
  component: BoardSetting,
  parameters: { layout: 'fullscreen' },
}
export default meta
type Story = StoryObj<typeof BoardSetting>

// ---- Mock data ----

const backlog: ProjectStateRow = {
  state_id: 's-1', project_id: 'p-1', name: 'Backlog',
  category: 'to-do', color: '#667085', position: 0, created_at: '2026-01-01T00:00:00Z',
}
const desarrollo: ProjectStateRow = {
  state_id: 's-2', project_id: 'p-1', name: 'Desarrollo',
  category: 'in_progress', color: '#2E90FA', position: 1, created_at: '2026-01-01T00:00:00Z',
}
const desplegado: ProjectStateRow = {
  state_id: 's-3', project_id: 'p-1', name: 'Desplegado',
  category: 'done', color: '#17B26A', position: 2, created_at: '2026-01-01T00:00:00Z',
}
const revision: ProjectStateRow = {
  state_id: 's-4', project_id: 'p-1', name: 'Revisión',
  category: 'in_progress', color: '#7A5AF8', position: 3, created_at: '2026-01-01T00:00:00Z',
}

const allStates = [backlog, desarrollo, desplegado, revision]

const columns: ColumnWithStates[] = [
  { column_id: 'col-1', board_id: 'b-1', name: 'To do', position: 0, only_humans: false, assigned_agents: [], created_at: '2026-01-01T00:00:00Z', state_ids: ['s-1'] },
  { column_id: 'col-2', board_id: 'b-1', name: 'In progress', position: 1, only_humans: false, assigned_agents: [], created_at: '2026-01-01T00:00:00Z', state_ids: ['s-2'] },
  { column_id: 'col-3', board_id: 'b-1', name: 'Done', position: 2, only_humans: false, assigned_agents: [], created_at: '2026-01-01T00:00:00Z', state_ids: ['s-3'] },
]

const cardCounts: Record<string, number> = { 's-1': 12, 's-2': 6, 's-3': 7, 's-4': 0 }

// ---- Stories ----

export const Default: Story = {
  args: {
    columns,
    states: allStates,
    cardCounts,
    projectName: 'Sales pipeline',
    projectSlug: 'sales-pipeline',
    onBack: () => console.log('back'),
    onCreateState: async (data) => { console.log('create', data) },
    onDeleteState: async (id, target) => { console.log('delete', id, target); return true },
    onColumnsChange: (cols) => { console.log('columns changed', cols) },
  },
}

export const WithUnassigned: Story = {
  args: {
    ...Default.args,
    states: allStates,  // s-4 (Revisión) is unassigned — not in any column's state_ids
  },
}

export const AllUnassigned: Story = {
  args: {
    columns: columns.map((c) => ({ ...c, state_ids: [] })),
    states: allStates,
    cardCounts: { 's-1': 0, 's-2': 0, 's-3': 0, 's-4': 0 },
    projectName: 'Sales pipeline',
    projectSlug: 'sales-pipeline',
    onBack: () => console.log('back'),
    onCreateState: async (data) => { console.log('create', data) },
    onDeleteState: async () => true,
    onColumnsChange: (cols) => { console.log('columns changed', cols) },
  },
}

export const Empty: Story = {
  args: {
    columns: columns.map((c) => ({ ...c, state_ids: [] })),
    states: [],
    cardCounts: {},
    projectName: 'New project',
    projectSlug: 'new-project',
    onBack: () => console.log('back'),
    onCreateState: async (data) => { console.log('create', data) },
    onDeleteState: async () => true,
    onColumnsChange: (cols) => { console.log('columns changed', cols) },
  },
}
