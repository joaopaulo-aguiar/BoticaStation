/**
 * automations-trigger — DynamoDB Stream → Automation Trigger
 *
 * Listens for changes on Config_Table (CONTACT# items) via DynamoDB Streams.
 * When a change matches an active automation's trigger, starts a Step Functions execution.
 *
 * Trigger types detected:
 *   CONTACT_CREATED    — INSERT on CONTACT#{id}/METADATA
 *   TAG_ADDED          — MODIFY on METADATA with new tags
 *   TAG_REMOVED        — MODIFY on METADATA with removed tags
 *   LIFECYCLE_CHANGED  — MODIFY on METADATA with lifecycleStage change
 *   PURCHASE_MADE      — INSERT on EVENT# with eventType=Purchase
 *   CART_ABANDONED     — INSERT on EVENT# with eventType=CartAbandoned
 *   FORM_SUBMITTED     — INSERT on EVENT# with eventType=FormSubmit
 *   EVENT_OCCURRED     — INSERT on EVENT# (any event type)
 *
 * Anti-loop: Ignores records where _triggerSource = 'automation'
 * (changes made by automations-manager during Step Functions execution).
 *
 * Environment variables:
 *   TABLE_NAME  — DynamoDB table (Config_Table)
 *   AWS_REGION  — Region (default sa-east-1)
 */

import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

// ── Config ───────────────────────────────────────────────────────────────────

const REGION     = process.env.AWS_REGION || 'sa-east-1';
const TABLE_NAME = process.env.TABLE_NAME || 'Config_Table';

// ── Clients ──────────────────────────────────────────────────────────────────

const sfn = new SFNClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

// ── Cache for active automations (refreshed per invocation batch) ────────────

let automationsCache = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30_000; // 30 seconds

async function getActiveAutomations() {
  const now = Date.now();
  if (automationsCache && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return automationsCache;
  }

  const { Items = [] } = await ddb.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': 'AUTOMATION' },
    ProjectionExpression: 'id, #name, #status, trigger, stateMachineArn',
    ExpressionAttributeNames: { '#name': 'name', '#status': 'status' },
  }));

  automationsCache = Items.filter(item =>
    item.status === 'active' && item.stateMachineArn
  ).map(item => ({
    id: item.id,
    name: item.name,
    stateMachineArn: item.stateMachineArn,
    trigger: typeof item.trigger === 'string' ? JSON.parse(item.trigger) : item.trigger,
  }));

  cacheTimestamp = now;
  return automationsCache;
}

// ── Handler ──────────────────────────────────────────────────────────────────

export async function handler(event) {
  const records = event.Records ?? [];
  if (records.length === 0) return { processed: 0 };

  let triggered = 0;

  for (const record of records) {
    try {
      // Only process INSERT and MODIFY
      if (record.eventName === 'REMOVE') continue;

      const newImage = record.dynamodb?.NewImage;
      const oldImage = record.dynamodb?.OldImage;
      if (!newImage) continue;

      const pk = newImage.PK?.S;
      const sk = newImage.SK?.S;

      // Only process CONTACT# items
      if (!pk?.startsWith('CONTACT#')) continue;

      // Anti-loop: ignore changes made by automations (Step Functions tasks)
      if (newImage._triggerSource?.S === 'automation') {
        // Clean up the flag for next time (so manual changes will trigger)
        const contactId = pk.replace('CONTACT#', '');
        try {
          await ddb.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { PK: pk, SK: sk },
            UpdateExpression: 'REMOVE _triggerSource',
          }));
        } catch { /* non-critical */ }
        continue;
      }

      const contactId = pk.replace('CONTACT#', '');

      // Detect what changed
      const changes = detectChanges(record.eventName, sk, newImage, oldImage);
      if (changes.length === 0) continue;

      // Get active automations
      const automations = await getActiveAutomations();

      for (const change of changes) {
        const matching = findMatchingAutomations(automations, change);

        for (const automation of matching) {
          // Load full contact data for the execution input
          const contactData = sk === 'METADATA'
            ? unmarshall(newImage)
            : await loadContact(contactId);

          if (contactData) {
            const started = await startExecution(automation, contactId, contactData);
            if (started) triggered++;
          }
        }
      }
    } catch (err) {
      console.error('Error processing record:', err, JSON.stringify(record.dynamodb?.Keys));
      // Continue processing other records — don't fail the entire batch
    }
  }

  console.log(`Processed ${records.length} records, triggered ${triggered} executions`);
  return { processed: records.length, triggered };
}

// ── Detect Changes ───────────────────────────────────────────────────────────

function detectChanges(eventName, sk, newImage, oldImage) {
  const changes = [];

  if (sk === 'METADATA') {
    // New contact created
    if (eventName === 'INSERT') {
      changes.push({ type: 'CONTACT_CREATED', params: {} });
    }

    if (eventName === 'MODIFY' && oldImage) {
      // Detect tag changes
      const oldTags = (oldImage.tags?.L ?? []).map(t => t.S).filter(Boolean);
      const newTags = (newImage.tags?.L ?? []).map(t => t.S).filter(Boolean);

      for (const tag of newTags) {
        if (!oldTags.includes(tag)) {
          changes.push({ type: 'TAG_ADDED', params: { tagId: tag } });
        }
      }
      for (const tag of oldTags) {
        if (!newTags.includes(tag)) {
          changes.push({ type: 'TAG_REMOVED', params: { tagId: tag } });
        }
      }

      // Detect lifecycle change
      const oldLifecycle = oldImage.lifecycleStage?.S;
      const newLifecycle = newImage.lifecycleStage?.S;
      if (oldLifecycle && newLifecycle && oldLifecycle !== newLifecycle) {
        changes.push({
          type: 'LIFECYCLE_CHANGED',
          params: { newStage: newLifecycle, oldStage: oldLifecycle },
        });
      }
    }
  }

  // Contact events (purchase, cart abandoned, form submit, etc.)
  if (sk?.startsWith('EVENT#') && eventName === 'INSERT') {
    const eventType = newImage.eventType?.S;

    if (eventType === 'Purchase') {
      changes.push({ type: 'PURCHASE_MADE', params: { eventType } });
    }
    if (eventType === 'CartAbandoned') {
      changes.push({ type: 'CART_ABANDONED', params: { eventType } });
    }
    if (eventType === 'FormSubmit') {
      changes.push({ type: 'FORM_SUBMITTED', params: { eventType } });
    }

    // Always emit generic event
    if (eventType) {
      changes.push({ type: 'EVENT_OCCURRED', params: { eventType } });
    }
  }

  return changes;
}

// ── Find Matching Automations ────────────────────────────────────────────────

function findMatchingAutomations(automations, change) {
  return automations.filter(automation => {
    const { trigger } = automation;

    // Type must match
    if (trigger.type !== change.type) return false;

    // Check specific params
    switch (trigger.type) {
      case 'TAG_ADDED':
      case 'TAG_REMOVED':
        // If automation specifies a tag, it must match
        if (trigger.params?.tagId && trigger.params.tagId !== change.params?.tagId) {
          return false;
        }
        break;

      case 'LIFECYCLE_CHANGED':
        if (trigger.params?.newStage && trigger.params.newStage !== change.params?.newStage) {
          return false;
        }
        break;

      case 'EVENT_OCCURRED':
        if (trigger.params?.eventType && trigger.params.eventType !== change.params?.eventType) {
          return false;
        }
        break;

      // CONTACT_CREATED, PURCHASE_MADE, CART_ABANDONED, FORM_SUBMITTED
      // always match if type matches (no extra params to check)
    }

    return true;
  });
}

// ── Load Contact Data ────────────────────────────────────────────────────────

async function loadContact(contactId) {
  try {
    const { Item } = await ddb.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `CONTACT#${contactId}`, SK: 'METADATA' },
    }));
    return Item ?? null;
  } catch {
    return null;
  }
}

// ── Start Execution ──────────────────────────────────────────────────────────

async function startExecution(automation, contactId, contactData) {
  const sanitizedId = contactId.replace(/[^a-zA-Z0-9_-]/g, '');
  const executionName = `c-${sanitizedId}-${Date.now()}`;

  const input = {
    contactId,
    email: contactData.email ?? '',
    fullName: contactData.fullName ?? '',
    phone: contactData.phone ?? '',
    lifecycleStage: contactData.lifecycleStage ?? '',
    tags: contactData.tags ?? [],
    automationId: automation.id,
    automationName: automation.name,
    triggeredAt: new Date().toISOString(),
    triggerSource: 'dynamodb-stream',
  };

  try {
    await sfn.send(new StartExecutionCommand({
      stateMachineArn: automation.stateMachineArn,
      name: executionName,
      input: JSON.stringify(input),
    }));

    // Increment execution counter
    await ddb.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: 'AUTOMATION', SK: `AUTOMATION#${automation.id}` },
      UpdateExpression: 'ADD executionCount :inc',
      ExpressionAttributeValues: { ':inc': 1 },
    }));

    console.log(`Started: automation=${automation.name} contact=${contactId}`);
    return true;
  } catch (err) {
    // ExecutionAlreadyExists = idempotent, skip silently
    if (err.name === 'ExecutionAlreadyExists') {
      console.log(`Skipped (already running): automation=${automation.name} contact=${contactId}`);
      return false;
    }
    throw err;
  }
}
