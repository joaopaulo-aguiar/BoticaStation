/**
 * automations-manager — Lambda Resolver (AppSync + Step Functions Tasks)
 *
 * This single Lambda handles:
 *  1. AppSync resolver — CRUD for automations (DynamoDB + Step Functions)
 *  2. Step Functions Task states — contact updates, condition evaluation
 *
 * Email sending is handled natively by Step Functions → SQS integration.
 * Contact modifications are done by this Lambda invoked as Task states.
 *
 * Environment variables:
 *   TABLE_NAME         — DynamoDB table (Config_Table)
 *   SQS_QUEUE_URL      — Transactional email SQS queue
 *   SFN_ROLE_ARN       — IAM role ARN for Step Functions execution
 *   AWS_REGION         — Region (default sa-east-1)
 */

import { SFNClient,
  CreateStateMachineCommand,
  UpdateStateMachineCommand,
  DeleteStateMachineCommand,
  DescribeStateMachineCommand,
  StartExecutionCommand,
  StopExecutionCommand,
  ListExecutionsCommand,
  DescribeExecutionCommand,
  GetExecutionHistoryCommand,
  ListTagsForResourceCommand,
} from '@aws-sdk/client-sfn';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'node:crypto';

// ── Config ───────────────────────────────────────────────────────────────────

const REGION          = process.env.AWS_REGION || 'sa-east-1';
const TABLE_NAME      = process.env.TABLE_NAME || 'Config_Table';
const SQS_QUEUE_URL   = process.env.SQS_QUEUE_URL || 'https://sqs.sa-east-1.amazonaws.com/176322301236/emails-transactional';
const SFN_ROLE_ARN    = process.env.SFN_ROLE_ARN || '';
const LAMBDA_ARN      = process.env.AWS_LAMBDA_FUNCTION_ARN || ''; // self ARN, set by Lambda runtime
const TAG_KEY         = 'BoticaStation';
const TAG_VALUE       = 'Automations';
const SM_PREFIX       = 'botica-auto-';

// ── Clients ──────────────────────────────────────────────────────────────────

const sfn = new SFNClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

// ── Handler ──────────────────────────────────────────────────────────────────

export async function handler(event) {
  // AppSync resolver invocation: event has { field, arguments, identity }
  if (event.field) {
    return handleAppSync(event);
  }

  // Step Functions Task invocation: event has { action, ... }
  if (event.action) {
    return handleStepFunctionsTask(event);
  }

  throw new Error('Unknown invocation: missing field or action');
}

// ═════════════════════════════════════════════════════════════════════════════
//  AppSync Resolver Dispatch
// ═════════════════════════════════════════════════════════════════════════════

async function handleAppSync(event) {
  const { field, arguments: args, identity } = event;
  const caller = identity?.claims?.email ?? identity?.sub ?? 'system';

  try {
    switch (field) {
      case 'listAutomations':           return await listAutomations();
      case 'getAutomation':             return await getAutomation(args.id);
      case 'createAutomation':          return await createAutomation(args.input, caller);
      case 'updateAutomation':          return await updateAutomation(args.id, args.input);
      case 'deleteAutomation':          return await deleteAutomation(args.id);
      case 'updateAutomationStatus':    return await updateAutomationStatus(args.id, args.status);
      case 'duplicateAutomation':       return await duplicateAutomation(args.id, caller);
      case 'startExecution':            return await startExecution(args.automationId, args.contactId, args.input);
      case 'stopExecution':             return await stopExecution(args.executionArn);
      case 'listExecutions':            return await listExecutions(args.automationId, args.status, args.maxResults);
      case 'describeExecution':         return await describeExecution(args.executionArn);
      case 'getExecutionHistory':       return await getExecutionHistory(args.executionArn, args.maxResults);
      default:
        throw new Error(`Unknown field: ${field}`);
    }
  } catch (err) {
    console.error(`[${field}] Error:`, err);
    throw err;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  Step Functions Task Dispatch (invoked as Task state Resource)
// ═════════════════════════════════════════════════════════════════════════════

async function handleStepFunctionsTask(event) {
  const { action } = event;

  try {
    switch (action) {
      case 'ADD_TAG':              return await taskAddTag(event);
      case 'REMOVE_TAG':           return await taskRemoveTag(event);
      case 'CHANGE_LIFECYCLE':     return await taskChangeLifecycle(event);
      case 'CHANGE_STATUS':        return await taskChangeStatus(event);
      case 'EVALUATE_CONDITION':   return await taskEvaluateCondition(event);
      default:
        throw new Error(`Unknown task action: ${action}`);
    }
  } catch (err) {
    console.error(`[Task:${action}] Error:`, err);
    throw err;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  Step Functions Task Handlers (Contact modifications)
// ═════════════════════════════════════════════════════════════════════════════

async function taskAddTag(event) {
  const { contactId, tagId } = event;
  const pk = `CONTACT#${contactId}`;
  const now = new Date().toISOString();

  // Add tag if not already present (list_append + condition)
  try {
    await ddb.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: pk, SK: 'METADATA' },
      UpdateExpression: 'SET tags = list_append(if_not_exists(tags, :empty), :newTag), updatedAt = :now',
      ConditionExpression: 'NOT contains(tags, :tagVal)',
      ExpressionAttributeValues: {
        ':newTag': [tagId],
        ':empty': [],
        ':tagVal': tagId,
        ':now': now,
      },
    }));
  } catch (err) {
    // ConditionalCheckFailed = tag already exists, that's fine
    if (err.name !== 'ConditionalCheckFailedException') throw err;
  }

  return { success: true, action: 'ADD_TAG', contactId, tagId };
}

async function taskRemoveTag(event) {
  const { contactId, tagId } = event;
  const pk = `CONTACT#${contactId}`;
  const now = new Date().toISOString();

  // First, get the contact to find the tag index
  const { Item } = await ddb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: pk, SK: 'METADATA' },
    ProjectionExpression: 'tags',
  }));

  const tags = Item?.tags ?? [];
  const idx = tags.indexOf(tagId);
  if (idx === -1) return { success: true, action: 'REMOVE_TAG', contactId, tagId, note: 'tag not found' };

  await ddb.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: pk, SK: 'METADATA' },
    UpdateExpression: `REMOVE tags[${idx}] SET updatedAt = :now`,
    ExpressionAttributeValues: { ':now': now },
  }));

  return { success: true, action: 'REMOVE_TAG', contactId, tagId };
}

async function taskChangeLifecycle(event) {
  const { contactId, newStage } = event;
  const pk = `CONTACT#${contactId}`;
  const now = new Date().toISOString();

  await ddb.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: pk, SK: 'METADATA' },
    UpdateExpression: 'SET lifecycleStage = :stage, updatedAt = :now',
    ExpressionAttributeValues: { ':stage': newStage, ':now': now },
  }));

  return { success: true, action: 'CHANGE_LIFECYCLE', contactId, newStage };
}

async function taskChangeStatus(event) {
  const { contactId, newStatus } = event;
  const pk = `CONTACT#${contactId}`;
  const now = new Date().toISOString();

  await ddb.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: pk, SK: 'METADATA' },
    UpdateExpression: 'SET #status = :status, updatedAt = :now',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':status': newStatus, ':now': now },
  }));

  return { success: true, action: 'CHANGE_STATUS', contactId, newStatus };
}

async function taskEvaluateCondition(event) {
  const { contactId, field, operator, value } = event;
  const pk = `CONTACT#${contactId}`;

  // Load contact data
  const { Item } = await ddb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: pk, SK: 'METADATA' },
  }));

  if (!Item) return { result: false, reason: 'contact not found' };

  // Resolve field value from contact
  const fieldValue = resolveField(Item, field);
  const result = evaluateCondition(fieldValue, operator, value);

  return { result };
}

// ── Condition evaluation helpers ─────────────────────────────────────────────

function resolveField(contact, fieldPath) {
  // field format: "contact.tags", "contact.lifecycleStage", "contact.email", etc.
  // Also: "contact.stats.emailOpens", "contact.ecommerceInfo.paidOrders", "contact.cashbackInfo.currentBalance"
  const path = fieldPath.replace(/^contact\./, '');
  const parts = path.split('.');
  let value = contact;
  for (const part of parts) {
    if (value == null) return null;
    value = value[part];
  }
  return value;
}

function evaluateCondition(fieldValue, operator, expected) {
  switch (operator) {
    case 'EQUALS':
      return String(fieldValue) === String(expected);
    case 'NOT_EQUALS':
      return String(fieldValue) !== String(expected);
    case 'CONTAINS':
      if (Array.isArray(fieldValue)) return fieldValue.includes(expected);
      return String(fieldValue ?? '').includes(expected);
    case 'NOT_CONTAINS':
      if (Array.isArray(fieldValue)) return !fieldValue.includes(expected);
      return !String(fieldValue ?? '').includes(expected);
    case 'GREATER_THAN':
      return Number(fieldValue) > Number(expected);
    case 'LESS_THAN':
      return Number(fieldValue) < Number(expected);
    case 'EXISTS':
      return fieldValue != null && fieldValue !== '';
    case 'NOT_EXISTS':
      return fieldValue == null || fieldValue === '';
    default:
      return false;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  CRUD — Automations (DynamoDB + Step Functions)
// ═════════════════════════════════════════════════════════════════════════════

async function listAutomations() {
  const { Items = [] } = await ddb.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': 'AUTOMATION' },
  }));

  const results = [];
  for (const item of Items) {
    let sfnStatus = null;
    let runningCount = 0;
    if (item.stateMachineArn) {
      try {
        const desc = await sfn.send(new DescribeStateMachineCommand({
          stateMachineArn: item.stateMachineArn,
        }));
        sfnStatus = desc.status;
      } catch { /* SM may have been deleted externally */ }
      try {
        const execs = await sfn.send(new ListExecutionsCommand({
          stateMachineArn: item.stateMachineArn,
          statusFilter: 'RUNNING',
          maxResults: 1,
        }));
        runningCount = execs.executions?.length ?? 0;
        if (execs.nextToken) runningCount = -1; // many
      } catch { /* ignore */ }
    }
    results.push({
      ...stripDDBKeys(item),
      sfnStatus,
      runningExecutions: runningCount,
    });
  }
  return results;
}

async function getAutomation(id) {
  const { Item } = await ddb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: 'AUTOMATION', SK: `AUTOMATION#${id}` },
  }));
  if (!Item) throw makeError('Automação não encontrada', 'NotFound');

  let sfnStatus = null;
  let runningExecutions = 0;
  if (Item.stateMachineArn) {
    try {
      const desc = await sfn.send(new DescribeStateMachineCommand({
        stateMachineArn: Item.stateMachineArn,
      }));
      sfnStatus = desc.status;
    } catch { /* deleted externally */ }
    try {
      const execs = await sfn.send(new ListExecutionsCommand({
        stateMachineArn: Item.stateMachineArn,
        statusFilter: 'RUNNING',
        maxResults: 100,
      }));
      runningExecutions = execs.executions?.length ?? 0;
    } catch { /* ignore */ }
  }

  return { ...stripDDBKeys(Item), sfnStatus, runningExecutions };
}

async function createAutomation(input, caller) {
  const id = randomUUID();
  const now = new Date().toISOString();

  const trigger = typeof input.trigger === 'string' ? JSON.parse(input.trigger) : input.trigger;
  const nodes   = typeof input.nodes   === 'string' ? JSON.parse(input.nodes)   : input.nodes;

  // Generate ASL
  const asl = buildASL(input.name, trigger, nodes);

  // Create Step Functions state machine
  const smName = `${SM_PREFIX}${id}`;
  const createResult = await sfn.send(new CreateStateMachineCommand({
    name: smName,
    definition: JSON.stringify(asl),
    roleArn: SFN_ROLE_ARN,
    type: 'STANDARD',
    tags: [
      { key: TAG_KEY, value: TAG_VALUE },
      { key: 'automationId', value: id },
      { key: 'automationName', value: input.name },
    ],
  }));

  const item = {
    PK: 'AUTOMATION',
    SK: `AUTOMATION#${id}`,
    id,
    name: input.name,
    description: input.description ?? null,
    status: 'draft',
    trigger,
    nodes,
    aslDefinition: asl,
    stateMachineArn: createResult.stateMachineArn,
    executionCount: 0,
    createdAt: now,
    updatedAt: now,
    createdBy: caller,
  };

  await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  return stripDDBKeys(item);
}

async function updateAutomation(id, input) {
  const now = new Date().toISOString();

  const { Item } = await ddb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: 'AUTOMATION', SK: `AUTOMATION#${id}` },
  }));
  if (!Item) throw makeError('Automação não encontrada', 'NotFound');

  const sets = ['#updatedAt = :updatedAt'];
  const names = { '#updatedAt': 'updatedAt' };
  const values = { ':updatedAt': now };

  if (input.name != null) {
    sets.push('#name = :name');
    names['#name'] = 'name';
    values[':name'] = input.name;
  }
  if (input.description != null) {
    sets.push('#desc = :desc');
    names['#desc'] = 'description';
    values[':desc'] = input.description;
  }

  let trigger = Item.trigger;
  let nodes = Item.nodes;

  if (input.trigger != null) {
    trigger = typeof input.trigger === 'string' ? JSON.parse(input.trigger) : input.trigger;
    sets.push('#trigger = :trigger');
    names['#trigger'] = 'trigger';
    values[':trigger'] = trigger;
  }
  if (input.nodes != null) {
    nodes = typeof input.nodes === 'string' ? JSON.parse(input.nodes) : input.nodes;
    sets.push('#nodes = :nodes');
    names['#nodes'] = 'nodes';
    values[':nodes'] = nodes;
  }

  if (input.trigger != null || input.nodes != null) {
    const name = input.name ?? Item.name;
    const asl = buildASL(name, trigger, nodes);
    sets.push('#asl = :asl');
    names['#asl'] = 'aslDefinition';
    values[':asl'] = asl;

    if (Item.stateMachineArn) {
      await sfn.send(new UpdateStateMachineCommand({
        stateMachineArn: Item.stateMachineArn,
        definition: JSON.stringify(asl),
      }));
    }
  }

  const result = await ddb.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: 'AUTOMATION', SK: `AUTOMATION#${id}` },
    UpdateExpression: `SET ${sets.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ReturnValues: 'ALL_NEW',
  }));

  return stripDDBKeys(result.Attributes);
}

async function deleteAutomation(id) {
  const { Item } = await ddb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: 'AUTOMATION', SK: `AUTOMATION#${id}` },
  }));
  if (!Item) throw makeError('Automação não encontrada', 'NotFound');

  if (Item.stateMachineArn) {
    try {
      await sfn.send(new DeleteStateMachineCommand({
        stateMachineArn: Item.stateMachineArn,
      }));
    } catch (err) {
      console.warn('Failed to delete state machine:', err.message);
    }
  }

  await ddb.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: { PK: 'AUTOMATION', SK: `AUTOMATION#${id}` },
  }));

  return true;
}

async function updateAutomationStatus(id, status) {
  const validStatuses = ['draft', 'active', 'paused', 'archived'];
  if (!validStatuses.includes(status)) {
    throw makeError(`Status inválido: ${status}`, 'ValidationError');
  }

  const now = new Date().toISOString();

  const result = await ddb.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: 'AUTOMATION', SK: `AUTOMATION#${id}` },
    UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt',
    ExpressionAttributeNames: { '#status': 'status', '#updatedAt': 'updatedAt' },
    ExpressionAttributeValues: { ':status': status, ':updatedAt': now },
    ConditionExpression: 'attribute_exists(PK)',
    ReturnValues: 'ALL_NEW',
  }));

  return stripDDBKeys(result.Attributes);
}

async function duplicateAutomation(id, caller) {
  const { Item } = await ddb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: 'AUTOMATION', SK: `AUTOMATION#${id}` },
  }));
  if (!Item) throw makeError('Automação não encontrada', 'NotFound');

  const newId = randomUUID();
  const now = new Date().toISOString();
  const newName = `${Item.name} (cópia)`;

  const asl = buildASL(newName, Item.trigger, Item.nodes);

  const smName = `${SM_PREFIX}${newId}`;
  const createResult = await sfn.send(new CreateStateMachineCommand({
    name: smName,
    definition: JSON.stringify(asl),
    roleArn: SFN_ROLE_ARN,
    type: 'STANDARD',
    tags: [
      { key: TAG_KEY, value: TAG_VALUE },
      { key: 'automationId', value: newId },
      { key: 'automationName', value: newName },
    ],
  }));

  const newItem = {
    PK: 'AUTOMATION',
    SK: `AUTOMATION#${newId}`,
    id: newId,
    name: newName,
    description: Item.description ?? null,
    status: 'draft',
    trigger: Item.trigger,
    nodes: Item.nodes,
    aslDefinition: asl,
    stateMachineArn: createResult.stateMachineArn,
    executionCount: 0,
    createdAt: now,
    updatedAt: now,
    createdBy: caller,
  };

  await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: newItem }));
  return stripDDBKeys(newItem);
}

// ═════════════════════════════════════════════════════════════════════════════
//  Executions — Start / Stop / List / Describe / History
// ═════════════════════════════════════════════════════════════════════════════

async function startExecution(automationId, contactId, inputData) {
  const { Item } = await ddb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: 'AUTOMATION', SK: `AUTOMATION#${automationId}` },
  }));
  if (!Item) throw makeError('Automação não encontrada', 'NotFound');
  if (!Item.stateMachineArn) throw makeError('State machine não configurada', 'ValidationError');

  // Load contact data to pass as execution input
  const contactPK = `CONTACT#${contactId}`;
  const { Item: contact } = await ddb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: contactPK, SK: 'METADATA' },
  }));

  const extra = typeof inputData === 'string' ? JSON.parse(inputData) : (inputData ?? {});

  const executionInput = {
    contactId,
    email: contact?.email ?? extra.email ?? '',
    fullName: contact?.fullName ?? '',
    phone: contact?.phone ?? '',
    lifecycleStage: contact?.lifecycleStage ?? '',
    tags: contact?.tags ?? [],
    automationId,
    automationName: Item.name,
    triggeredAt: new Date().toISOString(),
    ...extra,
  };

  const executionName = `c-${contactId.replace(/[^a-zA-Z0-9_-]/g, '')}-${Date.now()}`;

  const result = await sfn.send(new StartExecutionCommand({
    stateMachineArn: Item.stateMachineArn,
    name: executionName,
    input: JSON.stringify(executionInput),
  }));

  await ddb.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: 'AUTOMATION', SK: `AUTOMATION#${automationId}` },
    UpdateExpression: 'ADD executionCount :inc',
    ExpressionAttributeValues: { ':inc': 1 },
  }));

  return {
    executionArn: result.executionArn,
    startDate: result.startDate?.toISOString() ?? new Date().toISOString(),
    status: 'RUNNING',
    automationId,
    contactId,
  };
}

async function stopExecution(executionArn) {
  await sfn.send(new StopExecutionCommand({
    executionArn,
    cause: 'Stopped manually from BoticaStation',
  }));
  return true;
}

async function listExecutions(automationId, status, maxResults) {
  const { Item } = await ddb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: 'AUTOMATION', SK: `AUTOMATION#${automationId}` },
  }));
  if (!Item?.stateMachineArn) return [];

  const params = {
    stateMachineArn: Item.stateMachineArn,
    maxResults: maxResults ?? 50,
  };
  if (status) params.statusFilter = status;

  const result = await sfn.send(new ListExecutionsCommand(params));

  return (result.executions ?? []).map((ex) => ({
    executionArn: ex.executionArn,
    name: ex.name,
    status: ex.status,
    startDate: ex.startDate?.toISOString(),
    stopDate: ex.stopDate?.toISOString(),
    automationId,
    automationName: Item.name,
  }));
}

async function describeExecution(executionArn) {
  const desc = await sfn.send(new DescribeExecutionCommand({ executionArn }));

  let input = {};
  try { input = JSON.parse(desc.input ?? '{}'); } catch { /* ignore */ }

  let output = null;
  try { if (desc.output) output = JSON.parse(desc.output); } catch { /* ignore */ }

  let automationId = null;
  if (desc.stateMachineArn) {
    try {
      const tags = await sfn.send(new ListTagsForResourceCommand({
        resourceArn: desc.stateMachineArn,
      }));
      automationId = tags.tags?.find((t) => t.key === 'automationId')?.value;
    } catch { /* ignore */ }
  }

  return {
    executionArn: desc.executionArn,
    stateMachineArn: desc.stateMachineArn,
    name: desc.name,
    status: desc.status,
    startDate: desc.startDate?.toISOString(),
    stopDate: desc.stopDate?.toISOString(),
    input: JSON.stringify(input),
    output: output ? JSON.stringify(output) : null,
    contactId: input.contactId ?? null,
    contactEmail: input.email ?? null,
    automationId,
    automationName: input.automationName ?? null,
  };
}

async function getExecutionHistory(executionArn, maxResults) {
  const result = await sfn.send(new GetExecutionHistoryCommand({
    executionArn,
    maxResults: maxResults ?? 100,
    reverseOrder: false,
  }));

  return (result.events ?? []).map((ev) => ({
    id: ev.id,
    type: ev.type,
    timestamp: ev.timestamp?.toISOString(),
    previousEventId: ev.previousEventId,
    detail: JSON.stringify(
      ev.stateEnteredEventDetails
        ?? ev.stateExitedEventDetails
        ?? ev.taskScheduledEventDetails
        ?? ev.taskStartedEventDetails
        ?? ev.taskSucceededEventDetails
        ?? ev.taskFailedEventDetails
        ?? ev.executionStartedEventDetails
        ?? ev.executionSucceededEventDetails
        ?? ev.executionFailedEventDetails
        ?? ev.executionAbortedEventDetails
        ?? ev.executionTimedOutEventDetails
        ?? {}
    ),
  }));
}

// ═════════════════════════════════════════════════════════════════════════════
//  ASL Generation (Amazon States Language)
// ═════════════════════════════════════════════════════════════════════════════

function buildASL(automationName, trigger, nodes) {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    throw makeError('Automação precisa ter pelo menos um nó', 'ValidationError');
  }

  const states = {};

  // Find start node
  const referenced = new Set();
  for (const n of nodes) {
    if (n.next) referenced.add(n.next);
    if (n.branches?.truePath) referenced.add(n.branches.truePath);
    if (n.branches?.falsePath) referenced.add(n.branches.falsePath);
  }
  const startNode = nodes
    .filter((n) => !referenced.has(n.id))
    .sort((a, b) => (a.position?.y ?? 0) - (b.position?.y ?? 0))
    .find((n) => n.type !== 'END') ?? nodes[0];

  let startAt = startNode.id;

  for (const node of nodes) {
    switch (node.type) {
      case 'ACTION_SEND_EMAIL': {
        const p = node.params ?? {};
        // Native SQS integration — sends email payload to the transactional queue
        states[node.id] = {
          Type: 'Task',
          Resource: 'arn:aws:states:::sqs:sendMessage',
          Parameters: {
            QueueUrl: SQS_QUEUE_URL,
            MessageBody: {
              'toAddresses.$': '$.email',
              'from': { email: p.fromAddress || '' },
              'templateName': p.templateName || '',
              'templateData': buildTemplateData(p.templateData),
              'configurationSet': p.configurationSet || 'default',
              'tags': [
                { Name: 'campanha', Value: sanitizeSesTagValue(automationName) },
                { Name: 'automacao', Value: 'true' },
              ],
            },
          },
          ResultPath: '$.lastAction',
          ...(node.next ? { Next: node.next } : { End: true }),
        };
        break;
      }
      case 'ACTION_ADD_TAG': {
        const p = node.params ?? {};
        states[node.id] = {
          Type: 'Task',
          Resource: LAMBDA_ARN,
          Parameters: {
            'action': 'ADD_TAG',
            'tagId': p.tagId ?? '',
            'contactId.$': '$.contactId',
          },
          ResultPath: '$.lastAction',
          ...(node.next ? { Next: node.next } : { End: true }),
        };
        break;
      }
      case 'ACTION_REMOVE_TAG': {
        const p = node.params ?? {};
        states[node.id] = {
          Type: 'Task',
          Resource: LAMBDA_ARN,
          Parameters: {
            'action': 'REMOVE_TAG',
            'tagId': p.tagId ?? '',
            'contactId.$': '$.contactId',
          },
          ResultPath: '$.lastAction',
          ...(node.next ? { Next: node.next } : { End: true }),
        };
        break;
      }
      case 'ACTION_CHANGE_LIFECYCLE': {
        const p = node.params ?? {};
        states[node.id] = {
          Type: 'Task',
          Resource: LAMBDA_ARN,
          Parameters: {
            'action': 'CHANGE_LIFECYCLE',
            'newStage': p.newStage ?? 'subscriber',
            'contactId.$': '$.contactId',
          },
          ResultPath: '$.lastAction',
          ...(node.next ? { Next: node.next } : { End: true }),
        };
        break;
      }
      case 'WAIT': {
        const p = node.params ?? {};
        let seconds = (p.duration ?? 1) * 86400;
        if (p.unit === 'MINUTES') seconds = (p.duration ?? 1) * 60;
        if (p.unit === 'HOURS') seconds = (p.duration ?? 1) * 3600;
        states[node.id] = {
          Type: 'Wait',
          Seconds: seconds,
          ...(node.next ? { Next: node.next } : { End: true }),
        };
        break;
      }
      case 'CONDITION': {
        const p = node.params ?? {};
        const evalId = `${node.id}_eval`;

        states[evalId] = {
          Type: 'Task',
          Resource: LAMBDA_ARN,
          Parameters: {
            'action': 'EVALUATE_CONDITION',
            'field': p.field ?? '',
            'operator': p.operator ?? 'EQUALS',
            'value': p.value ?? '',
            'contactId.$': '$.contactId',
          },
          ResultPath: '$.conditionResult',
          Next: node.id,
        };

        states[node.id] = {
          Type: 'Choice',
          Choices: [{
            Variable: '$.conditionResult.result',
            BooleanEquals: true,
            Next: node.branches?.truePath ?? `${node.id}_succeed`,
          }],
          Default: node.branches?.falsePath ?? `${node.id}_succeed`,
        };

        if (startAt === node.id) startAt = evalId;
        break;
      }
      case 'END':
        states[node.id] = { Type: 'Succeed' };
        break;
    }
  }

  // Fix references to CONDITION nodes → point to eval step
  const conditionIds = nodes.filter((n) => n.type === 'CONDITION').map((n) => n.id);
  for (const cid of conditionIds) {
    const evalId = `${cid}_eval`;
    for (const [sid, state] of Object.entries(states)) {
      if (sid === cid || sid === evalId) continue;
      if (state.Next === cid) state.Next = evalId;
      if (state.Choices) {
        for (const ch of state.Choices) {
          if (ch.Next === cid) ch.Next = evalId;
        }
        if (state.Default === cid) state.Default = evalId;
      }
    }
  }

  return {
    Comment: `BoticaStation Automation: ${automationName}`,
    StartAt: startAt,
    States: states,
  };
}

function buildTemplateData(templateData) {
  if (!templateData || typeof templateData !== 'object') return {};
  // Build template data with JSONPath references for dynamic values
  const result = {};
  for (const [key, val] of Object.entries(templateData)) {
    if (typeof val === 'string' && val.startsWith('$.')) {
      // Dynamic reference — use JSONPath
      result[`${key}.$`] = val;
    } else {
      result[key] = val;
    }
  }
  return result;
}

function sanitizeSesTagValue(val) {
  return String(val || '').replace(/[^a-zA-Z0-9 _.:/=+\\-@]/g, '_').slice(0, 256);
}

// ═════════════════════════════════════════════════════════════════════════════
//  Helpers
// ═════════════════════════════════════════════════════════════════════════════

function stripDDBKeys(item) {
  if (!item) return null;
  const { PK, SK, GSI1PK, GSI1SK, ...rest } = item;
  return rest;
}

function makeError(message, type) {
  const err = new Error(message);
  err.type = type;
  return err;
}
