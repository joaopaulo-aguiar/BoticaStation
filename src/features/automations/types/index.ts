// ── Automation types (canvas + backend contract) ─────────────────────────────

// ── Trigger types ────────────────────────────────────────────────────────────

export type TriggerType =
  | 'TAG_ADDED'
  | 'TAG_REMOVED'
  | 'ENTERED_LIST'
  | 'LIFECYCLE_CHANGED'
  | 'EVENT_OCCURRED'
  | 'FORM_SUBMITTED'
  | 'CONTACT_CREATED'
  | 'PURCHASE_MADE'
  | 'CART_ABANDONED'

export interface TriggerConfig {
  type: TriggerType
  params: Record<string, string>
}

// ── Node types ───────────────────────────────────────────────────────────────

export type NodeType =
  | 'ACTION_SEND_EMAIL'
  | 'ACTION_ADD_TAG'
  | 'ACTION_REMOVE_TAG'
  | 'ACTION_CHANGE_LIFECYCLE'
  | 'WAIT'
  | 'CONDITION'
  | 'END'

export type WaitUnit = 'MINUTES' | 'HOURS' | 'DAYS'

export type ConditionOperator =
  | 'CONTAINS'
  | 'NOT_CONTAINS'
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'GREATER_THAN'
  | 'LESS_THAN'
  | 'EXISTS'
  | 'NOT_EXISTS'

export interface WaitParams {
  duration: number
  unit: WaitUnit
}

export interface ConditionParams {
  field: string
  operator: ConditionOperator
  value: string
}

export interface ActionSendEmailParams {
  templateName: string
  fromAddress: string
  templateData: Record<string, string>
  configurationSet?: string
}

export interface ActionTagParams {
  tagId: string
}

export interface ActionChangeLifecycleParams {
  newStage: 'lead' | 'subscriber' | 'customer'
}

export type NodeParams =
  | WaitParams
  | ConditionParams
  | ActionSendEmailParams
  | ActionTagParams
  | ActionChangeLifecycleParams
  | Record<string, never>  // for END node

// ── Canvas Node (visual representation) ──────────────────────────────────────

export interface CanvasNode {
  id: string
  type: NodeType
  params: NodeParams
  /** Next node ID for sequential flows */
  next: string | null
  /** For CONDITION nodes only */
  branches?: {
    truePath: string | null
    falsePath: string | null
  }
  /** Canvas position (x, y) */
  position: { x: number; y: number }
}

// ── Automation (full entity) ─────────────────────────────────────────────────

export type AutomationStatus = 'draft' | 'active' | 'paused' | 'archived'

export interface Automation {
  id: string
  name: string
  description: string
  status: AutomationStatus
  trigger: TriggerConfig
  nodes: CanvasNode[]
  aslDefinition?: Record<string, unknown> | null
  stateMachineArn?: string | null
  sfnStatus?: string | null
  runningExecutions?: number | null
  createdAt: string
  updatedAt: string | null
  executionCount: number
  createdBy?: string
}

// ── Step Functions Execution types ───────────────────────────────────────────

export type ExecutionStatus = 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMED_OUT' | 'ABORTED'

export interface AutomationExecution {
  executionArn: string
  name?: string
  status: ExecutionStatus
  startDate?: string
  stopDate?: string
  automationId?: string
  automationName?: string
  contactId?: string
  contactEmail?: string
}

export interface ExecutionDetail {
  executionArn: string
  stateMachineArn?: string
  name?: string
  status: ExecutionStatus
  startDate?: string
  stopDate?: string
  input?: string    // AWSJSON
  output?: string   // AWSJSON
  contactId?: string
  contactEmail?: string
  automationId?: string
  automationName?: string
}

export interface ExecutionEvent {
  id: number
  type: string
  timestamp?: string
  previousEventId?: number
  detail?: string   // AWSJSON
}

export interface StartExecutionResult {
  executionArn: string
  startDate: string
  status: string
  automationId: string
  contactId: string
}

export const EXECUTION_STATUSES: { value: ExecutionStatus; label: string; color: string }[] = [
  { value: 'RUNNING', label: 'Em Execução', color: 'bg-blue-100 text-blue-700' },
  { value: 'SUCCEEDED', label: 'Concluída', color: 'bg-green-100 text-green-700' },
  { value: 'FAILED', label: 'Falhou', color: 'bg-red-100 text-red-700' },
  { value: 'TIMED_OUT', label: 'Timeout', color: 'bg-amber-100 text-amber-700' },
  { value: 'ABORTED', label: 'Interrompida', color: 'bg-slate-100 text-slate-600' },
]

// ── Exported payload (what gets sent to the backend via GraphQL) ─────────────

/** CreateAutomationInput — for new automations */
export interface CreateAutomationInput {
  name: string
  description?: string | null
  trigger: string   // AWSJSON (stringified TriggerConfig)
  nodes: string     // AWSJSON (stringified node array)
}

/** UpdateAutomationInput — partial updates */
export interface UpdateAutomationInput {
  name?: string
  description?: string | null
  trigger?: string  // AWSJSON
  nodes?: string    // AWSJSON
}

// ── Validation ───────────────────────────────────────────────────────────────

export interface ValidationError {
  nodeId: string | null
  message: string
}

// ── UI Config ────────────────────────────────────────────────────────────────

export const TRIGGER_TYPES: { value: TriggerType; label: string; description: string; icon: string }[] = [
  { value: 'CONTACT_CREATED', label: 'Novo contato', description: 'Quando um novo contato é criado', icon: '👤' },
  { value: 'TAG_ADDED', label: 'Tag adicionada', description: 'Quando um contato recebe uma tag', icon: '🏷️' },
  { value: 'TAG_REMOVED', label: 'Tag removida', description: 'Quando uma tag é removida de um contato', icon: '🏷️' },
  { value: 'ENTERED_LIST', label: 'Entrou na segmentação', description: 'Quando entra em uma lista de segmentação', icon: '📋' },
  { value: 'LIFECYCLE_CHANGED', label: 'Mudou de estágio', description: 'Quando o estágio do funil muda', icon: '🔄' },
  { value: 'PURCHASE_MADE', label: 'Realizou compra', description: 'Quando uma compra é registrada', icon: '🛒' },
  { value: 'CART_ABANDONED', label: 'Carrinho abandonado', description: 'Quando um carrinho é abandonado', icon: '🛒' },
  { value: 'EVENT_OCCURRED', label: 'Evento personalizado', description: 'Quando um evento específico acontece', icon: '⚡' },
  { value: 'FORM_SUBMITTED', label: 'Formulário enviado', description: 'Quando um formulário é submetido', icon: '📝' },
]

export const NODE_TYPES: { value: NodeType; label: string; description: string; icon: string; color: string; category: 'action' | 'flow' | 'end' }[] = [
  { value: 'ACTION_SEND_EMAIL', label: 'Enviar E-mail', description: 'Enviar um e-mail para o contato', icon: '📧', color: 'bg-blue-500', category: 'action' },
  { value: 'ACTION_ADD_TAG', label: 'Adicionar Tag', description: 'Adicionar uma tag ao contato', icon: '🏷️', color: 'bg-emerald-500', category: 'action' },
  { value: 'ACTION_REMOVE_TAG', label: 'Remover Tag', description: 'Remover uma tag do contato', icon: '🗑️', color: 'bg-amber-500', category: 'action' },
  { value: 'ACTION_CHANGE_LIFECYCLE', label: 'Mudar Estágio', description: 'Alterar o estágio do funil', icon: '🔄', color: 'bg-violet-500', category: 'action' },
  { value: 'WAIT', label: 'Aguardar', description: 'Pausar o fluxo por um tempo', icon: '⏱️', color: 'bg-orange-500', category: 'flow' },
  { value: 'CONDITION', label: 'Condição', description: 'Dividir o fluxo com base em uma regra', icon: '🔀', color: 'bg-rose-500', category: 'flow' },
  { value: 'END', label: 'Fim', description: 'Encerrar a jornada', icon: '🏁', color: 'bg-slate-500', category: 'end' },
]

export const WAIT_UNITS: { value: WaitUnit; label: string }[] = [
  { value: 'MINUTES', label: 'Minutos' },
  { value: 'HOURS', label: 'Horas' },
  { value: 'DAYS', label: 'Dias' },
]

export const CONDITION_FIELDS: { value: string; label: string }[] = [
  { value: 'contact.tags', label: 'Tags do contato' },
  { value: 'contact.lifecycleStage', label: 'Estágio do funil' },
  { value: 'contact.email', label: 'E-mail do contato' },
  { value: 'contact.emailStatus', label: 'Status do e-mail' },
  { value: 'event.emailOpened', label: 'Abriu o e-mail anterior' },
  { value: 'event.emailClicked', label: 'Clicou no e-mail anterior' },
  { value: 'contact.cashbackBalance', label: 'Saldo de cashback' },
  { value: 'contact.ecommerce.paidOrders', label: 'Pedidos pagos' },
]

export const CONDITION_OPERATORS: { value: ConditionOperator; label: string }[] = [
  { value: 'CONTAINS', label: 'Contém' },
  { value: 'NOT_CONTAINS', label: 'Não contém' },
  { value: 'EQUALS', label: 'É igual a' },
  { value: 'NOT_EQUALS', label: 'É diferente de' },
  { value: 'GREATER_THAN', label: 'Maior que' },
  { value: 'LESS_THAN', label: 'Menor que' },
  { value: 'EXISTS', label: 'Existe' },
  { value: 'NOT_EXISTS', label: 'Não existe' },
]

export const AUTOMATION_STATUSES: { value: AutomationStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Rascunho', color: 'bg-slate-100 text-slate-600' },
  { value: 'active', label: 'Ativo', color: 'bg-green-100 text-green-700' },
  { value: 'paused', label: 'Pausado', color: 'bg-amber-100 text-amber-700' },
  { value: 'archived', label: 'Arquivado', color: 'bg-red-100 text-red-600' },
]

export const LIFECYCLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'lead', label: 'Lead' },
  { value: 'subscriber', label: 'Subscriber' },
  { value: 'customer', label: 'Customer' },
]
