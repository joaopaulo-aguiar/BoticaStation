/**
 * Automations API — DynamoDB operations for automation workflows.
 *
 * Uses "Automations" table:
 *   PK: AUTOMATION#<uuid>  SK: METADATA  → Automation definition
 *   PK: AUTOEXEC#<automationId>  SK: CONTACT#<email>#<ts>  → Execution log
 */
import {
  ScanCommand,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb'
import { v4 as uuidv4 } from 'uuid'
import { createDynamoClient } from '@/shared/lib/dynamodb'
import type { AWSSessionCredentials } from '@/shared/types'
import type {
  Automation,
  AutomationFormData,
  AutomationStatus,
  AutomationNode,
  AutomationExecution,
} from '../types'

const TABLE_NAME = 'Automations'

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function listAutomations(
  credentials: AWSSessionCredentials,
): Promise<Automation[]> {
  const client = createDynamoClient(credentials)

  const response = await client.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'SK = :sk',
      ExpressionAttributeValues: { ':sk': 'METADATA' },
    }),
  )

  return ((response.Items as Automation[]) ?? []).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}

export async function getAutomation(
  credentials: AWSSessionCredentials,
  automationId: string,
): Promise<Automation | null> {
  const client = createDynamoClient(credentials)

  const res = await client.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `AUTOMATION#${automationId}`, SK: 'METADATA' },
    }),
  )

  return (res.Item as Automation) ?? null
}

export async function createAutomation(
  credentials: AWSSessionCredentials,
  data: AutomationFormData,
): Promise<Automation> {
  const client = createDynamoClient(credentials)
  const id = uuidv4()
  const now = new Date().toISOString()

  const automation: Automation = {
    PK: `AUTOMATION#${id}`,
    SK: 'METADATA',
    id,
    name: data.name,
    description: data.description,
    status: 'draft',
    nodes: data.nodes,
    stats: {
      totalEntered: 0,
      activeContacts: 0,
      completedContacts: 0,
      emailsSent: 0,
    },
    createdAt: now,
    updatedAt: now,
  }

  await client.send(new PutCommand({ TableName: TABLE_NAME, Item: automation }))
  return automation
}

export async function updateAutomation(
  credentials: AWSSessionCredentials,
  automationId: string,
  data: Partial<AutomationFormData> & { status?: AutomationStatus },
): Promise<void> {
  const client = createDynamoClient(credentials)

  const exprs: string[] = ['#ua = :ua']
  const names: Record<string, string> = { '#ua': 'updatedAt' }
  const vals: Record<string, unknown> = { ':ua': new Date().toISOString() }

  if (data.name !== undefined) {
    exprs.push('#nm = :nm')
    names['#nm'] = 'name'
    vals[':nm'] = data.name
  }
  if (data.description !== undefined) {
    exprs.push('#ds = :ds')
    names['#ds'] = 'description'
    vals[':ds'] = data.description
  }
  if (data.nodes !== undefined) {
    exprs.push('#nd = :nd')
    names['#nd'] = 'nodes'
    vals[':nd'] = data.nodes
  }
  if (data.status !== undefined) {
    exprs.push('#st = :st')
    names['#st'] = 'status'
    vals[':st'] = data.status
  }

  await client.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `AUTOMATION#${automationId}`, SK: 'METADATA' },
      UpdateExpression: `SET ${exprs.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: vals,
    }),
  )
}

export async function deleteAutomation(
  credentials: AWSSessionCredentials,
  automationId: string,
): Promise<void> {
  const client = createDynamoClient(credentials)

  await client.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { PK: `AUTOMATION#${automationId}`, SK: 'METADATA' },
    }),
  )
}

export async function duplicateAutomation(
  credentials: AWSSessionCredentials,
  automationId: string,
  newName: string,
): Promise<Automation> {
  const original = await getAutomation(credentials, automationId)
  if (!original) throw new Error('Automação não encontrada')

  // Re-generate node IDs to avoid conflicts
  const nodeIdMap = new Map<string, string>()
  const newNodes: AutomationNode[] = original.nodes.map((node) => {
    const newId = uuidv4()
    nodeIdMap.set(node.id, newId)
    return { ...node, id: newId }
  })

  // Update connection references
  for (const node of newNodes) {
    node.connections = node.connections.map((conn) => ({
      ...conn,
      targetNodeId: nodeIdMap.get(conn.targetNodeId) ?? conn.targetNodeId,
    }))
  }

  return createAutomation(credentials, {
    name: newName,
    description: original.description,
    nodes: newNodes,
  })
}

// ─── Status management ───────────────────────────────────────────────────────

export async function activateAutomation(
  credentials: AWSSessionCredentials,
  automationId: string,
): Promise<void> {
  await updateAutomation(credentials, automationId, { status: 'active' })
}

export async function pauseAutomation(
  credentials: AWSSessionCredentials,
  automationId: string,
): Promise<void> {
  await updateAutomation(credentials, automationId, { status: 'paused' })
}

export async function archiveAutomation(
  credentials: AWSSessionCredentials,
  automationId: string,
): Promise<void> {
  await updateAutomation(credentials, automationId, { status: 'archived' })
}

// ─── Execution logs ──────────────────────────────────────────────────────────

export async function getAutomationExecutions(
  credentials: AWSSessionCredentials,
  automationId: string,
  limit = 50,
): Promise<AutomationExecution[]> {
  const client = createDynamoClient(credentials)

  const response = await client.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': `AUTOEXEC#${automationId}` },
      ScanIndexForward: false,
      Limit: limit,
    }),
  )

  return (response.Items as AutomationExecution[]) ?? []
}
