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

// ---- Slug utilities (D-04) ----

/** Generate URL-safe slug from project name (D-04). */
export function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/** Resolve slug collision by appending -2, -3, ... up to -10. Throws after 10 retries. */
export async function resolveSlugCollision(baseSlug: string): Promise<string> {
  const client = createServiceRoleClient()
  let candidate = baseSlug
  let suffix = 2
  while (suffix <= 11) {
    const { data } = await client
      .from('projects')
      .select('project_id')
      .eq('slug', candidate)
      .maybeSingle()
    if (!data) return candidate
    candidate = `${baseSlug}-${suffix++}`
  }
  throw new Error(`Slug collision limit reached for: ${baseSlug}`)
}

/** Look up a project by its URL slug. Returns null if not found. */
export async function getProjectBySlug(slug: string): Promise<ProjectRow | null> {
  const client = createServerClient()
  const { data, error } = await client
    .from('projects')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null  // not found
    throw error
  }
  return data as ProjectRow
}

// ---- Project writes (service role client) ----

export async function createProject(
  data: Pick<ProjectRow, 'name'> & Partial<Pick<ProjectRow, 'description' | 'slug' | 'cover_color' | 'cover_icon'>>
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
  data: Partial<Pick<ProjectRow, 'name' | 'description' | 'cover_color' | 'cover_icon'>>
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
