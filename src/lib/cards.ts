import { createServerClient, createServiceRoleClient } from '@/lib/supabase'
import type {
  CardRow,
  CardDetail,
  CardAttachmentRow,
  CardCommentRow,
  CursorPage,
  Priority,
  CardType,
} from '@/types/workflow'

// ---- Card filter params for getCards() ----

export interface CardFilters {
  board_id?: string
  workflow_id?: string
  state_id?: string
  card_type?: CardType
  assigned_agent_id?: string
  parent_card_id?: string
  priority?: Priority
  labels?: string[] // containment: card must have ALL these labels
  search?: string // ILIKE on title + description
  cursor?: string // sort_order value for cursor-based pagination
  limit?: number // default 50
}

// ---- Card reads (server client) ----

export async function getCards(
  filters: CardFilters = {}
): Promise<CursorPage<CardRow>> {
  const {
    board_id,
    workflow_id,
    state_id,
    card_type,
    assigned_agent_id,
    parent_card_id,
    priority,
    labels,
    search,
    cursor,
    limit = 50,
  } = filters

  const client = createServerClient()

  // If board_id is provided, use the RPC function for server-side filtering
  if (board_id) {
    const { data, error } = await client.rpc('get_board_cards', {
      p_board_id: board_id,
    })
    if (error) throw error

    let cards = data as CardRow[]

    // Apply remaining filters client-side (RPC already handles board visibility)
    if (card_type) cards = cards.filter((c) => c.card_type === card_type)
    if (assigned_agent_id)
      cards = cards.filter((c) => c.assigned_agent_id === assigned_agent_id)
    if (state_id) cards = cards.filter((c) => c.state_id === state_id)
    if (priority) cards = cards.filter((c) => c.priority === priority)
    if (labels && labels.length > 0) {
      cards = cards.filter((c) =>
        labels.every((label) => c.labels.includes(label))
      )
    }
    if (search) {
      const term = search.toLowerCase()
      cards = cards.filter(
        (c) =>
          c.title.toLowerCase().includes(term) ||
          (c.description ?? '').toLowerCase().includes(term)
      )
    }

    // Apply cursor and limit
    if (cursor) {
      const idx = cards.findIndex((c) => c.sort_order === cursor)
      if (idx !== -1) cards = cards.slice(idx + 1)
    }

    const page = cards.slice(0, limit)
    const has_more = cards.length > limit
    const next_cursor = has_more ? page[page.length - 1].sort_order : null

    return { data: page, next_cursor, has_more }
  }

  // Direct DB query path (no board_id)
  let query = client
    .from('cards')
    .select('*')
    .order('sort_order')
    .limit(limit + 1) // fetch one extra to determine has_more

  if (workflow_id) query = query.eq('workflow_id', workflow_id)
  if (state_id) query = query.eq('state_id', state_id)
  if (card_type) query = query.eq('card_type', card_type)
  if (assigned_agent_id)
    query = query.eq('assigned_agent_id', assigned_agent_id)
  if (parent_card_id) query = query.eq('parent_card_id', parent_card_id)
  if (priority) query = query.eq('priority', priority)
  if (labels && labels.length > 0) {
    // JSONB @> containment operator — card must contain all requested labels
    query = query.contains('labels', labels)
  }
  if (search) {
    query = query.or(
      `title.ilike.%${search}%,description.ilike.%${search}%`
    )
  }
  if (cursor) {
    query = query.gt('sort_order', cursor)
  }

  const { data, error } = await query
  if (error) throw error

  const rows = data as CardRow[]
  const has_more = rows.length > limit
  const page = rows.slice(0, limit)
  const next_cursor = has_more ? page[page.length - 1].sort_order : null

  return { data: page, next_cursor, has_more }
}

export async function getCard(id: string): Promise<CardDetail> {
  const client = createServerClient()

  // Fetch the card
  const { data: card, error: cardErr } = await client
    .from('cards')
    .select('*')
    .eq('card_id', id)
    .single()

  if (cardErr) throw cardErr
  const cardRow = card as CardRow

  // Fetch related data in parallel
  const [attachmentsRes, commentsRes, childrenRes] =
    await Promise.all([
      client
        .from('card_attachments')
        .select('*')
        .eq('card_id', id)
        .order('created_at'),
      client
        .from('card_comments')
        .select('*')
        .eq('card_id', id)
        .order('created_at'),
      client
        .from('cards')
        .select('card_id, title, card_type, state_id')
        .eq('parent_card_id', id),
    ])

  if (attachmentsRes.error) throw attachmentsRes.error
  if (commentsRes.error) throw commentsRes.error
  if (childrenRes.error) throw childrenRes.error

  // Fetch parent card if exists
  let parent: { card_id: string; title: string; card_type: CardType } | null =
    null

  if (cardRow.parent_card_id) {
    const { data: parentData, error: parentErr } = await client
      .from('cards')
      .select('card_id, title, card_type')
      .eq('card_id', cardRow.parent_card_id)
      .single()

    if (parentErr && parentErr.code !== 'PGRST116') throw parentErr
    if (parentData) {
      parent = parentData as { card_id: string; title: string; card_type: CardType }
    }
  }

  // Build breadcrumb (recursive parent chain, max 4 levels)
  const breadcrumb = await getCardBreadcrumb(id)

  return {
    ...cardRow,
    attachments: attachmentsRes.data as CardAttachmentRow[],
    comments: commentsRes.data as CardCommentRow[],
    parent,
    children: childrenRes.data as Pick<
      CardRow,
      'card_id' | 'title' | 'card_type' | 'state_id'
    >[],
    breadcrumb,
  }
}

export async function getCardChildren(cardId: string): Promise<CardRow[]> {
  const client = createServerClient()
  const { data, error } = await client
    .from('cards')
    .select('*')
    .eq('parent_card_id', cardId)
    .order('sort_order')

  if (error) throw error
  return data as CardRow[]
}

export async function getCardBreadcrumb(
  cardId: string
): Promise<Pick<CardRow, 'card_id' | 'title' | 'card_type'>[]> {
  const client = createServerClient()
  const breadcrumb: Pick<CardRow, 'card_id' | 'title' | 'card_type'>[] = []

  // Start from the card itself and walk up parent chain (max 4 levels = subtask→task→story→epic)
  let currentId: string | null = cardId
  let level = 0
  const MAX_LEVELS = 4

  // Collect parent chain starting from immediate parent
  const seenIds = new Set<string>([cardId])

  // First get the card itself to find its parent
  const { data: startCard, error: startErr } = await client
    .from('cards')
    .select('card_id, title, card_type, parent_card_id')
    .eq('card_id', cardId)
    .single()

  if (startErr) throw startErr
  currentId = (startCard as CardRow & { parent_card_id: string | null }).parent_card_id

  while (currentId && level < MAX_LEVELS) {
    if (seenIds.has(currentId)) break // cycle protection
    seenIds.add(currentId)

    const { data: ancestor, error: ancestorErr } = await client
      .from('cards')
      .select('card_id, title, card_type, parent_card_id')
      .eq('card_id', currentId)
      .single()

    if (ancestorErr) break

    const ancestorRow = ancestor as CardRow & { parent_card_id: string | null }
    breadcrumb.unshift({
      card_id: ancestorRow.card_id,
      title: ancestorRow.title,
      card_type: ancestorRow.card_type,
    })

    currentId = ancestorRow.parent_card_id
    level++
  }

  return breadcrumb
}

// ---- Card writes (service role client) ----

export async function createCard(
  data: Pick<CardRow, 'workflow_id' | 'state_id' | 'card_type' | 'title'> &
    Partial<
      Pick<
        CardRow,
        | 'parent_card_id'
        | 'description'
        | 'assigned_agent_id'
        | 'priority'
        | 'labels'
        | 'due_date'
        | 'sort_order'
      >
    >
): Promise<CardRow> {
  const client = createServiceRoleClient()
  const { data: row, error } = await client
    .from('cards')
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return row as CardRow
}

export async function updateCard(
  id: string,
  data: Partial<
    Pick<
      CardRow,
      | 'state_id'
      | 'title'
      | 'description'
      | 'assigned_agent_id'
      | 'priority'
      | 'labels'
      | 'due_date'
      | 'sort_order'
      | 'parent_card_id'
    >
  >
): Promise<CardRow> {
  const client = createServiceRoleClient()
  const { data: row, error } = await client
    .from('cards')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('card_id', id)
    .select()
    .single()

  if (error) throw error
  return row as CardRow
}

export async function deleteCard(id: string): Promise<void> {
  const client = createServiceRoleClient()
  const { error } = await client.from('cards').delete().eq('card_id', id)
  if (error) throw error
}

export async function moveCard(
  cardId: string,
  stateId: string,
  movedBy: string
): Promise<void> {
  const client = createServiceRoleClient()
  const { error } = await client.rpc('move_card', {
    p_card_id: cardId,
    p_new_state_id: stateId,
    p_moved_by: movedBy,
  })

  if (error) throw error
}
