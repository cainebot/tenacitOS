import { createServerClient, createServiceRoleClient } from '@/lib/supabase'
import type {
  CardRow,
  CardDetail,
  CardAttachmentRow,
  CardCommentRow,
  CardCustomFieldValueRow,
  CursorPage,
  Priority,
  CardType,
  ProjectStateRow,
  CustomFieldDefinitionRow,
} from '@/types/project'

// ---- Card filter params for getCards() ----

export interface CardFilters {
  board_id?: string
  project_id?: string
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
    project_id,
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

  if (project_id) query = query.eq('project_id', project_id)
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
  const [attachmentsRes, commentsRes, childrenRes, fieldValuesRes] =
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
      client
        .from('card_custom_field_values')
        .select('*')
        .eq('card_id', id)
        .then((res) => {
          // Graceful fallback if table doesn't exist yet (migration 06 not applied)
          if (res.error) {
            console.warn('[getCard] card_custom_field_values query failed:', res.error.code, res.error.message)
            return { data: [], error: null }
          }
          return res
        }),
    ])

  if (attachmentsRes.error) throw attachmentsRes.error
  if (commentsRes.error) throw commentsRes.error
  if (childrenRes.error) throw childrenRes.error
  if (fieldValuesRes.error) throw fieldValuesRes.error

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
    field_values: fieldValuesRes.data as CardCustomFieldValueRow[],
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
): Promise<Pick<CardRow, 'card_id' | 'title' | 'card_type' | 'code'>[]> {
  const client = createServerClient()
  const breadcrumb: Pick<CardRow, 'card_id' | 'title' | 'card_type' | 'code'>[] = []

  // Start from the card itself and walk up parent chain (max depth 2 = subtask→level2→epic; MAX_LEVELS kept at 4 as defensive headroom)
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
      code: (ancestorRow as CardRow).code ?? null,
    })

    currentId = ancestorRow.parent_card_id
    level++
  }

  return breadcrumb
}

// ---- Card writes (service role client) ----

export async function createCard(
  data: Pick<CardRow, 'project_id' | 'state_id' | 'card_type' | 'title'> &
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
  movedBy: string,
  sortOrder?: string,
): Promise<void> {
  const client = createServiceRoleClient()

  // If sortOrder not provided, fetch current sort_order to preserve it.
  // This maintains backward compatibility with callers that don't compute sort keys
  // (e.g. useCardDetail.ts status dropdown). Phase 69/70 will ensure all callers
  // pass sort_order explicitly via the Zustand store.
  let effectiveSortOrder = sortOrder
  if (effectiveSortOrder === undefined) {
    const { data } = await client
      .from('cards')
      .select('sort_order')
      .eq('card_id', cardId)
      .single()
    effectiveSortOrder = data?.sort_order ?? ''
  }

  const { error } = await client.rpc('move_card_with_order', {
    p_card_id: cardId,
    p_new_state_id: stateId,
    p_moved_by: movedBy,
    p_sort_order: effectiveSortOrder,
  })

  if (error) throw error
}

// ---- Phase 73: Sync-event-aware move (server-side helper) ----

export interface MoveCardSyncResult {
  cardId: string
  acceptedSyncId: number
  clientMutationId: string | null
}

/**
 * moveCardWithSyncEvent — server-side card move that also emits a
 * board_sync_events row in the same transaction.
 *
 * Used by server actions or other server-side callers that want causal
 * event tracking. The HTTP route variant handles browser-side calls.
 */
export async function moveCardWithSyncEvent(
  cardId: string,
  stateId: string,
  movedBy: string,
  sortOrder: string,
  boardId: string,
  clientId?: string,
  clientMutationId?: string,
): Promise<MoveCardSyncResult> {
  const client = createServiceRoleClient()

  const { data: syncId, error } = await client.rpc('move_card_with_sync_event', {
    p_card_id:     cardId,
    p_new_state_id: stateId,
    p_moved_by:    movedBy,
    p_sort_order:  sortOrder,
    p_board_id:    boardId,
    p_client_id:   clientId ?? null,
    p_mutation_id: clientMutationId ?? null,
  })

  if (error) throw error

  return {
    cardId,
    acceptedSyncId: syncId as number,
    clientMutationId: clientMutationId ?? null,
  }
}

// ---- GDPR anonymization ----

/**
 * gdprAnonymizeCard — GDPR opt-out handler.
 * Removes all PII from a card while preserving its structure for audit purposes.
 * - Clears title, description, assigned_agent_id, due_date
 * - Deletes attachment files from Storage and card_attachments table
 * - Anonymizes all comments (author + text)
 * - Clears PII custom field values (text, email, url types)
 * - Adds 'gdpr-optout' label
 * - Moves card to a done-category state (lost equivalent)
 * - Logs a gdpr_anonymize action to card_activity
 */
export async function gdprAnonymizeCard(cardId: string): Promise<CardRow> {
  const client = createServiceRoleClient()

  // Step 1: Fetch the card
  const { data: cardData, error: cardErr } = await client
    .from('cards')
    .select('*')
    .eq('card_id', cardId)
    .single()

  if (cardErr) throw cardErr
  const card = cardData as CardRow

  // Step 2: Find a done-category state — prefer one named "lost"
  let lostStateId: string | null = null
  const { data: doneStates } = await client
    .from('project_states')
    .select('state_id, name, category')
    .eq('project_id', card.project_id)
    .eq('category', 'done')
    .order('position')

  if (doneStates && doneStates.length > 0) {
    const states = doneStates as ProjectStateRow[]
    const lostState = states.find((s) =>
      s.name.toLowerCase().includes('lost')
    )
    // Prefer a "lost" named state; fall back to last done-category state by position
    lostStateId = lostState ? lostState.state_id : states[states.length - 1].state_id
  }

  // Step 3: Fetch card attachments
  const { data: attachments } = await client
    .from('card_attachments')
    .select('*')
    .eq('card_id', cardId)

  const attachmentRows = (attachments ?? []) as CardAttachmentRow[]

  // Step 4: Delete attachment files from Supabase Storage (non-blocking per file)
  for (const attachment of attachmentRows) {
    const { error: storageErr } = await client.storage
      .from('attachments')
      .remove([attachment.storage_path])
    if (storageErr) {
      // Log but do not abort — file may already be gone
      console.warn('[gdprAnonymizeCard] Storage remove failed for', attachment.storage_path, storageErr.message)
    }
  }

  // Step 5: Delete attachment records
  if (attachmentRows.length > 0) {
    const { error: attachDeleteErr } = await client
      .from('card_attachments')
      .delete()
      .eq('card_id', cardId)
    if (attachDeleteErr) throw attachDeleteErr
  }

  // Step 6: Anonymize comments
  const { error: commentsErr } = await client
    .from('card_comments')
    .update({ author: '[GDPR Removed]', text: '[GDPR Removed]' })
    .eq('card_id', cardId)
  if (commentsErr) throw commentsErr

  // Step 7: Clear PII custom field values (text, email, url types)
  const { data: piiFields, error: piiFieldsErr } = await client
    .from('custom_field_definitions')
    .select('field_id, field_type')
    .in('field_type', ['text', 'email', 'url'])

  if (piiFieldsErr) {
    // Table may not exist yet (migration 06 not applied) — skip gracefully
    if (
      piiFieldsErr.code !== '42P01' &&
      !piiFieldsErr.message.includes('42P01')
    ) {
      throw piiFieldsErr
    }
    console.warn('[gdprAnonymizeCard] custom_field_definitions not found, skipping PII field clear')
  } else if (piiFields && piiFields.length > 0) {
    const piiFieldIds = (piiFields as CustomFieldDefinitionRow[]).map((f) => f.field_id)
    const { error: valDeleteErr } = await client
      .from('card_custom_field_values')
      .delete()
      .eq('card_id', cardId)
      .in('field_id', piiFieldIds)
    if (valDeleteErr) {
      if (
        valDeleteErr.code !== '42P01' &&
        !valDeleteErr.message.includes('42P01')
      ) {
        throw valDeleteErr
      }
      console.warn('[gdprAnonymizeCard] card_custom_field_values not found, skipping')
    }
  }

  // Step 8: Update the card — anonymize PII fields, add gdpr-optout label, move to lost state
  const existingLabels: string[] = Array.isArray(card.labels) ? card.labels : []
  const updatedLabels = [
    ...existingLabels.filter((l) => l !== 'gdpr-optout'),
    'gdpr-optout',
  ]

  const cardUpdate: Partial<CardRow> & { updated_at: string } = {
    title: '[GDPR Removed]',
    description: null,
    assigned_agent_id: null,
    due_date: null,
    labels: updatedLabels,
    updated_at: new Date().toISOString(),
    ...(lostStateId ? { state_id: lostStateId } : {}),
  }

  const { data: updatedCard, error: updateErr } = await client
    .from('cards')
    .update(cardUpdate)
    .eq('card_id', cardId)
    .select()
    .single()

  if (updateErr) throw updateErr

  // Step 9: Log GDPR anonymization to card_activity
  const { error: activityErr } = await client
    .from('card_activity')
    .insert({
      card_id: cardId,
      actor: 'system',
      action: 'gdpr_anonymize',
      old_value: { title: card.title },
      new_value: { title: '[GDPR Removed]' },
    })
  if (activityErr) throw activityErr

  return updatedCard as CardRow
}
