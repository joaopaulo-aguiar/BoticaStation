// ── Segmentation types (mirrors GraphQL schema) ─────────────────────────────

export interface SegmentCondition {
  field: string
  operator: string
  value: string
}

export interface Segment {
  id: string
  name: string
  description: string | null
  conditionLogic: string
  conditions: SegmentCondition[]
  contactCount: number | null
  lastCountAt: string | null
  createdAt: string
  updatedAt: string | null
  createdBy: string | null
}

export interface CreateSegmentInput {
  name: string
  description?: string | null
  conditionLogic?: string | null
  conditions: SegmentCondition[]
}

export interface UpdateSegmentInput {
  name?: string | null
  description?: string | null
  conditionLogic?: string | null
  conditions?: SegmentCondition[] | null
}

// ── Condition field definitions ─────────────────────────────────────────────

export type ConditionField =
  | 'lifecycleStage'
  | 'status'
  | 'emailStatus'
  | 'phoneStatus'
  | 'tags'
  | 'source'
  | 'createdAfter'
  | 'createdBefore'

export type ConditionOperator = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'in' | 'after' | 'before'

export interface FieldDefinition {
  field: ConditionField
  label: string
  operators: { value: ConditionOperator; label: string }[]
  valueType: 'select' | 'multi-select' | 'text' | 'date'
  options?: { value: string; label: string }[]
}

export const SEGMENT_FIELDS: FieldDefinition[] = [
  {
    field: 'lifecycleStage',
    label: 'Estágio do Ciclo',
    operators: [
      { value: 'equals', label: 'é igual a' },
      { value: 'not_equals', label: 'não é igual a' },
    ],
    valueType: 'select',
    options: [
      { value: 'lead', label: 'Lead' },
      { value: 'subscriber', label: 'Subscriber' },
      { value: 'customer', label: 'Customer' },
    ],
  },
  {
    field: 'status',
    label: 'Status',
    operators: [
      { value: 'equals', label: 'é igual a' },
      { value: 'not_equals', label: 'não é igual a' },
    ],
    valueType: 'select',
    options: [
      { value: 'active', label: 'Ativo' },
      { value: 'inactive', label: 'Inativo' },
    ],
  },
  {
    field: 'emailStatus',
    label: 'Status do E-mail',
    operators: [
      { value: 'equals', label: 'é igual a' },
      { value: 'not_equals', label: 'não é igual a' },
    ],
    valueType: 'select',
    options: [
      { value: 'active', label: 'Ativo' },
      { value: 'bounced', label: 'Bounce' },
      { value: 'complained', label: 'Complaint' },
      { value: 'unsubscribed', label: 'Descadastrado' },
    ],
  },
  {
    field: 'phoneStatus',
    label: 'Status do Telefone',
    operators: [
      { value: 'equals', label: 'é igual a' },
      { value: 'not_equals', label: 'não é igual a' },
    ],
    valueType: 'select',
    options: [
      { value: 'active', label: 'Ativo' },
      { value: 'invalid', label: 'Inválido' },
      { value: 'unsubscribed', label: 'Descadastrado' },
    ],
  },
  {
    field: 'tags',
    label: 'Tag',
    operators: [
      { value: 'contains', label: 'contém' },
      { value: 'not_contains', label: 'não contém' },
    ],
    valueType: 'text',
  },
  {
    field: 'source',
    label: 'Origem',
    operators: [
      { value: 'equals', label: 'é igual a' },
      { value: 'not_equals', label: 'não é igual a' },
    ],
    valueType: 'select',
    options: [
      { value: 'manual_input', label: 'Entrada Manual' },
      { value: 'import_csv', label: 'Importação CSV' },
      { value: 'website', label: 'Website' },
      { value: 'api', label: 'API' },
      { value: 'automation', label: 'Automação' },
    ],
  },
  {
    field: 'createdAfter',
    label: 'Criado após',
    operators: [
      { value: 'after', label: 'após' },
    ],
    valueType: 'date',
  },
  {
    field: 'createdBefore',
    label: 'Criado antes de',
    operators: [
      { value: 'before', label: 'antes de' },
    ],
    valueType: 'date',
  },
]
