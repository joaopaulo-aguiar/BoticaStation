/**
 * contact-events-logger — DynamoDB Stream → Contact Event Audit Trail
 *
 * Listens for MODIFY events on CONTACT#{uuid}/METADATA via DynamoDB Streams.
 * When contact data changes (tags, lifecycle, status, profile), creates
 * EVENT# records in the same table as an audit trail.
 *
 * Event types generated:
 *   TagAdded           — When a tag is added to the contact
 *   TagRemoved         — When a tag is removed from the contact
 *   LifecycleChanged   — When lifecycleStage changes
 *   StatusChanged      — When status changes (active/inactive/bounced)
 *   EmailStatusChanged — When emailStatus changes (subscribed/unsubscribed)
 *   ProfileUpdated     — When email, name, or phone changes
 *
 * Anti-loop: Ignores records where _triggerSource = 'automation'
 * (changes made by Step Functions tasks are already tracked by automations-trigger).
 *
 * Environment variables:
 *   TABLE_NAME  — DynamoDB table (Config_Table)
 *   AWS_REGION  — Region (default sa-east-1)
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

// ── Config ───────────────────────────────────────────────────────────────────

const REGION     = process.env.AWS_REGION || 'sa-east-1';
const TABLE_NAME = process.env.TABLE_NAME || 'Config_Table';

// ── Clients ──────────────────────────────────────────────────────────────────

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

// ── Handler ──────────────────────────────────────────────────────────────────

export async function handler(event) {
  const records = event.Records ?? [];
  if (records.length === 0) return { processed: 0, created: 0 };

  let created = 0;

  for (const record of records) {
    try {
      // Only process MODIFY events (filter should already ensure this)
      if (record.eventName !== 'MODIFY') continue;

      const newImage = record.dynamodb?.NewImage;
      const oldImage = record.dynamodb?.OldImage;
      if (!newImage || !oldImage) continue;

      const pk = newImage.PK?.S;
      const sk = newImage.SK?.S;

      // Only process CONTACT#/METADATA items
      if (!pk?.startsWith('CONTACT#') || sk !== 'METADATA') continue;

      // Anti-loop: ignore changes made by automations (Step Functions tasks)
      if (newImage._triggerSource?.S === 'automation') continue;

      const contactId = pk.replace('CONTACT#', '');
      const changes = detectMetadataChanges(newImage, oldImage);

      for (const change of changes) {
        const now = new Date().toISOString();
        const eventId = `sys-${randomUUID().slice(0, 8)}`;

        await ddb.send(new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            PK: pk,
            SK: `EVENT#${now}#${eventId}`,
            contactId,
            eventType: change.eventType,
            channel: 'system',
            details: change.details,
            eventId,
            createdAt: now,
            _eventSource: 'stream-logger',
          },
        }));
        created++;
      }
    } catch (err) {
      console.error('Error processing record:', err, JSON.stringify(record.dynamodb?.Keys));
      // Continue processing other records
    }
  }

  console.log(`Processed ${records.length} records, created ${created} events`);
  return { processed: records.length, created };
}

// ── Detect Metadata Changes ──────────────────────────────────────────────────

function detectMetadataChanges(newImage, oldImage) {
  const changes = [];

  // ── Tags ──
  const oldTags = (oldImage.tags?.L ?? []).map(t => t.S).filter(Boolean);
  const newTags = (newImage.tags?.L ?? []).map(t => t.S).filter(Boolean);

  for (const tag of newTags) {
    if (!oldTags.includes(tag)) {
      changes.push({ eventType: 'TagAdded', details: `Tag '${tag}' adicionada` });
    }
  }
  for (const tag of oldTags) {
    if (!newTags.includes(tag)) {
      changes.push({ eventType: 'TagRemoved', details: `Tag '${tag}' removida` });
    }
  }

  // ── Lifecycle Stage ──
  const oldLifecycle = oldImage.lifecycleStage?.S;
  const newLifecycle = newImage.lifecycleStage?.S;
  if (oldLifecycle && newLifecycle && oldLifecycle !== newLifecycle) {
    changes.push({
      eventType: 'LifecycleChanged',
      details: `Lifecycle: ${oldLifecycle} → ${newLifecycle}`,
    });
  }

  // ── Status ──
  const oldStatus = oldImage.status?.S;
  const newStatus = newImage.status?.S;
  if (oldStatus && newStatus && oldStatus !== newStatus) {
    changes.push({
      eventType: 'StatusChanged',
      details: `Status: ${oldStatus} → ${newStatus}`,
    });
  }

  // ── Email Status ──
  const oldEmailStatus = oldImage.emailStatus?.S;
  const newEmailStatus = newImage.emailStatus?.S;
  if (oldEmailStatus && newEmailStatus && oldEmailStatus !== newEmailStatus) {
    changes.push({
      eventType: 'EmailStatusChanged',
      details: `Email status: ${oldEmailStatus} → ${newEmailStatus}`,
    });
  }

  // ── Profile fields (email, name, phone) ──
  const profileChanges = [];
  if (oldImage.email?.S !== newImage.email?.S && newImage.email?.S) {
    profileChanges.push(`Email alterado para ${newImage.email.S}`);
  }
  if (oldImage.fullName?.S !== newImage.fullName?.S && newImage.fullName?.S) {
    profileChanges.push(`Nome alterado para ${newImage.fullName.S}`);
  }
  if (oldImage.phone?.S !== newImage.phone?.S && newImage.phone?.S) {
    profileChanges.push(`Telefone alterado para ${newImage.phone.S}`);
  }
  if (profileChanges.length > 0) {
    changes.push({
      eventType: 'ProfileUpdated',
      details: profileChanges.join('; '),
    });
  }

  return changes;
}
