/**
 * Workflow Canvas — Vertical flow builder for automation nodes.
 *
 * Renders nodes as cards in a vertical flow with connection lines.
 * Supports: trigger, action, condition (branching), delay nodes.
 * Condition nodes create bifurcations (Sim/Não paths).
 */
import { useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import {
  Plus,
  Trash2,
  Zap,
  Mail,
  MessageSquare,
  Tag,
  Clock,
  GitBranch,
  FileEdit,
  Globe,
  Bell,
  Users,
  ChevronDown,
  Play,
  Pause,
  ShoppingCart,
  Wallet,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import {
  type AutomationNode,
  type NodeType,
  type TriggerConfig,
  type ActionConfig,
  type ConditionConfig,
  type DelayConfig,
  TRIGGER_LABELS,
  ACTION_LABELS,
  CONDITION_LABELS,
  DELAY_LABELS,
  DELAY_UNIT_LABELS,
  type TriggerType,
  type ActionType,
  type ConditionType,
  type DelayType,
} from '../types'

// ─── Node appearance config ──────────────────────────────────────────────────

const NODE_STYLES: Record<NodeType, { bg: string; border: string; icon: string; text: string }> = {
  trigger: { bg: 'bg-green-50', border: 'border-green-300', icon: 'text-green-600', text: 'text-green-800' },
  action: { bg: 'bg-blue-50', border: 'border-blue-300', icon: 'text-blue-600', text: 'text-blue-800' },
  condition: { bg: 'bg-amber-50', border: 'border-amber-300', icon: 'text-amber-600', text: 'text-amber-800' },
  delay: { bg: 'bg-purple-50', border: 'border-purple-300', icon: 'text-purple-600', text: 'text-purple-800' },
}

function getNodeIcon(node: AutomationNode): React.ElementType {
  switch (node.type) {
    case 'trigger': {
      const tc = node.config as TriggerConfig
      switch (tc.triggerType) {
        case 'purchase_made': return ShoppingCart
        case 'cashback_received':
        case 'cashback_expiring': return Wallet
        case 'abandoned_cart': return ShoppingCart
        case 'tag_added':
        case 'tag_removed': return Tag
        case 'segment_entered': return Users
        default: return Zap
      }
    }
    case 'action': {
      const ac = node.config as ActionConfig
      switch (ac.actionType) {
        case 'send_email': return Mail
        case 'send_sms': return MessageSquare
        case 'add_tag':
        case 'remove_tag': return Tag
        case 'update_field': return FileEdit
        case 'webhook': return Globe
        case 'notify_team': return Bell
        default: return Play
      }
    }
    case 'condition': return GitBranch
    case 'delay': return Clock
  }
}

function getNodeSubtitle(node: AutomationNode): string {
  switch (node.type) {
    case 'trigger': {
      const tc = node.config as TriggerConfig
      return TRIGGER_LABELS[tc.triggerType] ?? tc.triggerType
    }
    case 'action': {
      const ac = node.config as ActionConfig
      return ACTION_LABELS[ac.actionType] ?? ac.actionType
    }
    case 'condition': {
      const cc = node.config as ConditionConfig
      return CONDITION_LABELS[cc.conditionType] ?? cc.conditionType
    }
    case 'delay': {
      const dc = node.config as DelayConfig
      if (dc.delayType === 'fixed_time' && dc.duration && dc.unit) {
        return `${dc.duration} ${DELAY_UNIT_LABELS[dc.unit]}`
      }
      return DELAY_LABELS[dc.delayType] ?? dc.delayType
    }
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

interface WorkflowCanvasProps {
  nodes: AutomationNode[]
  onChange: (nodes: AutomationNode[]) => void
  onSelectNode: (nodeId: string | null) => void
  selectedNodeId: string | null
  readOnly?: boolean
}

export function WorkflowCanvas({
  nodes,
  onChange,
  onSelectNode,
  selectedNodeId,
  readOnly,
}: WorkflowCanvasProps) {
  // Build the flow tree starting from trigger nodes
  const triggerNodes = nodes.filter((n) => n.type === 'trigger')

  const addNodeAfter = (parentId: string, type: NodeType, insertAtHandle?: string) => {
    const newId = uuidv4()
    let defaultConfig: AutomationNode['config']
    let label = ''

    switch (type) {
      case 'action':
        defaultConfig = { actionType: 'send_email' } as ActionConfig
        label = 'Enviar E-mail'
        break
      case 'condition':
        defaultConfig = { conditionType: 'field_check' } as ConditionConfig
        label = 'Verificar condição'
        break
      case 'delay':
        defaultConfig = { delayType: 'fixed_time', duration: 1, unit: 'days' } as DelayConfig
        label = 'Aguardar'
        break
      default:
        return
    }

    const newNode: AutomationNode = {
      id: newId,
      type,
      label,
      config: defaultConfig,
      position: { x: 0, y: 0 },
      connections: [],
    }

    // Find parent and update connections
    const updatedNodes = nodes.map((n) => {
      if (n.id !== parentId) return n

      if (insertAtHandle === 'true' || insertAtHandle === 'false') {
        // Insert into specific branch of a condition
        const existingConn = n.connections.find((c) => c.sourceHandle === insertAtHandle)
        if (existingConn) {
          // Move existing connection to new node
          newNode.connections = [{ targetNodeId: existingConn.targetNodeId }]
          return {
            ...n,
            connections: n.connections.map((c) =>
              c.sourceHandle === insertAtHandle
                ? { ...c, targetNodeId: newId }
                : c
            ),
          }
        } else {
          return {
            ...n,
            connections: [
              ...n.connections,
              { targetNodeId: newId, label: insertAtHandle === 'true' ? 'Sim' : 'Não', sourceHandle: insertAtHandle },
            ],
          }
        }
      }

      // Default: insert in linear flow
      const existingDefault = n.connections.find((c) => !c.sourceHandle || c.sourceHandle === 'default')
      if (existingDefault) {
        newNode.connections = [{ targetNodeId: existingDefault.targetNodeId }]
        return {
          ...n,
          connections: n.connections.map((c) =>
            (!c.sourceHandle || c.sourceHandle === 'default')
              ? { ...c, targetNodeId: newId }
              : c
          ),
        }
      }

      return { ...n, connections: [...n.connections, { targetNodeId: newId }] }
    })

    onChange([...updatedNodes, newNode])
    onSelectNode(newId)
  }

  const removeNode = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId)
    if (!node || node.type === 'trigger') return // Don't remove trigger

    // Find parent(s) that connect to this node
    const downstream = node.connections.length > 0 ? node.connections[0].targetNodeId : null

    const updatedNodes = nodes
      .filter((n) => n.id !== nodeId)
      .map((n) => ({
        ...n,
        connections: n.connections.map((c) =>
          c.targetNodeId === nodeId
            ? downstream ? { ...c, targetNodeId: downstream } : c
            : c
        ).filter((c) => c.targetNodeId !== nodeId || downstream),
      }))

    onChange(updatedNodes)
    if (selectedNodeId === nodeId) onSelectNode(null)
  }

  return (
    <div className="flex flex-col items-center py-6 min-h-[400px]">
      {triggerNodes.length === 0 ? (
        <EmptyState onAddTrigger={() => {
          const newNode: AutomationNode = {
            id: uuidv4(),
            type: 'trigger',
            label: 'Gatilho de Entrada',
            config: { triggerType: 'tag_added' } as TriggerConfig,
            position: { x: 250, y: 0 },
            connections: [],
          }
          onChange([...nodes, newNode])
          onSelectNode(newNode.id)
        }} />
      ) : (
        triggerNodes.map((trigger) => (
          <FlowBranch
            key={trigger.id}
            nodeId={trigger.id}
            nodes={nodes}
            selectedNodeId={selectedNodeId}
            onSelectNode={onSelectNode}
            onAddNodeAfter={addNodeAfter}
            onRemoveNode={removeNode}
            readOnly={readOnly}
            depth={0}
          />
        ))
      )}
    </div>
  )
}

// ─── Flow Branch (recursive) ────────────────────────────────────────────────

function FlowBranch({
  nodeId,
  nodes,
  selectedNodeId,
  onSelectNode,
  onAddNodeAfter,
  onRemoveNode,
  readOnly,
  depth,
}: {
  nodeId: string
  nodes: AutomationNode[]
  selectedNodeId: string | null
  onSelectNode: (id: string | null) => void
  onAddNodeAfter: (parentId: string, type: NodeType, handle?: string) => void
  onRemoveNode: (id: string) => void
  readOnly?: boolean
  depth: number
}) {
  const node = nodes.find((n) => n.id === nodeId)
  if (!node) return null

  const isCondition = node.type === 'condition'
  const trueConn = node.connections.find((c) => c.sourceHandle === 'true')
  const falseConn = node.connections.find((c) => c.sourceHandle === 'false')
  const defaultConn = node.connections.find((c) => !c.sourceHandle || c.sourceHandle === 'default')

  return (
    <div className="flex flex-col items-center">
      {/* Node card */}
      <NodeCard
        node={node}
        isSelected={selectedNodeId === nodeId}
        onClick={() => onSelectNode(nodeId)}
        onRemove={node.type !== 'trigger' && !readOnly ? () => onRemoveNode(nodeId) : undefined}
      />

      {isCondition ? (
        /* Condition branching */
        <div className="flex flex-col items-center mt-1">
          {/* Branch line */}
          <div className="w-px h-4 bg-slate-300" />
          <div className="flex items-start gap-6">
            {/* True branch */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full mb-1">SIM</span>
              <div className="w-px h-3 bg-green-300" />
              {trueConn ? (
                <FlowBranch
                  nodeId={trueConn.targetNodeId}
                  nodes={nodes}
                  selectedNodeId={selectedNodeId}
                  onSelectNode={onSelectNode}
                  onAddNodeAfter={onAddNodeAfter}
                  onRemoveNode={onRemoveNode}
                  readOnly={readOnly}
                  depth={depth + 1}
                />
              ) : !readOnly ? (
                <AddNodeButton onAdd={(type) => onAddNodeAfter(nodeId, type, 'true')} compact />
              ) : null}
            </div>

            {/* False branch */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full mb-1">NÃO</span>
              <div className="w-px h-3 bg-red-300" />
              {falseConn ? (
                <FlowBranch
                  nodeId={falseConn.targetNodeId}
                  nodes={nodes}
                  selectedNodeId={selectedNodeId}
                  onSelectNode={onSelectNode}
                  onAddNodeAfter={onAddNodeAfter}
                  onRemoveNode={onRemoveNode}
                  readOnly={readOnly}
                  depth={depth + 1}
                />
              ) : !readOnly ? (
                <AddNodeButton onAdd={(type) => onAddNodeAfter(nodeId, type, 'false')} compact />
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        /* Linear flow */
        <>
          {/* Connection line */}
          <div className="w-px h-4 bg-slate-300" />

          {/* Next node */}
          {defaultConn ? (
            <FlowBranch
              nodeId={defaultConn.targetNodeId}
              nodes={nodes}
              selectedNodeId={selectedNodeId}
              onSelectNode={onSelectNode}
              onAddNodeAfter={onAddNodeAfter}
              onRemoveNode={onRemoveNode}
              readOnly={readOnly}
              depth={depth}
            />
          ) : !readOnly ? (
            <AddNodeButton onAdd={(type) => onAddNodeAfter(nodeId, type)} />
          ) : (
            <div className="flex items-center gap-1.5 mt-2 text-slate-400">
              <div className="w-3 h-3 rounded-full border-2 border-slate-300" />
              <span className="text-[10px] uppercase font-medium">Fim</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Node Card ───────────────────────────────────────────────────────────────

function NodeCard({
  node,
  isSelected,
  onClick,
  onRemove,
}: {
  node: AutomationNode
  isSelected: boolean
  onClick: () => void
  onRemove?: () => void
}) {
  const styles = NODE_STYLES[node.type]
  const Icon = getNodeIcon(node)
  const subtitle = getNodeSubtitle(node)

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative w-64 rounded-lg border-2 p-3 cursor-pointer transition-all group',
        styles.bg,
        isSelected ? `${styles.border} shadow-md ring-2 ring-offset-1 ring-botica-300` : `${styles.border} hover:shadow-md`,
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className={cn('p-1.5 rounded-md', styles.bg)}>
          <Icon className={cn('w-4 h-4', styles.icon)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn('text-xs font-bold uppercase tracking-wider', styles.text)}>
            {node.type === 'trigger' ? 'Gatilho' : node.type === 'action' ? 'Ação' : node.type === 'condition' ? 'Condição' : 'Espera'}
          </p>
          <p className="text-sm font-medium text-slate-800 truncate">{node.label}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{subtitle}</p>
        </div>
      </div>
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="absolute top-2 right-2 p-1 rounded text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

// ─── Add Node Button ─────────────────────────────────────────────────────────

function AddNodeButton({
  onAdd,
  compact,
}: {
  onAdd: (type: NodeType) => void
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative flex flex-col items-center">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1 rounded-full border-2 border-dashed border-slate-300 text-slate-400 hover:border-botica-400 hover:text-botica-600 transition-colors cursor-pointer',
          compact ? 'p-1.5' : 'px-3 py-1.5',
        )}
      >
        <Plus className="w-3.5 h-3.5" />
        {!compact && <span className="text-xs font-medium">Adicionar</span>}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 z-40 bg-white rounded-lg shadow-lg border border-slate-200 py-1 w-44">
            <button
              onClick={() => { onAdd('action'); setOpen(false) }}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 text-blue-500" /> Ação
            </button>
            <button
              onClick={() => { onAdd('condition'); setOpen(false) }}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-700 hover:bg-amber-50 cursor-pointer"
            >
              <GitBranch className="w-3.5 h-3.5 text-amber-500" /> Condição (Se/Senão)
            </button>
            <button
              onClick={() => { onAdd('delay'); setOpen(false) }}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-700 hover:bg-purple-50 cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-purple-500" /> Espera (Delay)
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ onAddTrigger }: { onAddTrigger: () => void }) {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <Zap className="w-10 h-10 text-slate-300 mb-3" />
      <p className="text-sm font-medium text-slate-500">Nenhum gatilho definido</p>
      <p className="text-xs text-slate-400 mt-1">Adicione um gatilho para iniciar o fluxo de automação</p>
      <button
        onClick={onAddTrigger}
        className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-green-300 bg-green-50 text-green-700 text-sm font-medium hover:bg-green-100 transition-colors cursor-pointer"
      >
        <Zap className="w-4 h-4" />
        Adicionar Gatilho
      </button>
    </div>
  )
}

// ─── Exports for use in AddNodeButton ────────────────────────────────────────
import { useState } from 'react'
