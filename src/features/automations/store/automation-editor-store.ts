import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import { generateASL } from '../lib/asl-generator'
import type { ASLDefinition } from '../lib/asl-generator'
import type {
  Automation, CreateAutomationInput, UpdateAutomationInput,
  CanvasNode, NodeType, NodeParams, TriggerConfig,
  ValidationError, ConditionParams, WaitParams,
  ActionSendEmailParams, ActionTagParams, ActionChangeLifecycleParams,
} from '../types'

// ── Helpers ──────────────────────────────────────────────────────────────────

function defaultParams(type: NodeType): NodeParams {
  switch (type) {
    case 'WAIT': return { duration: 1, unit: 'DAYS' } as WaitParams
    case 'CONDITION': return { field: 'contact.tags', operator: 'CONTAINS', value: '' } as ConditionParams
    case 'ACTION_SEND_EMAIL': return { templateName: '', fromAddress: '', templateData: {} } as ActionSendEmailParams
    case 'ACTION_ADD_TAG':
    case 'ACTION_REMOVE_TAG': return { tagId: '' } as ActionTagParams
    case 'ACTION_CHANGE_LIFECYCLE': return { newStage: 'subscriber' } as ActionChangeLifecycleParams
    case 'END': return {} as Record<string, never>
  }
}

const NODE_HEIGHT = 100
const NODE_GAP = 40
function nextYPosition(nodes: CanvasNode[]): number {
  if (nodes.length === 0) return 80
  const maxY = Math.max(...nodes.map((n) => n.position.y))
  return maxY + NODE_HEIGHT + NODE_GAP
}

// ── Store ────────────────────────────────────────────────────────────────────

interface AutomationEditorState {
  // Current automation being edited
  automation: Automation | null
  selectedNodeId: string | null
  isDirty: boolean
  validationErrors: ValidationError[]

  // Actions
  newAutomation: () => void
  loadAutomation: (automation: Automation) => void
  setName: (name: string) => void
  setDescription: (description: string) => void
  setTrigger: (trigger: TriggerConfig) => void

  // Node operations
  addNode: (type: NodeType, afterNodeId?: string | null) => string
  updateNodeParams: (nodeId: string, params: NodeParams) => void
  removeNode: (nodeId: string) => void
  connectNodes: (fromId: string, toId: string, branch?: 'true' | 'false') => void
  disconnectNode: (fromId: string, branch?: 'true' | 'false') => void
  moveNode: (nodeId: string, position: { x: number; y: number }) => void
  selectNode: (nodeId: string | null) => void

  // Validation & export
  validate: () => ValidationError[]
  /** Build a CreateAutomationInput (for new) or UpdateAutomationInput (for update) */
  exportPayload: () => { isNew: boolean; createInput?: CreateAutomationInput; updateInput?: UpdateAutomationInput } | null
  /** Generate an ASL preview from the current automation */
  getASLPreview: () => ASLDefinition | null
}

export const useAutomationEditor = create<AutomationEditorState>((set, get) => ({
  automation: null,
  selectedNodeId: null,
  isDirty: false,
  validationErrors: [],

  newAutomation: () => {
    const endId = `node_END_${uuid().slice(0, 8)}`
    set({
      automation: {
        id: uuid(),
        name: 'Nova Automação',
        description: '',
        status: 'draft',
        trigger: { type: 'TAG_ADDED', params: {} },
        nodes: [
          {
            id: endId,
            type: 'END',
            params: {},
            next: null,
            position: { x: 300, y: 80 },
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: null,
        executionCount: 0,
      },
      selectedNodeId: null,
      isDirty: true,
      validationErrors: [],
    })
  },

  loadAutomation: (automation) => {
    set({ automation: { ...automation }, selectedNodeId: null, isDirty: false, validationErrors: [] })
  },

  setName: (name) => {
    const { automation } = get()
    if (!automation) return
    set({ automation: { ...automation, name }, isDirty: true })
  },

  setDescription: (description) => {
    const { automation } = get()
    if (!automation) return
    set({ automation: { ...automation, description }, isDirty: true })
  },

  setTrigger: (trigger) => {
    const { automation } = get()
    if (!automation) return
    set({ automation: { ...automation, trigger }, isDirty: true })
  },

  addNode: (type, afterNodeId) => {
    const { automation } = get()
    if (!automation) return ''

    const newId = `node_${uuid().slice(0, 8)}`
    const nodes = [...automation.nodes]
    const y = nextYPosition(nodes)

    const newNode: CanvasNode = {
      id: newId,
      type,
      params: defaultParams(type),
      next: null,
      position: { x: 300, y },
      ...(type === 'CONDITION' ? { branches: { truePath: null, falsePath: null } } : {}),
    }

    // If adding after a specific node, rewire connections
    if (afterNodeId) {
      const afterNode = nodes.find((n) => n.id === afterNodeId)
      if (afterNode) {
        // New node takes the "next" of the after node
        if (type !== 'CONDITION') {
          newNode.next = afterNode.next
        }
        // After node now points to new node
        if (afterNode.type === 'CONDITION') {
          // Don't auto-wire conditions
        } else {
          afterNode.next = newId
        }
        // Position new node below the after node
        newNode.position = {
          x: afterNode.position.x,
          y: afterNode.position.y + NODE_HEIGHT + NODE_GAP,
        }
        // Shift all nodes below down
        const threshold = newNode.position.y - NODE_GAP / 2
        nodes.forEach((n) => {
          if (n.id !== afterNodeId && n.id !== newId && n.position.y >= threshold) {
            n.position = { ...n.position, y: n.position.y + NODE_HEIGHT + NODE_GAP }
          }
        })
      }
    }

    nodes.push(newNode)
    set({ automation: { ...automation, nodes }, isDirty: true, selectedNodeId: newId })
    return newId
  },

  updateNodeParams: (nodeId, params) => {
    const { automation } = get()
    if (!automation) return
    const nodes = automation.nodes.map((n) => n.id === nodeId ? { ...n, params } : n)
    set({ automation: { ...automation, nodes }, isDirty: true })
  },

  removeNode: (nodeId) => {
    const { automation } = get()
    if (!automation) return

    const node = automation.nodes.find((n) => n.id === nodeId)
    if (!node || node.type === 'END') return // Cannot remove END nodes

    const nodes = automation.nodes.filter((n) => n.id !== nodeId)

    // Rewire: any node pointing to the removed node now points to the removed node's next
    nodes.forEach((n) => {
      if (n.next === nodeId) {
        n.next = node.next
      }
      if (n.branches) {
        if (n.branches.truePath === nodeId) n.branches.truePath = node.next
        if (n.branches.falsePath === nodeId) n.branches.falsePath = node.next
      }
    })

    set({
      automation: { ...automation, nodes },
      isDirty: true,
      selectedNodeId: get().selectedNodeId === nodeId ? null : get().selectedNodeId,
    })
  },

  connectNodes: (fromId, toId, branch) => {
    const { automation } = get()
    if (!automation) return
    const nodes = automation.nodes.map((n) => {
      if (n.id !== fromId) return n
      if (branch === 'true' && n.branches) return { ...n, branches: { ...n.branches, truePath: toId } }
      if (branch === 'false' && n.branches) return { ...n, branches: { ...n.branches, falsePath: toId } }
      return { ...n, next: toId }
    })
    set({ automation: { ...automation, nodes }, isDirty: true })
  },

  disconnectNode: (fromId, branch) => {
    const { automation } = get()
    if (!automation) return
    const nodes = automation.nodes.map((n) => {
      if (n.id !== fromId) return n
      if (branch === 'true' && n.branches) return { ...n, branches: { ...n.branches, truePath: null } }
      if (branch === 'false' && n.branches) return { ...n, branches: { ...n.branches, falsePath: null } }
      return { ...n, next: null }
    })
    set({ automation: { ...automation, nodes }, isDirty: true })
  },

  moveNode: (nodeId, position) => {
    const { automation } = get()
    if (!automation) return
    const nodes = automation.nodes.map((n) => n.id === nodeId ? { ...n, position } : n)
    set({ automation: { ...automation, nodes }, isDirty: true })
  },

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

  validate: () => {
    const { automation } = get()
    if (!automation) return [{ nodeId: null, message: 'Nenhuma automação carregada' }]

    const errors: ValidationError[] = []

    // Validate trigger
    if (!automation.trigger.type) {
      errors.push({ nodeId: null, message: 'Selecione um gatilho de entrada' })
    }
    if (automation.trigger.type === 'TAG_ADDED' && !automation.trigger.params.tagId) {
      errors.push({ nodeId: null, message: 'Selecione a tag do gatilho' })
    }

    // Validate name
    if (!automation.name.trim()) {
      errors.push({ nodeId: null, message: 'O nome da automação é obrigatório' })
    }

    // Validate nodes
    for (const node of automation.nodes) {
      // All non-END nodes must have a next connection
      if (node.type !== 'END' && node.type !== 'CONDITION') {
        if (!node.next) {
          errors.push({ nodeId: node.id, message: `Nó "${getNodeLabel(node)}" não está conectado a um próximo nó` })
        }
      }

      // CONDITION must have both branches
      if (node.type === 'CONDITION') {
        if (!node.branches?.truePath) {
          errors.push({ nodeId: node.id, message: `Condição "${getNodeLabel(node)}" não tem caminho SIM` })
        }
        if (!node.branches?.falsePath) {
          errors.push({ nodeId: node.id, message: `Condição "${getNodeLabel(node)}" não tem caminho NÃO` })
        }
        const params = node.params as ConditionParams
        if (!params.value && params.operator !== 'EXISTS' && params.operator !== 'NOT_EXISTS') {
          errors.push({ nodeId: node.id, message: 'O valor da condição é obrigatório' })
        }
      }

      // WAIT must have duration > 0
      if (node.type === 'WAIT') {
        const params = node.params as WaitParams
        if (!params.duration || params.duration <= 0) {
          errors.push({ nodeId: node.id, message: 'A duração da espera deve ser maior que 0' })
        }
      }

      // ACTION_SEND_EMAIL must have campaign selected
      if (node.type === 'ACTION_SEND_EMAIL') {
        const params = node.params as ActionSendEmailParams
        if (!params.templateName) {
          errors.push({ nodeId: node.id, message: 'Selecione um template de e-mail' })
        }
        if (!params.fromAddress) {
          errors.push({ nodeId: node.id, message: 'Selecione um remetente' })
        }
      }

      // TAG actions must have tagId
      if ((node.type === 'ACTION_ADD_TAG' || node.type === 'ACTION_REMOVE_TAG')) {
        const params = node.params as ActionTagParams
        if (!params.tagId) {
          errors.push({ nodeId: node.id, message: 'Selecione uma tag' })
        }
      }
    }

    // Must have at least one END node reachable
    const hasEnd = automation.nodes.some((n) => n.type === 'END')
    if (!hasEnd) {
      errors.push({ nodeId: null, message: 'O fluxo deve ter pelo menos um nó de Fim' })
    }

    set({ validationErrors: errors })
    return errors
  },

  exportPayload: () => {
    const { automation, validate } = get()
    if (!automation) return null

    const errors = validate()
    if (errors.length > 0) return null

    // Strip `position` from nodes for backend storage — it stays only in the AWSJSON
    const nodesForBackend = automation.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      params: n.params,
      next: n.next,
      position: n.position,
      ...(n.branches ? { branches: n.branches } : {}),
    }))

    const isNew = !automation.updatedAt // new automations have no updatedAt yet

    if (isNew) {
      return {
        isNew: true,
        createInput: {
          name: automation.name,
          description: automation.description || null,
          trigger: JSON.stringify(automation.trigger),
          nodes: JSON.stringify(nodesForBackend),
        } satisfies CreateAutomationInput,
      }
    }

    return {
      isNew: false,
      updateInput: {
        name: automation.name,
        description: automation.description || null,
        trigger: JSON.stringify(automation.trigger),
        nodes: JSON.stringify(nodesForBackend),
      } satisfies UpdateAutomationInput,
    }
  },

  getASLPreview: () => {
    const { automation } = get()
    if (!automation || automation.nodes.length === 0) return null
    try {
      return generateASL(
        automation.name,
        automation.trigger,
        automation.nodes,
        {
          sqsQueueUrl: '${SQS_QUEUE_URL}',
          automationsLambdaArn: '${AUTOMATIONS_LAMBDA_ARN}',
        },
      )
    } catch {
      return null
    }
  },
}))

function getNodeLabel(node: CanvasNode): string {
  switch (node.type) {
    case 'WAIT': return `Aguardar ${(node.params as WaitParams).duration} ${(node.params as WaitParams).unit}`
    case 'CONDITION': return `Condição: ${(node.params as ConditionParams).field}`
    case 'ACTION_SEND_EMAIL': return `Enviar E-mail`
    case 'ACTION_ADD_TAG': return `Adicionar Tag`
    case 'ACTION_REMOVE_TAG': return `Remover Tag`
    case 'ACTION_CHANGE_LIFECYCLE': return `Mudar Estágio`
    case 'END': return 'Fim'
  }
}
