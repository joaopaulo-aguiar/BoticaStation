/**
 * marketing-worker — EventBridge Scheduler Target Lambda
 *
 * Triggered by EventBridge Scheduler when a campaign's scheduled time arrives.
 * Flow:
 *   1. Fetch campaign from DynamoDB (Config_Table)
 *   2. Update status to 'sending'
 *   3. Fetch sender profile
 *   4. Resolve contacts based on recipientType (all / lifecycleStage / segment)
 *   5. For each contact → enqueue SQS message to emails-transactional queue
 *   6. Update campaign metrics and status to 'sent'
 *
 * Input payload: { campaignId: string, action: 'process' }
 *
 * Environment Variables:
 *   CONFIG_TABLE   — DynamoDB table name (default: Config_Table)
 *   CONTACT_TABLE  — DynamoDB contacts table name (default: Contact)
 *   SQS_QUEUE_URL  — Target SQS queue URL
 *   AWS_REGION     — AWS region (default: sa-east-1)
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient, GetCommand, UpdateCommand, QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageBatchCommand } from '@aws-sdk/client-sqs';

// ── Configuration ────────────────────────────────────────────────────────────

const REGION = process.env.AWS_REGION || 'sa-east-1';
const CONFIG_TABLE = process.env.CONFIG_TABLE || 'Config_Table';
const CONTACT_TABLE = process.env.CONTACT_TABLE || 'Contact';
const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL || 'https://sqs.sa-east-1.amazonaws.com/176322301236/emails-transactional';
const SQS_BATCH_SIZE = 10; // SQS SendMessageBatch max

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const sqs = new SQSClient({ region: REGION });

// ── Handler ──────────────────────────────────────────────────────────────────

export async function handler(event) {
  console.log('marketing-worker invoked:', JSON.stringify(event));

  const { campaignId, action } = event;
  if (!campaignId || action !== 'process') {
    console.error('Invalid payload:', event);
    return { statusCode: 400, error: 'Invalid payload' };
  }

  try {
    // 1. Fetch campaign
    const campaign = await getCampaign(campaignId);
    if (!campaign) {
      console.error('Campaign not found:', campaignId);
      return { statusCode: 404, error: 'Campaign not found' };
    }

    // Guard: only process scheduled campaigns
    if (campaign.status !== 'scheduled') {
      console.warn(`Campaign ${campaignId} has status "${campaign.status}", skipping.`);
      return { statusCode: 200, message: `Skipped — status is ${campaign.status}` };
    }

    // 2. Update status to 'sending'
    await updateCampaignField(campaignId, {
      status: 'sending',
      sentAt: new Date().toISOString(),
    });

    // 3. Fetch sender profile
    const senderProfile = await getSenderProfile(campaign.senderProfileId);
    if (!senderProfile) {
      console.error('Sender profile not found:', campaign.senderProfileId);
      await updateCampaignField(campaignId, { status: 'draft' });
      return { statusCode: 500, error: 'Sender profile not found' };
    }

    // 4. Resolve contacts
    const contacts = await resolveContacts(campaign);
    console.log(`Resolved ${contacts.length} contacts for campaign ${campaignId}`);

    if (contacts.length === 0) {
      await updateCampaignField(campaignId, {
        status: 'sent',
        completedAt: new Date().toISOString(),
      });
      return { statusCode: 200, message: 'No contacts to send to' };
    }

    // 5. Enqueue SQS messages in batches
    let enqueued = 0;
    const batches = chunkArray(contacts, SQS_BATCH_SIZE);

    for (const batch of batches) {
      const entries = batch.map((contact, idx) => ({
        Id: `${idx}`,
        MessageBody: JSON.stringify(buildEmailMessage(campaign, senderProfile, contact)),
        MessageGroupId: undefined, // Standard queue, not FIFO
      }));

      await sqs.send(new SendMessageBatchCommand({
        QueueUrl: SQS_QUEUE_URL,
        Entries: entries,
      }));

      enqueued += batch.length;
    }

    // 6. Update campaign metrics and status
    await updateCampaignField(campaignId, {
      status: 'sent',
      completedAt: new Date().toISOString(),
      estimatedRecipients: contacts.length,
      'metrics.sent': enqueued,
    });

    console.log(`Campaign ${campaignId} processed: ${enqueued} emails enqueued.`);
    return { statusCode: 200, enqueued };
  } catch (err) {
    console.error('Error processing campaign:', err);
    // Try to revert status
    try {
      await updateCampaignField(campaignId, { status: 'draft' });
    } catch { /* best effort */ }
    throw err;
  }
}

// ── DynamoDB Helpers ─────────────────────────────────────────────────────────

async function getCampaign(id) {
  const { Item } = await ddb.send(new GetCommand({
    TableName: CONFIG_TABLE,
    Key: { PK: 'CAMPAIGN', SK: `CAMPAIGN#${id}` },
  }));
  return Item ?? null;
}

async function getSenderProfile(profileId) {
  const { Item } = await ddb.send(new GetCommand({
    TableName: CONFIG_TABLE,
    Key: { PK: 'SENDER_PROFILE', SK: `SENDER_PROFILE#${profileId}` },
  }));
  return Item ?? null;
}

async function getSegment(segmentId) {
  const { Item } = await ddb.send(new GetCommand({
    TableName: CONFIG_TABLE,
    Key: { PK: 'SEGMENT', SK: `SEGMENT#${segmentId}` },
  }));
  return Item ?? null;
}

async function updateCampaignField(id, updates) {
  const now = new Date().toISOString();
  const expParts = ['#updatedAt = :updatedAt'];
  const expNames = { '#updatedAt': 'updatedAt' };
  const expValues = { ':updatedAt': now };

  for (const [key, value] of Object.entries(updates)) {
    // Handle nested keys like 'metrics.sent'
    if (key.includes('.')) {
      const parts = key.split('.');
      const nameAlias = `#${parts.join('_')}`;
      const valAlias = `:${parts.join('_')}`;
      const namePath = parts.map(p => `#${p}`).join('.');
      parts.forEach(p => { expNames[`#${p}`] = p; });
      expParts.push(`${namePath} = ${valAlias}`);
      expValues[valAlias] = value;
    } else {
      expParts.push(`#${key} = :${key}`);
      expNames[`#${key}`] = key;
      expValues[`:${key}`] = value;
    }
  }

  await ddb.send(new UpdateCommand({
    TableName: CONFIG_TABLE,
    Key: { PK: 'CAMPAIGN', SK: `CAMPAIGN#${id}` },
    UpdateExpression: `SET ${expParts.join(', ')}`,
    ExpressionAttributeNames: expNames,
    ExpressionAttributeValues: expValues,
  }));
}

// ── Contact Resolution ───────────────────────────────────────────────────────

async function resolveContacts(campaign) {
  const recipientType = campaign.recipientType ?? 'all';

  switch (recipientType) {
    case 'all':
      return fetchAllActiveContacts();
    case 'lifecycleStage':
      return fetchContactsByLifecycleStage(campaign.recipientFilter);
    case 'segment':
      return fetchContactsBySegment(campaign.segmentId);
    default:
      console.warn(`Unknown recipientType: ${recipientType}, falling back to all`);
      return fetchAllActiveContacts();
  }
}

/**
 * Fetch all active contacts using GSI1-AllContacts.
 * GSI1PK = 'CONTACT', GSI1SK = 'CONTACT#{id}'
 */
async function fetchAllActiveContacts() {
  const contacts = [];
  let lastEvaluatedKey;

  do {
    const result = await ddb.send(new QueryCommand({
      TableName: CONTACT_TABLE,
      IndexName: 'GSI1-AllContacts',
      KeyConditionExpression: 'GSI1PK = :pk',
      FilterExpression: '#status = :active AND #emailStatus <> :bounced',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#emailStatus': 'emailStatus',
      },
      ExpressionAttributeValues: {
        ':pk': 'CONTACT',
        ':active': 'active',
        ':bounced': 'bounced',
      },
      ExclusiveStartKey: lastEvaluatedKey,
    }));

    contacts.push(...(result.Items ?? []));
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return contacts;
}

async function fetchContactsByLifecycleStage(stage) {
  if (!stage) return fetchAllActiveContacts();

  const contacts = [];
  let lastEvaluatedKey;

  do {
    const result = await ddb.send(new QueryCommand({
      TableName: CONTACT_TABLE,
      IndexName: 'GSI1-AllContacts',
      KeyConditionExpression: 'GSI1PK = :pk',
      FilterExpression: '#status = :active AND #emailStatus <> :bounced AND #lifecycleStage = :stage',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#emailStatus': 'emailStatus',
        '#lifecycleStage': 'lifecycleStage',
      },
      ExpressionAttributeValues: {
        ':pk': 'CONTACT',
        ':active': 'active',
        ':bounced': 'bounced',
        ':stage': stage,
      },
      ExclusiveStartKey: lastEvaluatedKey,
    }));

    contacts.push(...(result.Items ?? []));
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return contacts;
}

async function fetchContactsBySegment(segmentId) {
  if (!segmentId) return fetchAllActiveContacts();

  const segment = await getSegment(segmentId);
  if (!segment || !segment.conditions) {
    console.warn('Segment not found or has no conditions:', segmentId);
    return [];
  }

  // Fetch all active contacts then apply segment conditions in-memory
  // (For large bases, consider a more scalable approach using DynamoDB streams/precomputed lists)
  const allContacts = await fetchAllActiveContacts();
  return allContacts.filter(contact => matchesSegmentConditions(contact, segment));
}

/**
 * Evaluate segment conditions against a contact.
 * conditionLogic: 'AND' (all must match) or 'OR' (any must match)
 */
function matchesSegmentConditions(contact, segment) {
  const logic = (segment.conditionLogic ?? 'AND').toUpperCase();
  const conditions = segment.conditions ?? [];

  if (conditions.length === 0) return true;

  const results = conditions.map(cond => evaluateCondition(contact, cond));
  return logic === 'OR' ? results.some(Boolean) : results.every(Boolean);
}

function evaluateCondition(contact, condition) {
  const { field, operator, value } = condition;
  const contactValue = getNestedValue(contact, field);

  switch (operator) {
    case 'equals':
      return String(contactValue ?? '').toLowerCase() === String(value).toLowerCase();
    case 'not_equals':
      return String(contactValue ?? '').toLowerCase() !== String(value).toLowerCase();
    case 'contains':
      return String(contactValue ?? '').toLowerCase().includes(String(value).toLowerCase());
    case 'not_contains':
      return !String(contactValue ?? '').toLowerCase().includes(String(value).toLowerCase());
    case 'starts_with':
      return String(contactValue ?? '').toLowerCase().startsWith(String(value).toLowerCase());
    case 'is_empty':
      return contactValue == null || String(contactValue).trim() === '';
    case 'is_not_empty':
      return contactValue != null && String(contactValue).trim() !== '';
    case 'greater_than':
      return Number(contactValue) > Number(value);
    case 'less_than':
      return Number(contactValue) < Number(value);
    case 'in':
      return String(value).split(',').map(v => v.trim().toLowerCase()).includes(String(contactValue ?? '').toLowerCase());
    default:
      console.warn(`Unknown operator: ${operator}`);
      return false;
  }
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

// ── SQS Message Builder ─────────────────────────────────────────────────────

function buildEmailMessage(campaign, senderProfile, contact) {
  const utmParams = campaign.utmParams ? JSON.parse(campaign.utmParams) : {};

  return {
    type: 'CAMPAIGN_EMAIL',
    campaignId: campaign.id,
    campaignName: campaign.name,
    // Recipient
    toAddress: contact.email,
    contactId: contact.id,
    contactName: contact.fullName,
    // Sender
    fromAddress: `${senderProfile.name} <${senderProfile.email}>`,
    replyTo: senderProfile.replyTo || undefined,
    // Email content
    templateName: campaign.templateName,
    subject: campaign.subject,
    // Template merge data
    templateData: JSON.stringify({
      fullName: contact.fullName,
      email: contact.email,
      phone: contact.phone ?? '',
      lifecycleStage: contact.lifecycleStage ?? '',
      cashbackBalance: contact.cashbackInfo?.currentBalance ?? 0,
      campaignName: campaign.name,
      // UTM params for link replacement
      utmSource: utmParams.utmSource ?? '',
      utmMedium: utmParams.utmMedium ?? 'email',
      utmCampaign: utmParams.utmCampaign ?? sanitizeSesTagValue(campaign.name),
    }),
    // SES configuration
    configurationSet: campaign.configurationSet || undefined,
    // SES message tags for tracking
    tags: {
      campanha: sanitizeSesTagValue(campaign.name),
      campaignId: campaign.id,
      tipo: 'campaign',
    },
  };
}

/**
 * Sanitize a string for use as SES tag value.
 * SES tag values only accept ASCII alphanumeric + _ - . @
 */
function sanitizeSesTagValue(value) {
  if (!value) return '';
  return value
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/\s+/g, '_')                              // spaces → _
    .replace(/[^a-zA-Z0-9_\-.@]/g, '')                // remove invalid chars
    .slice(0, 256);                                     // SES limit
}

// ── Utilities ────────────────────────────────────────────────────────────────

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
