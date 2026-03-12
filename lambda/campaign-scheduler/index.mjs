/**
 * campaign-scheduler — AppSync Lambda Resolver
 *
 * Handles all EventBridge Scheduler operations for campaigns:
 *   scheduleCampaign, rescheduleCampaign, pauseCampaign, resumeCampaign,
 *   cancelCampaign, deleteCampaign, duplicateCampaign, sendCampaign
 *
 * Invoked by AppSync via the CampaignSchedulerLambda data source.
 * Payload: { field, arguments, identity }
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  SchedulerClient, CreateScheduleCommand, UpdateScheduleCommand,
  DeleteScheduleCommand, GetScheduleCommand,
} from '@aws-sdk/client-scheduler';
import { randomUUID } from 'node:crypto';

// ── Clients ──────────────────────────────────────────────────────────────────

const REGION = process.env.AWS_REGION || 'sa-east-1';
const TABLE_NAME = process.env.TABLE_NAME || 'Config_Table';
const SCHEDULE_GROUP = process.env.SCHEDULE_GROUP || 'marketing-campaigns';
const TARGET_LAMBDA_ARN = process.env.TARGET_LAMBDA_ARN || '';
const SCHEDULER_ROLE_ARN = process.env.SCHEDULER_ROLE_ARN || '';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const scheduler = new SchedulerClient({ region: REGION });

// ── Handler ──────────────────────────────────────────────────────────────────

export async function handler(event) {
  const { field, arguments: args, identity } = event;
  const caller = identity?.claims?.email ?? identity?.sub ?? 'system';

  switch (field) {
    case 'scheduleCampaign':
      return scheduleCampaign(args.id, args.scheduledAt, caller);
    case 'rescheduleCampaign':
      return rescheduleCampaign(args.id, args.scheduledAt, caller);
    case 'pauseCampaign':
      return pauseCampaign(args.id, caller);
    case 'resumeCampaign':
      return resumeCampaign(args.id, caller);
    case 'cancelCampaign':
      return cancelCampaign(args.id, caller);
    case 'deleteCampaign':
      return deleteCampaign(args.id);
    case 'duplicateCampaign':
      return duplicateCampaign(args.id, caller);
    case 'sendCampaign':
      // Legacy: create an immediate schedule (now + 5s)
      return scheduleCampaign(args.id, new Date(Date.now() + 5000).toISOString(), caller);
    default:
      return { error: `Unknown field: ${field}` };
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getCampaign(id) {
  const { Item } = await ddb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: 'CAMPAIGN', SK: `CAMPAIGN#${id}` },
  }));
  return Item ?? null;
}

async function getCampaignSettings() {
  const { Item } = await ddb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: 'SETTINGS', SK: 'CAMPAIGN_SETTINGS' },
  }));
  return Item ?? {
    timezone: 'America/Sao_Paulo',
    scheduleGroupName: SCHEDULE_GROUP,
  };
}

async function updateCampaignStatus(id, updates) {
  const now = new Date().toISOString();
  const expParts = ['#updatedAt = :updatedAt'];
  const expNames = { '#updatedAt': 'updatedAt' };
  const expValues = { ':updatedAt': now };

  for (const [key, value] of Object.entries(updates)) {
    const safeKey = `#${key}`;
    const safeVal = `:${key}`;
    expParts.push(`${safeKey} = ${safeVal}`);
    expNames[safeKey] = key;
    expValues[safeVal] = value;
  }

  const { Attributes } = await ddb.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: 'CAMPAIGN', SK: `CAMPAIGN#${id}` },
    UpdateExpression: `SET ${expParts.join(', ')}`,
    ExpressionAttributeNames: expNames,
    ExpressionAttributeValues: expValues,
    ReturnValues: 'ALL_NEW',
  }));
  return Attributes;
}

function scheduleName(campaignId) {
  return `campaign-${campaignId}`;
}

/**
 * Convert ISO 8601 datetime to EventBridge at() expression in the given timezone.
 * EventBridge expects: at(yyyy-MM-ddTHH:mm:ss)
 *
 * Uses manual UTC→local conversion via Intl.DateTimeFormat.formatToParts().
 * This avoids any locale/runtime dependency issues in Lambda.
 */
function toAtExpression(isoDate, timezone) {
  const utcMs = new Date(isoDate).getTime();
  const tz = timezone || 'America/Sao_Paulo';

  // Use a known reference to compute the UTC offset for the target timezone
  // by comparing the formatted local components to the actual UTC time.
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date(utcMs));
  const g = (t) => parseInt(parts.find(p => p.type === t)?.value ?? '0', 10);
  const pad = (n) => String(n).padStart(2, '0');

  const year = g('year');
  const month = pad(g('month'));
  const day = pad(g('day'));
  // Intl may return hour=24 for midnight; normalize to 0
  const rawHour = g('hour');
  const hour = pad(rawHour === 24 ? 0 : rawHour);
  const minute = pad(g('minute'));
  const second = pad(g('second'));

  const expr = `at(${year}-${month}-${day}T${hour}:${minute}:${second})`;
  console.log(`toAtExpression: ${isoDate} → ${expr} (tz=${tz})`);
  return expr;
}

// ── Operations ───────────────────────────────────────────────────────────────

async function scheduleCampaign(id, scheduledAt, caller) {
  const campaign = await getCampaign(id);
  if (!campaign) return { error: 'Campaign not found' };
  if (campaign.status !== 'draft') return { error: `Cannot schedule campaign with status "${campaign.status}"` };

  const settings = await getCampaignSettings();
  const group = settings.scheduleGroupName || SCHEDULE_GROUP;
  const timezone = settings.timezone || 'America/Sao_Paulo';

  const name = scheduleName(id);
  const scheduleExpression = toAtExpression(scheduledAt, timezone);

  await scheduler.send(new CreateScheduleCommand({
    Name: name,
    GroupName: group,
    ScheduleExpression: scheduleExpression,
    ScheduleExpressionTimezone: timezone,
    FlexibleTimeWindow: { Mode: 'OFF' },
    State: 'ENABLED',
    Target: {
      Arn: TARGET_LAMBDA_ARN,
      RoleArn: SCHEDULER_ROLE_ARN,
      Input: JSON.stringify({ campaignId: id, action: 'process' }),
    },
    ActionAfterCompletion: 'DELETE',
  }));

  // Build schedule ARN (derive account ID from Lambda context env)
  const accountId = process.env.AWS_ACCOUNT_ID
    || (TARGET_LAMBDA_ARN.match(/:([0-9]{12}):/)?.[1])
    || '176322301236';
  const scheduleArn = `arn:aws:scheduler:${REGION}:${accountId}:schedule/${group}/${name}`;

  return updateCampaignStatus(id, {
    status: 'scheduled',
    scheduledAt,
    scheduleArn,
  });
}

async function rescheduleCampaign(id, scheduledAt, caller) {
  const campaign = await getCampaign(id);
  if (!campaign) return { error: 'Campaign not found' };
  if (campaign.status !== 'scheduled') return { error: `Cannot reschedule campaign with status "${campaign.status}"` };

  const settings = await getCampaignSettings();
  const group = settings.scheduleGroupName || SCHEDULE_GROUP;
  const timezone = settings.timezone || 'America/Sao_Paulo';
  const name = scheduleName(id);

  // Fetch current schedule to get TargetArn and RoleArn
  let existingSchedule;
  try {
    existingSchedule = await scheduler.send(new GetScheduleCommand({
      Name: name,
      GroupName: group,
    }));
  } catch (err) {
    if (err.name === 'ResourceNotFoundException') {
      return { error: 'Schedule not found in EventBridge' };
    }
    throw err;
  }

  await scheduler.send(new UpdateScheduleCommand({
    Name: name,
    GroupName: group,
    ScheduleExpression: toAtExpression(scheduledAt, timezone),
    ScheduleExpressionTimezone: timezone,
    FlexibleTimeWindow: { Mode: 'OFF' },
    State: 'ENABLED',
    Target: existingSchedule.Target,
    ActionAfterCompletion: 'DELETE',
  }));

  return updateCampaignStatus(id, {
    status: 'scheduled',
    scheduledAt,
  });
}

async function pauseCampaign(id, caller) {
  const campaign = await getCampaign(id);
  if (!campaign) return { error: 'Campaign not found' };
  if (campaign.status !== 'scheduled' && campaign.status !== 'sending') {
    return { error: `Cannot pause campaign with status "${campaign.status}"` };
  }

  const settings = await getCampaignSettings();
  const group = settings.scheduleGroupName || SCHEDULE_GROUP;
  const name = scheduleName(id);

  // Try to pause the EventBridge schedule (only if status === 'scheduled')
  if (campaign.status === 'scheduled' && campaign.scheduleArn) {
    try {
      const existing = await scheduler.send(new GetScheduleCommand({
        Name: name,
        GroupName: group,
      }));

      await scheduler.send(new UpdateScheduleCommand({
        Name: name,
        GroupName: group,
        ScheduleExpression: existing.ScheduleExpression,
        ScheduleExpressionTimezone: existing.ScheduleExpressionTimezone,
        FlexibleTimeWindow: { Mode: 'OFF' },
        State: 'DISABLED',
        Target: existing.Target,
        ActionAfterCompletion: 'DELETE',
      }));
    } catch (err) {
      if (err.name !== 'ResourceNotFoundException') throw err;
      // Schedule already executed or was deleted — just update status
    }
  }

  return updateCampaignStatus(id, { status: 'paused' });
}

async function resumeCampaign(id, caller) {
  const campaign = await getCampaign(id);
  if (!campaign) return { error: 'Campaign not found' };
  if (campaign.status !== 'paused') {
    return { error: `Cannot resume campaign with status "${campaign.status}"` };
  }

  const settings = await getCampaignSettings();
  const group = settings.scheduleGroupName || SCHEDULE_GROUP;
  const name = scheduleName(id);

  if (campaign.scheduleArn) {
    try {
      const existing = await scheduler.send(new GetScheduleCommand({
        Name: name,
        GroupName: group,
      }));

      await scheduler.send(new UpdateScheduleCommand({
        Name: name,
        GroupName: group,
        ScheduleExpression: existing.ScheduleExpression,
        ScheduleExpressionTimezone: existing.ScheduleExpressionTimezone,
        FlexibleTimeWindow: { Mode: 'OFF' },
        State: 'ENABLED',
        Target: existing.Target,
        ActionAfterCompletion: 'DELETE',
      }));
    } catch (err) {
      if (err.name !== 'ResourceNotFoundException') throw err;
    }
  }

  return updateCampaignStatus(id, { status: 'scheduled' });
}

async function cancelCampaign(id, caller) {
  const campaign = await getCampaign(id);
  if (!campaign) return { error: 'Campaign not found' };
  if (campaign.status === 'sent' || campaign.status === 'cancelled') {
    return { error: `Cannot cancel campaign with status "${campaign.status}"` };
  }

  // Delete schedule if exists
  await tryDeleteSchedule(id);

  return updateCampaignStatus(id, {
    status: 'cancelled',
    scheduleArn: null,
  });
}

async function deleteCampaign(id) {
  const campaign = await getCampaign(id);
  if (!campaign) return { deleted: true };

  // Delete schedule if exists
  await tryDeleteSchedule(id);

  await ddb.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: { PK: 'CAMPAIGN', SK: `CAMPAIGN#${id}` },
  }));

  return { deleted: true };
}

async function duplicateCampaign(id, caller) {
  const campaign = await getCampaign(id);
  if (!campaign) return { error: 'Campaign not found' };

  const newId = randomUUID();
  const now = new Date().toISOString();

  const newCampaign = {
    PK: 'CAMPAIGN',
    SK: `CAMPAIGN#${newId}`,
    id: newId,
    name: `${campaign.name} (cópia)`,
    subject: campaign.subject,
    templateName: campaign.templateName,
    senderProfileId: campaign.senderProfileId,
    recipientType: campaign.recipientType ?? 'all',
    recipientFilter: campaign.recipientFilter ?? null,
    segmentId: campaign.segmentId ?? null,
    status: 'draft',
    scheduledAt: null,
    sentAt: null,
    completedAt: null,
    metrics: { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, complained: 0, unsubscribed: 0 },
    configurationSet: campaign.configurationSet ?? null,
    scheduleArn: null,
    timezone: campaign.timezone ?? null,
    utmParams: campaign.utmParams ?? null,
    estimatedRecipients: null,
    createdAt: now,
    updatedAt: now,
    createdBy: caller,
  };

  await ddb.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: newCampaign,
  }));

  return newCampaign;
}

async function tryDeleteSchedule(campaignId) {
  const settings = await getCampaignSettings();
  const group = settings.scheduleGroupName || SCHEDULE_GROUP;
  const name = scheduleName(campaignId);

  try {
    await scheduler.send(new DeleteScheduleCommand({
      Name: name,
      GroupName: group,
    }));
  } catch (err) {
    if (err.name !== 'ResourceNotFoundException') throw err;
    // Schedule already deleted or never created — that's fine
  }
}
