/**
 * ASL Generator — Converts canvas automation nodes into
 * AWS Step Functions Amazon States Language (ASL) definitions.
 *
 * Architecture (no separate worker Lambda):
 *   ACTION_SEND_EMAIL      → SQS native (arn:aws:states:::sqs:sendMessage)
 *   ACTION_ADD_TAG          → Lambda invoke (automations-manager)
 *   ACTION_REMOVE_TAG       → Lambda invoke (automations-manager)
 *   ACTION_CHANGE_LIFECYCLE → Lambda invoke (automations-manager)
 *   WAIT                    → Wait  (Seconds)
 *   CONDITION               → Lambda invoke (eval) + Choice
 *   END                     → Succeed
 */

import type {
  CanvasNode, TriggerConfig,
  WaitParams, ConditionParams,
  ActionSendEmailParams, ActionTagParams, ActionChangeLifecycleParams,
} from '../types'

// ── ASL Types ────────────────────────────────────────────────────────────────

export interface ASLDefinition {
  Comment: string
  StartAt: string
  States: Record<string, ASLState>
}

export type ASLState =
  | ASLTaskState
  | ASLWaitState
  | ASLChoiceState
  | ASLSucceedState

interface ASLTaskState {
  Type: 'Task'
  Resource: string
  Parameters: Record<string, unknown>
  ResultPath?: string
  Next?: string
  End?: boolean
}

interface ASLWaitState {
  Type: 'Wait'
  Seconds: number
  Next?: string
  End?: boolean
}

interface ASLChoiceState {
  Type: 'Choice'
  Choices: ASLChoiceRule[]
  Default?: string
}

interface ASLChoiceRule {
  Variable: string
  BooleanEquals?: boolean
  Next: string
}

interface ASLSucceedState {
  Type: 'Succeed'
}

// ── Generator config ─────────────────────────────────────────────────────────

export interface ASLGeneratorConfig {
  sqsQueueUrl: string
  automationsLambdaArn: string
}

// ── Wait unit → seconds ─────────────────────────────────────────────────────

function waitToSeconds(params: WaitParams): number {
  switch (params.unit) {
    case 'MINUTES': return params.duration * 60
    case 'HOURS': return params.duration * 3600
    case 'DAYS': return params.duration * 86400
  }
}

// ── Find start node (not referenced by any other node) ──────────────────────

function findStartNodeId(nodes: CanvasNode[]): string | null {
  const referenced = new Set<string>()
  for (const node of nodes) {
    if (node.next) referenced.add(node.next)
    if (node.branches?.truePath) referenced.add(node.branches.truePath)
    if (node.branches?.falsePath) referenced.add(node.branches.falsePath)
  }
  const unreferenced = nodes
    .filter((n) => !referenced.has(n.id))
    .sort((a, b) => a.position.y - b.position.y)

  return unreferenced.find((n) => n.type !== 'END')?.id
    ?? unreferenced[0]?.id
    ?? null
}

// ── SES tag sanitizer ────────────────────────────────────────────────────────

function sanitizeSesTagValue(val: string): string {
  return val.replace(/[^a-zA-Z0-9 _.:/@=+\\-]/g, '_').slice(0, 256)
}

// ── Build templateData params (supports JSONPath dynamic refs) ──────────────

function buildTemplateDataParams(
  templateData: Record<string, string> | undefined,
): Record<string, unknown> {
  if (!templateData) return {}
  const result: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(templateData)) {
    if (typeof val === 'string' && val.startsWith('$.')) {
      // Dynamic reference from execution input
      result[`${key}.$`] = val
    } else {
      result[key] = val
    }
  }
  return result
}

// ── Main generator ──────────────────────────────────────────────────────────

export function generateASL(
  automationName: string,
  _trigger: TriggerConfig,
  nodes: CanvasNode[],
  config: ASLGeneratorConfig,
): ASLDefinition {
  const { sqsQueueUrl, automationsLambdaArn } = config
  const states: Record<string, ASLState> = {}

  const startNodeId = findStartNodeId(nodes)
  if (!startNodeId) {
    throw new Error('No start node found in the automation flow')
  }

  for (const node of nodes) {
    switch (node.type) {
      // ── Send Email → SQS native integration ───────────────────────
      case 'ACTION_SEND_EMAIL': {
        const p = node.params as ActionSendEmailParams
        const state: ASLTaskState = {
          Type: 'Task',
          Resource: 'arn:aws:states:::sqs:sendMessage',
          Parameters: {
            QueueUrl: sqsQueueUrl,
            MessageBody: {
              'toAddresses.$': '$.email',
              'from': { email: p.fromAddress || '' },
              'templateName': p.templateName || '',
              'templateData': buildTemplateDataParams(p.templateData),
              'configurationSet': p.configurationSet || 'default',
              'tags': [
                { Name: 'campanha', Value: sanitizeSesTagValue(automationName) },
                { Name: 'automacao', Value: 'true' },
              ],
            },
          },
          ResultPath: '$.lastAction',
        }
        if (node.next) state.Next = node.next
        else state.End = true
        states[node.id] = state
        break
      }

      // ── Contact ops → Lambda invoke (automations-manager) ─────────
      case 'ACTION_ADD_TAG': {
        const p = node.params as ActionTagParams
        const state: ASLTaskState = {
          Type: 'Task',
          Resource: automationsLambdaArn,
          Parameters: {
            'action': 'ADD_TAG',
            'tagId': p.tagId,
            'contactId.$': '$.contactId',
          },
          ResultPath: '$.lastAction',
        }
        if (node.next) state.Next = node.next
        else state.End = true
        states[node.id] = state
        break
      }

      case 'ACTION_REMOVE_TAG': {
        const p = node.params as ActionTagParams
        const state: ASLTaskState = {
          Type: 'Task',
          Resource: automationsLambdaArn,
          Parameters: {
            'action': 'REMOVE_TAG',
            'tagId': p.tagId,
            'contactId.$': '$.contactId',
          },
          ResultPath: '$.lastAction',
        }
        if (node.next) state.Next = node.next
        else state.End = true
        states[node.id] = state
        break
      }

      case 'ACTION_CHANGE_LIFECYCLE': {
        const p = node.params as ActionChangeLifecycleParams
        const state: ASLTaskState = {
          Type: 'Task',
          Resource: automationsLambdaArn,
          Parameters: {
            'action': 'CHANGE_LIFECYCLE',
            'newStage': p.newStage,
            'contactId.$': '$.contactId',
          },
          ResultPath: '$.lastAction',
        }
        if (node.next) state.Next = node.next
        else state.End = true
        states[node.id] = state
        break
      }

      // ── Wait → Wait state ─────────────────────────────────────────
      case 'WAIT': {
        const p = node.params as WaitParams
        const state: ASLWaitState = {
          Type: 'Wait',
          Seconds: waitToSeconds(p),
        }
        if (node.next) state.Next = node.next
        else state.End = true
        states[node.id] = state
        break
      }

      // ── Condition → Lambda eval + Choice ──────────────────────────
      case 'CONDITION': {
        const p = node.params as ConditionParams
        const evalStateId = `${node.id}_eval`

        const evalState: ASLTaskState = {
          Type: 'Task',
          Resource: automationsLambdaArn,
          Parameters: {
            'action': 'EVALUATE_CONDITION',
            'field': p.field,
            'operator': p.operator,
            'value': p.value,
            'contactId.$': '$.contactId',
          },
          ResultPath: '$.conditionResult',
          Next: node.id,
        }
        states[evalStateId] = evalState

        const choiceState: ASLChoiceState = {
          Type: 'Choice',
          Choices: [{
            Variable: '$.conditionResult.result',
            BooleanEquals: true,
            Next: node.branches?.truePath ?? `${node.id}_end`,
          }],
          Default: node.branches?.falsePath ?? `${node.id}_end`,
        }
        states[node.id] = choiceState
        break
      }

      // ── End → Succeed ─────────────────────────────────────────────
      case 'END': {
        states[node.id] = { Type: 'Succeed' }
        break
      }
    }
  }

  // Fix references: nodes pointing to a CONDITION should point to its eval step
  const conditionNodeIds = nodes.filter((n) => n.type === 'CONDITION').map((n) => n.id)
  for (const nodeId of conditionNodeIds) {
    const evalId = `${nodeId}_eval`
    for (const [stateId, state] of Object.entries(states)) {
      if (stateId === nodeId || stateId === evalId) continue

      if ('Next' in state && state.Next === nodeId) {
        (state as { Next: string }).Next = evalId
      }
      if ('Choices' in state) {
        for (const choice of (state as ASLChoiceState).Choices) {
          if (choice.Next === nodeId) choice.Next = evalId
        }
        if ((state as ASLChoiceState).Default === nodeId) {
          (state as ASLChoiceState).Default = evalId
        }
      }
    }
  }

  let startAt = startNodeId
  if (conditionNodeIds.includes(startAt)) {
    startAt = `${startAt}_eval`
  }

  return {
    Comment: `BoticaStation Automation: ${automationName}`,
    StartAt: startAt,
    States: states,
  }
}
