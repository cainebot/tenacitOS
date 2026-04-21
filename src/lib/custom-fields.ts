import { createServerClient, createServiceRoleClient } from '@/lib/supabase'
import type {
  CustomFieldDefinitionRow,
  CardCustomFieldValueRow,
  CardType,
} from '@/types/project'

// ---- Custom field reads (server client) ----

/**
 * Get custom field definitions for a workflow, optionally filtered by card_type.
 * Returns fields scoped to the given card_type AND fields with no card_type (global to workflow).
 */
export async function getFieldDefinitions(
  projectId: string,
  cardType?: CardType
): Promise<CustomFieldDefinitionRow[]> {
  const client = createServerClient()

  let query = client
    .from('custom_field_definitions')
    .select('*')
    .eq('project_id', projectId)
    .order('position')

  if (cardType) {
    // Return fields with no card_type (global) OR matching the given card_type
    query = query.or(`card_type.is.null,card_type.eq.${cardType}`)
  }

  const { data, error } = await query
  if (error) {
    // 42P01 / PGRST204 / PGRST205 = table does not exist (migration not yet applied)
    if (error.code === '42P01' || error.code === 'PGRST204' || error.code === 'PGRST205') return []
    throw error
  }
  return data as CustomFieldDefinitionRow[]
}

/**
 * Get all custom field values for a card.
 */
export async function getCardFieldValues(
  cardId: string
): Promise<CardCustomFieldValueRow[]> {
  const client = createServerClient()
  const { data, error } = await client
    .from('card_custom_field_values')
    .select('*')
    .eq('card_id', cardId)

  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST204' || error.code === 'PGRST205') return []
    throw error
  }
  return data as CardCustomFieldValueRow[]
}

// ---- Custom field writes (service role client) ----

export interface CreateFieldDefinitionData {
  card_type?: CardType | null
  name: string
  field_type: CustomFieldDefinitionRow['field_type']
  options?: string[] | null
  position?: number
  required?: boolean
}

export async function createFieldDefinition(
  projectId: string,
  data: CreateFieldDefinitionData
): Promise<CustomFieldDefinitionRow> {
  const client = createServiceRoleClient()
  const { data: row, error } = await client
    .from('custom_field_definitions')
    .insert({ project_id: projectId, ...data })
    .select()
    .single()

  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST204' || error.code === 'PGRST205') {
      throw new Error('Custom fields migration not yet applied. Run migration 06-custom-fields.sql.')
    }
    throw error
  }
  return row as CustomFieldDefinitionRow
}

export interface UpdateFieldDefinitionData {
  name?: string
  field_type?: CustomFieldDefinitionRow['field_type']
  options?: string[] | null
  position?: number
  required?: boolean
}

export async function updateFieldDefinition(
  fieldId: string,
  data: UpdateFieldDefinitionData
): Promise<CustomFieldDefinitionRow> {
  const client = createServiceRoleClient()
  const { data: row, error } = await client
    .from('custom_field_definitions')
    .update(data)
    .eq('field_id', fieldId)
    .select()
    .single()

  if (error) throw error
  return row as CustomFieldDefinitionRow
}

export async function deleteFieldDefinition(fieldId: string): Promise<void> {
  const client = createServiceRoleClient()
  const { error } = await client
    .from('custom_field_definitions')
    .delete()
    .eq('field_id', fieldId)

  if (error) throw error
}

export interface FieldValueInput {
  field_id: string
  value: unknown
}

/**
 * Upsert card field values. Inserts or updates on (card_id, field_id) conflict.
 */
export async function upsertCardFieldValues(
  cardId: string,
  values: FieldValueInput[]
): Promise<CardCustomFieldValueRow[]> {
  const client = createServiceRoleClient()
  const rows = values.map((v) => ({ card_id: cardId, field_id: v.field_id, value: v.value }))

  const { data, error } = await client
    .from('card_custom_field_values')
    .upsert(rows, { onConflict: 'card_id,field_id' })
    .select()

  if (error) throw error
  return data as CardCustomFieldValueRow[]
}
