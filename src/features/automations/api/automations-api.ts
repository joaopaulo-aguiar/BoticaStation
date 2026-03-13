import { generateClient } from 'aws-amplify/api'
import type {
  Automation, AutomationStatus,
  CreateAutomationInput, UpdateAutomationInput,
  AutomationExecution, ExecutionDetail, ExecutionEvent,
  StartExecutionResult,
} from '../types'

const client = generateClient()

// ── GraphQL field list ───────────────────────────────────────────────────────

const AUTOMATION_FIELDS = /* GraphQL */ `
  id
  name
  description
  status
  trigger
  nodes
  aslDefinition
  stateMachineArn
  sfnStatus
  runningExecutions
  executionCount
  createdAt
  updatedAt
  createdBy
`

// ── Raw API type (trigger/nodes come as AWSJSON strings) ─────────────────────

interface RawAutomation {
  id: string
  name: string
  description: string | null
  status: AutomationStatus
  trigger: string   // AWSJSON
  nodes: string     // AWSJSON
  aslDefinition: string | null
  stateMachineArn: string | null
  sfnStatus: string | null
  runningExecutions: number | null
  executionCount: number
  createdAt: string
  updatedAt: string | null
  createdBy: string | null
}

/** Parse AWSJSON fields into native objects */
function parseAutomation(raw: RawAutomation): Automation {
  let asl = null
  try { if (raw.aslDefinition) asl = typeof raw.aslDefinition === 'string' ? JSON.parse(raw.aslDefinition) : raw.aslDefinition } catch { /* ignore */ }
  return {
    ...raw,
    description: raw.description ?? '',
    trigger: typeof raw.trigger === 'string' ? JSON.parse(raw.trigger) : raw.trigger,
    nodes: typeof raw.nodes === 'string' ? JSON.parse(raw.nodes) : raw.nodes,
    aslDefinition: asl,
    stateMachineArn: raw.stateMachineArn ?? null,
    sfnStatus: raw.sfnStatus ?? null,
    runningExecutions: raw.runningExecutions ?? 0,
    createdBy: raw.createdBy ?? undefined,
  }
}

// ── Queries ──────────────────────────────────────────────────────────────────

export async function listAutomations(): Promise<Automation[]> {
  const query = /* GraphQL */ `
    query ListAutomations {
      listAutomations {
        ${AUTOMATION_FIELDS}
      }
    }
  `
  const { data } = await client.graphql({ query }) as { data: { listAutomations: RawAutomation[] } }
  return (data.listAutomations ?? []).map(parseAutomation)
}

export async function getAutomation(id: string): Promise<Automation | null> {
  const query = /* GraphQL */ `
    query GetAutomation($id: ID!) {
      getAutomation(id: $id) {
        ${AUTOMATION_FIELDS}
      }
    }
  `
  const { data } = await client.graphql({ query, variables: { id } }) as { data: { getAutomation: RawAutomation | null } }
  return data.getAutomation ? parseAutomation(data.getAutomation) : null
}

// ── Mutations ────────────────────────────────────────────────────────────────

export async function createAutomation(input: CreateAutomationInput): Promise<Automation> {
  const mutation = /* GraphQL */ `
    mutation CreateAutomation($input: CreateAutomationInput!) {
      createAutomation(input: $input) {
        ${AUTOMATION_FIELDS}
      }
    }
  `
  const { data } = await client.graphql({ query: mutation, variables: { input } }) as { data: { createAutomation: RawAutomation } }
  return parseAutomation(data.createAutomation)
}

export async function updateAutomation(id: string, input: UpdateAutomationInput): Promise<Automation> {
  const mutation = /* GraphQL */ `
    mutation UpdateAutomation($id: ID!, $input: UpdateAutomationInput!) {
      updateAutomation(id: $id, input: $input) {
        ${AUTOMATION_FIELDS}
      }
    }
  `
  const { data } = await client.graphql({ query: mutation, variables: { id, input } }) as { data: { updateAutomation: RawAutomation } }
  return parseAutomation(data.updateAutomation)
}

export async function deleteAutomation(id: string): Promise<boolean> {
  const mutation = /* GraphQL */ `
    mutation DeleteAutomation($id: ID!) {
      deleteAutomation(id: $id)
    }
  `
  const { data } = await client.graphql({ query: mutation, variables: { id } }) as { data: { deleteAutomation: boolean } }
  return data.deleteAutomation
}

export async function updateAutomationStatus(id: string, status: AutomationStatus): Promise<Automation> {
  const mutation = /* GraphQL */ `
    mutation UpdateAutomationStatus($id: ID!, $status: String!) {
      updateAutomationStatus(id: $id, status: $status) {
        ${AUTOMATION_FIELDS}
      }
    }
  `
  const { data } = await client.graphql({ query: mutation, variables: { id, status } }) as { data: { updateAutomationStatus: RawAutomation } }
  return parseAutomation(data.updateAutomationStatus)
}

export async function duplicateAutomation(id: string): Promise<Automation> {
  const mutation = /* GraphQL */ `
    mutation DuplicateAutomation($id: ID!) {
      duplicateAutomation(id: $id) {
        ${AUTOMATION_FIELDS}
      }
    }
  `
  const { data } = await client.graphql({ query: mutation, variables: { id } }) as { data: { duplicateAutomation: RawAutomation } }
  return parseAutomation(data.duplicateAutomation)
}

// ── Execution Operations ─────────────────────────────────────────────────────

export async function startExecution(automationId: string, contactId: string, input?: string): Promise<StartExecutionResult> {
  const mutation = /* GraphQL */ `
    mutation StartExecution($automationId: ID!, $contactId: ID!, $input: AWSJSON) {
      startExecution(automationId: $automationId, contactId: $contactId, input: $input) {
        executionArn
        startDate
        status
        automationId
        contactId
      }
    }
  `
  const variables: Record<string, unknown> = { automationId, contactId }
  if (input) variables.input = input
  const { data } = await client.graphql({ query: mutation, variables }) as { data: { startExecution: StartExecutionResult } }
  return data.startExecution
}

export async function stopExecution(executionArn: string): Promise<boolean> {
  const mutation = /* GraphQL */ `
    mutation StopExecution($executionArn: String!) {
      stopExecution(executionArn: $executionArn)
    }
  `
  const { data } = await client.graphql({ query: mutation, variables: { executionArn } }) as { data: { stopExecution: boolean } }
  return data.stopExecution
}

export async function listExecutions(automationId: string, status?: string, maxResults?: number): Promise<AutomationExecution[]> {
  const query = /* GraphQL */ `
    query ListExecutions($automationId: ID!, $status: String, $maxResults: Int) {
      listExecutions(automationId: $automationId, status: $status, maxResults: $maxResults) {
        executionArn
        name
        status
        startDate
        stopDate
        automationId
        automationName
        contactId
        contactEmail
      }
    }
  `
  const variables: Record<string, unknown> = { automationId }
  if (status) variables.status = status
  if (maxResults) variables.maxResults = maxResults
  const { data } = await client.graphql({ query, variables }) as { data: { listExecutions: AutomationExecution[] } }
  return data.listExecutions ?? []
}

export async function describeExecution(executionArn: string): Promise<ExecutionDetail | null> {
  const query = /* GraphQL */ `
    query DescribeExecution($executionArn: String!) {
      describeExecution(executionArn: $executionArn) {
        executionArn
        stateMachineArn
        name
        status
        startDate
        stopDate
        input
        output
        contactId
        contactEmail
        automationId
        automationName
      }
    }
  `
  const { data } = await client.graphql({ query, variables: { executionArn } }) as { data: { describeExecution: ExecutionDetail | null } }
  return data.describeExecution
}

export async function getExecutionHistory(executionArn: string, maxResults?: number): Promise<ExecutionEvent[]> {
  const query = /* GraphQL */ `
    query GetExecutionHistory($executionArn: String!, $maxResults: Int) {
      getExecutionHistory(executionArn: $executionArn, maxResults: $maxResults) {
        id
        type
        timestamp
        previousEventId
        detail
      }
    }
  `
  const variables: Record<string, unknown> = { executionArn }
  if (maxResults) variables.maxResults = maxResults
  const { data } = await client.graphql({ query, variables }) as { data: { getExecutionHistory: ExecutionEvent[] } }
  return data.getExecutionHistory ?? []
}
