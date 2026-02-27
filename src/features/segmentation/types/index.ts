/**
 * Segmentation types — Visual query builder + static/dynamic lists.
 *
 * Models after RD Station / HubSpot segmentation:
 * - Static lists: manually curated contacts
 * - Dynamic lists: auto-updated based on rules (AND/OR logic)
 */

// ─── Field definitions available for segmentation ────────────────────────────

export type FieldType = 'string' | 'number' | 'date' | 'boolean' | 'array' | 'select'

export interface FieldDefinition {
  key: string
  label: string
  type: FieldType
  group: string
  options?: { label: string; value: string }[]
  description?: string
}

/**
 * All contact fields available for segmentation rules.
 * Add new fields here when the Contact schema is extended.
 */
export const CONTACT_FIELDS: FieldDefinition[] = [
  // ── Dados Básicos ──
  { key: 'full_name', label: 'Nome completo', type: 'string', group: 'Dados Básicos' },
  { key: 'email', label: 'E-mail', type: 'string', group: 'Dados Básicos' },
  { key: 'phone', label: 'Telefone', type: 'string', group: 'Dados Básicos' },
  { key: 'first_name', label: 'Primeiro nome', type: 'string', group: 'Dados Básicos' },
  { key: 'last_name', label: 'Sobrenome', type: 'string', group: 'Dados Básicos' },
  { key: 'source', label: 'Origem', type: 'string', group: 'Dados Básicos' },
  // ── Status & Classificação ──
  {
    key: 'lifecycle_stage',
    label: 'Estágio do ciclo de vida',
    type: 'select',
    group: 'Classificação',
    options: [
      { label: 'Cliente', value: 'customer' },
      { label: 'Assinante', value: 'subscriber' },
      { label: 'Lead', value: 'lead' },
    ],
  },
  {
    key: 'status',
    label: 'Status do contato',
    type: 'select',
    group: 'Classificação',
    options: [
      { label: 'Ativo', value: 'active' },
      { label: 'Inativo', value: 'inactive' },
      { label: 'Bounced', value: 'bounced' },
      { label: 'Descadastrado', value: 'unsubscribed' },
      { label: 'Reclamou', value: 'complained' },
    ],
  },
  { key: 'lead_score', label: 'Lead Score', type: 'number', group: 'Classificação' },
  // ── Tags ──
  { key: 'tags', label: 'Tags', type: 'array', group: 'Tags' },
  // ── Cashback ──
  { key: 'cashback_info.current_balance', label: 'Saldo Cashback', type: 'number', group: 'Cashback' },
  { key: 'cashback_info.lifetime_earned', label: 'Total Cashback Ganho', type: 'number', group: 'Cashback' },
  { key: 'cashback_info.expiry_date', label: 'Data Expiração Cashback', type: 'date', group: 'Cashback' },
  { key: 'cashback_info.last_transaction_date', label: 'Última Transação Cashback', type: 'date', group: 'Cashback' },
  // ── Opt-in ──
  { key: 'opt_in_email', label: 'Aceita e-mail', type: 'boolean', group: 'Opt-in' },
  { key: 'opt_in_sms', label: 'Aceita SMS', type: 'boolean', group: 'Opt-in' },
  // ── Datas ──
  { key: 'created_at', label: 'Data de criação', type: 'date', group: 'Datas' },
  { key: 'updated_at', label: 'Última atualização', type: 'date', group: 'Datas' },
  // ── Campos Personalizados ──
  { key: 'custom_fields.last_purchase_date', label: 'Data da última compra', type: 'date', group: 'Personalizado' },
  { key: 'custom_fields.purchase_frequency', label: 'Frequência de compra (dias)', type: 'number', group: 'Personalizado' },
  { key: 'custom_fields.product_category', label: 'Categoria de produto', type: 'string', group: 'Personalizado' },
  { key: 'custom_fields.referral_code', label: 'Código de indicação', type: 'string', group: 'Personalizado' },
  { key: 'custom_fields.affiliate_wallet', label: 'Carteira de afiliado (R$)', type: 'number', group: 'Personalizado' },
  { key: 'custom_fields.prescription_type', label: 'Tipo de receita', type: 'string', group: 'Personalizado' },
  { key: 'custom_fields.medication_duration_days', label: 'Duração do medicamento (dias)', type: 'number', group: 'Personalizado' },
]

// ─── Condition operators ─────────────────────────────────────────────────────

export type ConditionOperator =
  // String operators
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'exists'
  | 'not_exists'
  // Number operators
  | 'greater_than'
  | 'less_than'
  | 'greater_or_equal'
  | 'less_or_equal'
  | 'between'
  // Date operators
  | 'before'
  | 'after'
  | 'on'
  | 'in_last_days'
  | 'not_in_last_days'
  // Array operators
  | 'array_contains'
  | 'array_not_contains'
  | 'array_contains_all'
  | 'array_is_empty'
  | 'array_is_not_empty'
  // Boolean operators
  | 'is_true'
  | 'is_false'
  // Select operators
  | 'in'
  | 'not_in'

export const OPERATORS_BY_TYPE: Record<FieldType, { value: ConditionOperator; label: string }[]> = {
  string: [
    { value: 'equals', label: 'É igual a' },
    { value: 'not_equals', label: 'Não é igual a' },
    { value: 'contains', label: 'Contém' },
    { value: 'not_contains', label: 'Não contém' },
    { value: 'starts_with', label: 'Começa com' },
    { value: 'ends_with', label: 'Termina com' },
    { value: 'exists', label: 'Está preenchido' },
    { value: 'not_exists', label: 'Não está preenchido' },
  ],
  number: [
    { value: 'equals', label: 'É igual a' },
    { value: 'not_equals', label: 'Não é igual a' },
    { value: 'greater_than', label: 'Maior que' },
    { value: 'less_than', label: 'Menor que' },
    { value: 'greater_or_equal', label: 'Maior ou igual a' },
    { value: 'less_or_equal', label: 'Menor ou igual a' },
    { value: 'between', label: 'Entre' },
    { value: 'exists', label: 'Está preenchido' },
    { value: 'not_exists', label: 'Não está preenchido' },
  ],
  date: [
    { value: 'before', label: 'Antes de' },
    { value: 'after', label: 'Depois de' },
    { value: 'on', label: 'Exatamente em' },
    { value: 'in_last_days', label: 'Nos últimos X dias' },
    { value: 'not_in_last_days', label: 'Não nos últimos X dias' },
    { value: 'exists', label: 'Está preenchido' },
    { value: 'not_exists', label: 'Não está preenchido' },
  ],
  boolean: [
    { value: 'is_true', label: 'É verdadeiro' },
    { value: 'is_false', label: 'É falso' },
  ],
  array: [
    { value: 'array_contains', label: 'Contém' },
    { value: 'array_not_contains', label: 'Não contém' },
    { value: 'array_contains_all', label: 'Contém todos' },
    { value: 'array_is_empty', label: 'Está vazio' },
    { value: 'array_is_not_empty', label: 'Não está vazio' },
  ],
  select: [
    { value: 'equals', label: 'É igual a' },
    { value: 'not_equals', label: 'Não é igual a' },
    { value: 'in', label: 'É um de' },
    { value: 'not_in', label: 'Não é um de' },
  ],
}

// ─── Segment rule model (tree structure) ─────────────────────────────────────

export interface SegmentCondition {
  id: string
  field: string
  operator: ConditionOperator
  value: string | number | boolean | string[]
  /** Secondary value for "between" operator */
  value2?: string | number
}

export interface SegmentRuleGroup {
  id: string
  operator: 'AND' | 'OR'
  conditions: SegmentCondition[]
  groups: SegmentRuleGroup[]
}

// ─── Segment model ───────────────────────────────────────────────────────────

export type SegmentType = 'static' | 'dynamic'

export interface Segment {
  PK: string          // SEGMENT#<uuid>
  SK: string          // METADATA
  id: string
  name: string
  description: string
  type: SegmentType
  /** Rule tree for dynamic segments */
  rules?: SegmentRuleGroup
  /** Cached contact count (updated on evaluation) */
  contactCount: number
  createdAt: string
  updatedAt: string
}

export interface SegmentFormData {
  name: string
  description: string
  type: SegmentType
  rules?: SegmentRuleGroup
}

/** A member of a static segment — stored as separate DynamoDB item */
export interface SegmentMember {
  PK: string          // SEGMENT#<uuid>
  SK: string          // MEMBER#<email>
  email: string
  addedAt: string
}

// ─── No-value operators (don't need a value input) ───────────────────────────

export const NO_VALUE_OPERATORS: ConditionOperator[] = [
  'exists',
  'not_exists',
  'array_is_empty',
  'array_is_not_empty',
  'is_true',
  'is_false',
]
