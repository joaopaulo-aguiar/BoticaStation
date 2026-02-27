/**
 * Automation / Workflow types — Visual workflow builder.
 *
 * Models after RD Station / HubSpot automation workflows:
 * - Triggers: what starts the automation
 * - Actions: what the system does
 * - Conditions: if/else branching
 * - Delays: wait periods
 */

// ─── Automation status ───────────────────────────────────────────────────────

export type AutomationStatus = 'draft' | 'active' | 'paused' | 'archived'

// ─── Node types ──────────────────────────────────────────────────────────────

export type NodeType = 'trigger' | 'action' | 'condition' | 'delay'

// ── Trigger subtypes ──

export type TriggerType =
  | 'segment_entered'       // Contact enters a segment
  | 'tag_added'             // A tag was added to contact
  | 'tag_removed'           // A tag was removed
  | 'field_changed'         // A contact field was updated
  | 'email_opened'          // Contact opened a campaign email
  | 'email_clicked'         // Contact clicked a link
  | 'purchase_made'         // Purchase event (via API/webhook)
  | 'cashback_received'     // Cashback credited
  | 'cashback_expiring'     // Cashback about to expire
  | 'abandoned_cart'        // Cart/quote abandoned
  | 'manual'                // Manually triggered

export const TRIGGER_LABELS: Record<TriggerType, string> = {
  segment_entered: 'Entrou na Segmentação',
  tag_added: 'Tag adicionada',
  tag_removed: 'Tag removida',
  field_changed: 'Campo alterado',
  email_opened: 'Abriu e-mail da Campanha',
  email_clicked: 'Clicou em link da Campanha',
  purchase_made: 'Compra realizada',
  cashback_received: 'Cashback recebido',
  cashback_expiring: 'Cashback prestes a expirar',
  abandoned_cart: 'Orçamento/Carrinho abandonado',
  manual: 'Disparo manual',
}

export const TRIGGER_DESCRIPTIONS: Record<TriggerType, string> = {
  segment_entered: 'O lead entra automaticamente quando se encaixa nos critérios da segmentação.',
  tag_added: 'Dispara quando uma tag específica é adicionada ao contato.',
  tag_removed: 'Dispara quando uma tag específica é removida do contato.',
  field_changed: 'Dispara quando um campo do contato é alterado (ex: Saldo Cashback).',
  email_opened: 'Dispara quando o contato abre um e-mail de uma campanha específica.',
  email_clicked: 'Dispara quando o contato clica em um link de uma campanha.',
  purchase_made: 'Dispara quando uma compra é finalizada (via integração ERP).',
  cashback_received: 'Dispara quando cashback é creditado na conta do cliente.',
  cashback_expiring: 'Dispara X dias antes do cashback expirar.',
  abandoned_cart: 'Dispara quando um orçamento é marcado como não fechado no ERP.',
  manual: 'Os contatos são adicionados manualmente ou via API.',
}

// ── Action subtypes ──

export type ActionType =
  | 'send_email'            // Send an email using a template
  | 'send_sms'              // Send SMS (future)
  | 'add_tag'               // Add tag to contact
  | 'remove_tag'            // Remove tag from contact
  | 'update_field'          // Update a contact field
  | 'add_to_segment'        // Add to static segment
  | 'remove_from_segment'   // Remove from static segment
  | 'webhook'               // Call external webhook
  | 'notify_team'           // Internal notification

export const ACTION_LABELS: Record<ActionType, string> = {
  send_email: 'Enviar E-mail',
  send_sms: 'Enviar SMS',
  add_tag: 'Adicionar Tag',
  remove_tag: 'Remover Tag',
  update_field: 'Atualizar Campo',
  add_to_segment: 'Adicionar à Segmentação',
  remove_from_segment: 'Remover da Segmentação',
  webhook: 'Webhook Externo',
  notify_team: 'Notificar Equipe',
}

// ── Condition subtypes ──

export type ConditionType =
  | 'field_check'           // Check contact field value
  | 'tag_check'             // Check if contact has tag
  | 'email_activity'        // Check if opened/clicked email
  | 'segment_membership'    // Check if in segment
  | 'cashback_balance'      // Check cashback balance

export const CONDITION_LABELS: Record<ConditionType, string> = {
  field_check: 'Verificar campo do contato',
  tag_check: 'Verificar se possui tag',
  email_activity: 'Verificar atividade de e-mail',
  segment_membership: 'Verificar pertencimento à segmentação',
  cashback_balance: 'Verificar saldo de cashback',
}

// ── Delay subtypes ──

export type DelayType =
  | 'fixed_time'            // Wait X minutes/hours/days
  | 'until_date'            // Wait until specific date field
  | 'until_day_of_week'     // Wait until next specific day of week

export const DELAY_LABELS: Record<DelayType, string> = {
  fixed_time: 'Aguardar tempo fixo',
  until_date: 'Aguardar até data',
  until_day_of_week: 'Aguardar até dia da semana',
}

export type DelayUnit = 'minutes' | 'hours' | 'days'

export const DELAY_UNIT_LABELS: Record<DelayUnit, string> = {
  minutes: 'Minutos',
  hours: 'Horas',
  days: 'Dias',
}

// ─── Node configuration types ────────────────────────────────────────────────

export interface TriggerConfig {
  triggerType: TriggerType
  segmentId?: string          // for segment_entered
  tagName?: string            // for tag_added / tag_removed
  fieldKey?: string           // for field_changed
  campaignId?: string         // for email_opened / email_clicked
  daysBeforeExpiry?: number   // for cashback_expiring
}

export interface ActionConfig {
  actionType: ActionType
  templateName?: string       // for send_email
  subject?: string            // for send_email
  senderEmail?: string        // for send_email
  senderName?: string         // for send_email
  tagName?: string            // for add_tag / remove_tag
  fieldKey?: string           // for update_field
  fieldValue?: string         // for update_field
  segmentId?: string          // for add_to_segment / remove_from_segment
  webhookUrl?: string         // for webhook
  webhookMethod?: 'GET' | 'POST' | 'PUT'
  message?: string            // for notify_team / send_sms
}

export interface ConditionConfig {
  conditionType: ConditionType
  field?: string              // for field_check
  operator?: string           // comparison operator
  value?: string | number | boolean
  tagName?: string            // for tag_check
  campaignId?: string         // for email_activity
  emailAction?: 'opened' | 'clicked'
  segmentId?: string          // for segment_membership
  balanceOperator?: 'greater_than' | 'less_than' | 'equals'
  balanceValue?: number       // for cashback_balance
}

export interface DelayConfig {
  delayType: DelayType
  duration?: number           // for fixed_time
  unit?: DelayUnit            // for fixed_time
  dateField?: string          // for until_date (contact field to check)
  dayOfWeek?: number          // 0=Sun, 1=Mon, ..., 6=Sat
  time?: string               // HH:mm format
}

// ─── Node model ──────────────────────────────────────────────────────────────

export interface NodeConnection {
  targetNodeId: string
  label?: string              // e.g., 'Sim', 'Não' for conditions
  sourceHandle?: 'default' | 'true' | 'false'
}

export interface AutomationNode {
  id: string
  type: NodeType
  label: string
  config: TriggerConfig | ActionConfig | ConditionConfig | DelayConfig
  position: { x: number; y: number }
  connections: NodeConnection[]
}

// ─── Automation model ────────────────────────────────────────────────────────

export interface AutomationStats {
  totalEntered: number
  activeContacts: number
  completedContacts: number
  emailsSent: number
}

export interface Automation {
  PK: string              // AUTOMATION#<uuid>
  SK: string              // METADATA
  id: string
  name: string
  description: string
  status: AutomationStatus
  nodes: AutomationNode[]
  stats: AutomationStats
  createdAt: string
  updatedAt: string
}

export interface AutomationFormData {
  name: string
  description: string
  nodes: AutomationNode[]
}

// ─── Automation execution log ────────────────────────────────────────────────

export interface AutomationExecution {
  PK: string              // AUTOEXEC#<automationId>
  SK: string              // CONTACT#<email>#<timestamp>
  automationId: string
  contactEmail: string
  currentNodeId: string
  status: 'active' | 'completed' | 'paused' | 'error'
  startedAt: string
  lastStepAt: string
  completedAt?: string
  history: Array<{
    nodeId: string
    action: string
    timestamp: string
    result?: string
  }>
}

// ─── Template configs for common automations ─────────────────────────────────

export interface AutomationTemplate {
  id: string
  name: string
  description: string
  icon: string
  category: 'engagement' | 'cashback' | 'sales' | 'retention'
  nodes: AutomationNode[]
}

export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    id: 'continuous-use',
    name: 'Uso Contínuo (Recorrência)',
    description: 'Lembra o cliente de refazer a receita quando o medicamento está acabando.',
    icon: '💊',
    category: 'retention',
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        label: 'Compra realizada',
        config: { triggerType: 'purchase_made' } as TriggerConfig,
        position: { x: 250, y: 0 },
        connections: [{ targetNodeId: 'delay-1' }],
      },
      {
        id: 'delay-1',
        type: 'delay',
        label: 'Aguardar 25 dias',
        config: { delayType: 'fixed_time', duration: 25, unit: 'days' } as DelayConfig,
        position: { x: 250, y: 100 },
        connections: [{ targetNodeId: 'action-1' }],
      },
      {
        id: 'action-1',
        type: 'action',
        label: 'Enviar E-mail de Lembrete',
        config: { actionType: 'send_email', subject: 'Sua fórmula está quase acabando!' } as ActionConfig,
        position: { x: 250, y: 200 },
        connections: [],
      },
    ],
  },
  {
    id: 'cashback-notification',
    name: 'Notificação de Cashback',
    description: 'Notifica o cliente quando cashback é creditado e alerta antes de expirar.',
    icon: '💰',
    category: 'cashback',
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        label: 'Cashback recebido',
        config: { triggerType: 'cashback_received' } as TriggerConfig,
        position: { x: 250, y: 0 },
        connections: [{ targetNodeId: 'action-1' }],
      },
      {
        id: 'action-1',
        type: 'action',
        label: 'Enviar E-mail de Cashback',
        config: { actionType: 'send_email', subject: 'Você ganhou cashback!' } as ActionConfig,
        position: { x: 250, y: 100 },
        connections: [{ targetNodeId: 'delay-1' }],
      },
      {
        id: 'delay-1',
        type: 'delay',
        label: 'Aguardar 25 dias',
        config: { delayType: 'fixed_time', duration: 25, unit: 'days' } as DelayConfig,
        position: { x: 250, y: 200 },
        connections: [{ targetNodeId: 'condition-1' }],
      },
      {
        id: 'condition-1',
        type: 'condition',
        label: 'Saldo > 0?',
        config: { conditionType: 'cashback_balance', balanceOperator: 'greater_than', balanceValue: 0 } as ConditionConfig,
        position: { x: 250, y: 300 },
        connections: [
          { targetNodeId: 'action-2', label: 'Sim', sourceHandle: 'true' },
          { targetNodeId: 'end', label: 'Não', sourceHandle: 'false' },
        ],
      },
      {
        id: 'action-2',
        type: 'action',
        label: 'Enviar E-mail de Expiração',
        config: { actionType: 'send_email', subject: 'Seu cashback expira em 5 dias!' } as ActionConfig,
        position: { x: 150, y: 400 },
        connections: [],
      },
    ],
  },
  {
    id: 'abandoned-cart',
    name: 'Orçamento Abandonado',
    description: 'Fluxo de recuperação quando o cliente não fecha o orçamento/receita.',
    icon: '🛒',
    category: 'sales',
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        label: 'Orçamento abandonado',
        config: { triggerType: 'abandoned_cart' } as TriggerConfig,
        position: { x: 250, y: 0 },
        connections: [{ targetNodeId: 'delay-1' }],
      },
      {
        id: 'delay-1',
        type: 'delay',
        label: 'Aguardar 2 horas',
        config: { delayType: 'fixed_time', duration: 2, unit: 'hours' } as DelayConfig,
        position: { x: 250, y: 100 },
        connections: [{ targetNodeId: 'action-1' }],
      },
      {
        id: 'action-1',
        type: 'action',
        label: 'Enviar E-mail 1',
        config: { actionType: 'send_email', subject: 'Ainda pensando na sua fórmula?' } as ActionConfig,
        position: { x: 250, y: 200 },
        connections: [{ targetNodeId: 'delay-2' }],
      },
      {
        id: 'delay-2',
        type: 'delay',
        label: 'Aguardar 24 horas',
        config: { delayType: 'fixed_time', duration: 24, unit: 'hours' } as DelayConfig,
        position: { x: 250, y: 300 },
        connections: [{ targetNodeId: 'condition-1' }],
      },
      {
        id: 'condition-1',
        type: 'condition',
        label: 'Abriu e-mail anterior?',
        config: { conditionType: 'email_activity', emailAction: 'opened' } as ConditionConfig,
        position: { x: 250, y: 400 },
        connections: [
          { targetNodeId: 'action-2', label: 'Sim', sourceHandle: 'true' },
          { targetNodeId: 'action-3', label: 'Não', sourceHandle: 'false' },
        ],
      },
      {
        id: 'action-2',
        type: 'action',
        label: 'Enviar oferta de frete grátis',
        config: { actionType: 'send_email', subject: 'Frete grátis para você!' } as ActionConfig,
        position: { x: 100, y: 500 },
        connections: [],
      },
      {
        id: 'action-3',
        type: 'action',
        label: 'Enviar desconto progressivo',
        config: { actionType: 'send_email', subject: '10% de desconto na sua fórmula' } as ActionConfig,
        position: { x: 400, y: 500 },
        connections: [],
      },
    ],
  },
  {
    id: 'affiliate-reward',
    name: 'Recompensa de Afiliado',
    description: 'Notifica o afiliado quando uma compra é feita com seu cupom.',
    icon: '🤝',
    category: 'engagement',
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        label: 'Compra com cupom',
        config: { triggerType: 'purchase_made' } as TriggerConfig,
        position: { x: 250, y: 0 },
        connections: [{ targetNodeId: 'action-1' }],
      },
      {
        id: 'action-1',
        type: 'action',
        label: 'Creditar comissão',
        config: { actionType: 'update_field', fieldKey: 'custom_fields.affiliate_wallet' } as ActionConfig,
        position: { x: 250, y: 100 },
        connections: [{ targetNodeId: 'action-2' }],
      },
      {
        id: 'action-2',
        type: 'action',
        label: 'E-mail de comissão',
        config: { actionType: 'send_email', subject: 'Comissão creditada!' } as ActionConfig,
        position: { x: 250, y: 200 },
        connections: [],
      },
    ],
  },
]
