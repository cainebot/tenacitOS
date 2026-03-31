import { createServerClient, createServiceRoleClient } from '@/lib/supabase'
import type {
  ProjectRow,
  ProjectStateRow,
  ProjectWithStates,
} from '@/types/project'

// ---- Project reads (server client) ----

export async function getProjects(): Promise<ProjectRow[]> {
  const client = createServerClient()
  const { data, error } = await client
    .from('projects')
    .select('*')
    .order('name')

  if (error) throw error
  return data as ProjectRow[]
}

export async function getProject(id: string): Promise<ProjectWithStates> {
  const client = createServerClient()

  const { data: project, error: pErr } = await client
    .from('projects')
    .select('*')
    .eq('project_id', id)
    .single()

  if (pErr) throw pErr

  const states = await getProjectStates(id)

  return { ...(project as ProjectRow), states }
}

export async function getProjectStates(
  projectId: string
): Promise<ProjectStateRow[]> {
  const client = createServerClient()
  const { data, error } = await client
    .from('project_states')
    .select('*')
    .eq('project_id', projectId)
    .order('position')

  if (error) throw error
  return data as ProjectStateRow[]
}

// ---- Project writes (service role client) ----

export async function createProject(
  data: Pick<ProjectRow, 'name'> & Partial<Pick<ProjectRow, 'description'>>
): Promise<ProjectRow> {
  const client = createServiceRoleClient()
  const { data: row, error } = await client
    .from('projects')
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return row as ProjectRow
}

export async function updateProject(
  id: string,
  data: Partial<Pick<ProjectRow, 'name' | 'description'>>
): Promise<ProjectRow> {
  const client = createServiceRoleClient()
  const { data: row, error } = await client
    .from('projects')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('project_id', id)
    .select()
    .single()

  if (error) throw error
  return row as ProjectRow
}

export async function deleteProject(id: string): Promise<void> {
  const client = createServiceRoleClient()
  const { error } = await client
    .from('projects')
    .delete()
    .eq('project_id', id)

  if (error) throw error
}

// ---- State writes (service role client) ----

export async function createState(
  projectId: string,
  data: Pick<ProjectStateRow, 'name' | 'category' | 'color' | 'position'>
): Promise<ProjectStateRow> {
  const client = createServiceRoleClient()
  const { data: row, error } = await client
    .from('project_states')
    .insert({ ...data, project_id: projectId })
    .select()
    .single()

  if (error) throw error
  return row as ProjectStateRow
}

export async function updateState(
  stateId: string,
  data: Partial<Pick<ProjectStateRow, 'name' | 'category' | 'color' | 'position'>>
): Promise<ProjectStateRow> {
  const client = createServiceRoleClient()
  const { data: row, error } = await client
    .from('project_states')
    .update(data)
    .eq('state_id', stateId)
    .select()
    .single()

  if (error) throw error
  return row as ProjectStateRow
}

export async function deleteState(stateId: string): Promise<void> {
  const client = createServiceRoleClient()
  const { error } = await client
    .from('project_states')
    .delete()
    .eq('state_id', stateId)

  if (error) throw error
}
