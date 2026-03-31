import { createServerClient, createServiceRoleClient } from '@/lib/supabase'
import type {
  BoardRow,
  BoardColumnRow,
  BoardColumnStateRow,
  BoardWithColumns,
  CardRow,
  CardType,
} from '@/types/project'

// ---- Board reads (server client) ----

export async function getBoards(projectId?: string): Promise<BoardRow[]> {
  const client = createServerClient()
  let query = client.from('boards').select('*')

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query.order('name')
  if (error) throw error
  return data as BoardRow[]
}

export async function getBoard(id: string): Promise<BoardWithColumns> {
  const client = createServerClient()

  const { data: board, error: bErr } = await client
    .from('boards')
    .select('*')
    .eq('board_id', id)
    .single()

  if (bErr) throw bErr

  // Fetch columns ordered by position
  const { data: columns, error: cErr } = await client
    .from('board_columns')
    .select('*')
    .eq('board_id', id)
    .order('position')

  if (cErr) throw cErr

  const boardColumns = columns as BoardColumnRow[]

  // Fetch state mappings for all columns in one query
  const columnIds = boardColumns.map((c) => c.column_id)
  let columnStateRows: BoardColumnStateRow[] = []

  if (columnIds.length > 0) {
    const { data: stateRows, error: sErr } = await client
      .from('board_column_states')
      .select('*')
      .in('column_id', columnIds)

    if (sErr) throw sErr
    columnStateRows = stateRows as BoardColumnStateRow[]
  }

  // Group state_ids by column_id
  const statesByColumn = columnStateRows.reduce<Record<string, string[]>>(
    (acc, row) => {
      if (!acc[row.column_id]) acc[row.column_id] = []
      acc[row.column_id].push(row.state_id)
      return acc
    },
    {}
  )

  const columnsWithStates = boardColumns.map((col) => ({
    ...col,
    state_ids: statesByColumn[col.column_id] ?? [],
  }))

  return { ...(board as BoardRow), columns: columnsWithStates }
}

export async function getBoardCards(boardId: string): Promise<CardRow[]> {
  const client = createServerClient()
  const { data, error } = await client.rpc('get_board_cards', {
    p_board_id: boardId,
  })

  if (error) throw error
  return data as CardRow[]
}

// ---- Board writes (service role client) ----

export async function createBoard(
  data: Pick<BoardRow, 'project_id' | 'name'> &
    Partial<Pick<BoardRow, 'description' | 'card_type_filter' | 'state_filter'>>
): Promise<BoardRow> {
  const client = createServiceRoleClient()
  const { data: row, error } = await client
    .from('boards')
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return row as BoardRow
}

export async function updateBoard(
  id: string,
  data: Partial<
    Pick<BoardRow, 'name' | 'description' | 'card_type_filter' | 'state_filter' | 'project_id' | 'scrum_master_agent_id'>
  >
): Promise<BoardRow> {
  const client = createServiceRoleClient()
  const { data: row, error } = await client
    .from('boards')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('board_id', id)
    .select()
    .single()

  if (error) throw error
  return row as BoardRow
}

export async function deleteBoard(id: string): Promise<void> {
  const client = createServiceRoleClient()
  const { error } = await client.from('boards').delete().eq('board_id', id)
  if (error) throw error
}

// ---- Column writes (service role client) ----

export async function createColumn(
  boardId: string,
  data: Pick<BoardColumnRow, 'name' | 'position'> &
    Partial<Pick<BoardColumnRow, 'only_humans' | 'assigned_agents'>> & {
      state_ids?: string[]
    }
): Promise<BoardColumnRow> {
  const client = createServiceRoleClient()
  const { state_ids, ...columnData } = data

  const { data: row, error } = await client
    .from('board_columns')
    .insert({ ...columnData, board_id: boardId })
    .select()
    .single()

  if (error) throw error

  const column = row as BoardColumnRow

  // Insert board_column_states entries if provided
  if (state_ids && state_ids.length > 0) {
    const stateEntries = state_ids.map((state_id) => ({
      column_id: column.column_id,
      state_id,
    }))

    const { error: sErr } = await client
      .from('board_column_states')
      .insert(stateEntries)

    if (sErr) throw sErr
  }

  return column
}

export async function updateColumn(
  columnId: string,
  data: Partial<
    Pick<BoardColumnRow, 'name' | 'position' | 'only_humans' | 'assigned_agents'>
  > & { state_ids?: string[] }
): Promise<BoardColumnRow> {
  const client = createServiceRoleClient()
  const { state_ids, ...columnData } = data

  const { data: row, error } = await client
    .from('board_columns')
    .update(columnData)
    .eq('column_id', columnId)
    .select()
    .single()

  if (error) throw error

  // Replace board_column_states if provided
  if (state_ids !== undefined) {
    const { error: delErr } = await client
      .from('board_column_states')
      .delete()
      .eq('column_id', columnId)

    if (delErr) throw delErr

    if (state_ids.length > 0) {
      const stateEntries = state_ids.map((state_id) => ({
        column_id: columnId,
        state_id,
      }))

      const { error: insErr } = await client
        .from('board_column_states')
        .insert(stateEntries)

      if (insErr) throw insErr
    }
  }

  return row as BoardColumnRow
}

export async function deleteColumn(columnId: string): Promise<void> {
  const client = createServiceRoleClient()
  // board_column_states cascade on FK delete
  const { error } = await client
    .from('board_columns')
    .delete()
    .eq('column_id', columnId)

  if (error) throw error
}

export async function reorderColumns(
  boardId: string,
  columnIds: string[]
): Promise<void> {
  const client = createServiceRoleClient()

  // Update position for each column in order
  const updates = columnIds.map((column_id, index) =>
    client
      .from('board_columns')
      .update({ position: index })
      .eq('column_id', column_id)
      .eq('board_id', boardId)
  )

  const results = await Promise.all(updates)
  for (const { error } of results) {
    if (error) throw error
  }
}
