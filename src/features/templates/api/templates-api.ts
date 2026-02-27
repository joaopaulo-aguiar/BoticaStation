/**
 * AWS SES + S3 API layer for template management.
 * Calls AWS services directly from the browser using the AWS SDK.
 */
import {
  SESv2Client,
  ListEmailTemplatesCommand,
  GetEmailTemplateCommand,
  CreateEmailTemplateCommand,
  UpdateEmailTemplateCommand,
  DeleteEmailTemplateCommand,
  SendEmailCommand,
  ListEmailIdentitiesCommand,
} from '@aws-sdk/client-sesv2'
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'
import type { AWSSessionCredentials } from '@/shared/types'
import {
  useSettingsStore,
  extractBucketName,
} from '@/features/settings/store/settings-store'
import {
  toSesTemplateName,
  saveTemplateMetadata,
  listTemplateMetadata,
  deleteTemplateMetadata,
} from '@/features/settings/api/config-api'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getS3Config() {
  const { s3Bucket } = useSettingsStore.getState().settings
  return {
    bucket: extractBucketName(s3Bucket.bucketArn),
    region: s3Bucket.region,
  }
}

const SES_REGION = 'sa-east-1'

// ─── Client factories ────────────────────────────────────────────────────────

function createSESv2Client(credentials: AWSSessionCredentials): SESv2Client {
  return new SESv2Client({
    region: SES_REGION,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  })
}

function createS3Client(credentials: AWSSessionCredentials): S3Client {
  const { region } = getS3Config()
  return new S3Client({
    region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  })
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TemplateSummary {
  name: string // SES template name (slug)
  displayName: string // User-friendly name
  createdAt: string | null
  updatedAt: string | null
}

export interface TemplateDetail {
  name: string
  subject: string
  html: string
  text: string
  testData?: Record<string, unknown>
}

export interface TemplateBackup {
  templateName: string
  subject: string
  html: string
  text: string | null
  testData: Record<string, unknown> | null
  backupTimestamp: string
  version: string
}

export interface BackupVersion {
  version: string
  key: string
  lastModified: string
  size: number
}

export interface VerifiedIdentity {
  identity: string
  type: string
  sendingEnabled: boolean
  verificationStatus: string
}

// ─── SES Template operations ─────────────────────────────────────────────────

export async function listTemplates(
  credentials: AWSSessionCredentials,
  nextToken?: string,
  pageSize = 50,
): Promise<{ templates: TemplateSummary[]; nextToken?: string }> {
  const client = createSESv2Client(credentials)

  const response = await client.send(
    new ListEmailTemplatesCommand({
      PageSize: pageSize,
      ...(nextToken ? { NextToken: nextToken } : {}),
    }),
  )

  // Load metadata from Config table
  let metadataMap: Record<string, { displayName: string; createdAt: string; updatedAt: string }> = {}
  try {
    const metadata = await listTemplateMetadata(credentials)
    for (const m of metadata) {
      metadataMap[m.sesTemplateName] = {
        displayName: m.displayName,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      }
    }
  } catch {
    // Config table might not exist yet; silently continue
  }

  const templates: TemplateSummary[] = (response.TemplatesMetadata ?? []).map((t) => {
    const sesName = t.TemplateName ?? ''
    const meta = metadataMap[sesName]
    return {
      name: sesName,
      displayName: meta?.displayName ?? sesName,
      createdAt: meta?.createdAt ?? (t.CreatedTimestamp ? t.CreatedTimestamp.toISOString() : null),
      updatedAt: meta?.updatedAt ?? null,
    }
  })

  return { templates, nextToken: response.NextToken }
}

export async function getTemplate(
  credentials: AWSSessionCredentials,
  templateName: string,
): Promise<TemplateDetail> {
  const client = createSESv2Client(credentials)

  const response = await client.send(
    new GetEmailTemplateCommand({ TemplateName: templateName }),
  )

  const content = response.TemplateContent ?? {}

  const detail: TemplateDetail = {
    name: response.TemplateName ?? templateName,
    subject: content.Subject ?? '',
    html: content.Html ?? '',
    text: content.Text ?? '',
  }

  // Try to load testData from S3 backup
  try {
    const backup = await getTemplateBackup(credentials, templateName)
    if (backup?.testData) {
      detail.testData = backup.testData
    }
  } catch {
    // Silently ignore – testData is optional
  }

  return detail
}

export async function createTemplate(
  credentials: AWSSessionCredentials,
  data: { name: string; subject: string; html: string; text?: string; testData?: Record<string, unknown> },
): Promise<{ success: boolean; message: string; sesName: string }> {
  const client = createSESv2Client(credentials)

  // Convert display name to SES-safe slug
  const sesName = toSesTemplateName(data.name)

  await client.send(
    new CreateEmailTemplateCommand({
      TemplateName: sesName,
      TemplateContent: {
        Subject: data.subject,
        Html: data.html,
        ...(data.text ? { Text: data.text } : {}),
      },
    }),
  )

  // Save display name ↔ SES name mapping in Config table
  try {
    await saveTemplateMetadata(credentials, {
      displayName: data.name,
      sesTemplateName: sesName,
    })
  } catch (err) {
    console.warn('Failed to save template metadata:', err)
  }

  // Backup to S3 (non-blocking – don't fail the operation)
  backupTemplateToS3(credentials, {
    templateName: sesName,
    subject: data.subject,
    html: data.html,
    text: data.text ?? null,
    testData: data.testData ?? null,
  }).catch((err) => console.warn('Backup to S3 failed:', err))

  return { success: true, message: `Template "${data.name}" criado com sucesso`, sesName }
}

export async function updateTemplate(
  credentials: AWSSessionCredentials,
  templateName: string,
  data: { subject: string; html: string; text?: string; testData?: Record<string, unknown>; displayName?: string },
): Promise<{ success: boolean; message: string }> {
  const client = createSESv2Client(credentials)

  await client.send(
    new UpdateEmailTemplateCommand({
      TemplateName: templateName,
      TemplateContent: {
        Subject: data.subject,
        Html: data.html,
        ...(data.text ? { Text: data.text } : {}),
      },
    }),
  )

  // Backup to S3 (non-blocking)
  backupTemplateToS3(credentials, {
    templateName,
    subject: data.subject,
    html: data.html,
    text: data.text ?? null,
    testData: data.testData ?? null,
  }).catch((err) => console.warn('Backup to S3 failed:', err))

  // Update metadata timestamp
  if (data.displayName) {
    try {
      await saveTemplateMetadata(credentials, {
        displayName: data.displayName,
        sesTemplateName: templateName,
      })
    } catch (err) {
      console.warn('Failed to update template metadata:', err)
    }
  }

  return { success: true, message: `Template "${templateName}" atualizado com sucesso` }
}

export async function deleteTemplate(
  credentials: AWSSessionCredentials,
  templateName: string,
): Promise<{ success: boolean; message: string }> {
  const client = createSESv2Client(credentials)

  await client.send(new DeleteEmailTemplateCommand({ TemplateName: templateName }))

  // Clean up metadata
  try {
    await deleteTemplateMetadata(credentials, templateName)
  } catch (err) {
    console.warn('Failed to delete template metadata:', err)
  }

  return { success: true, message: `Template "${templateName}" excluído com sucesso` }
}

export async function duplicateTemplate(
  credentials: AWSSessionCredentials,
  sourceName: string,
  newDisplayName: string,
): Promise<{ success: boolean; message: string; sesName: string }> {
  const source = await getTemplate(credentials, sourceName)
  return createTemplate(credentials, {
    name: newDisplayName,
    subject: source.subject,
    html: source.html,
    text: source.text || undefined,
    testData: source.testData,
  })
}

// ─── S3 Backup operations ────────────────────────────────────────────────────

export async function backupTemplateToS3(
  credentials: AWSSessionCredentials,
  data: {
    templateName: string
    subject: string
    html: string
    text: string | null
    testData: Record<string, unknown> | null
  },
): Promise<{ success: boolean; s3Key: string; timestamp: string }> {
  const s3 = createS3Client(credentials)

  const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15)

  const backupData: TemplateBackup = {
    templateName: data.templateName,
    subject: data.subject,
    html: data.html,
    text: data.text,
    testData: data.testData,
    backupTimestamp: new Date().toISOString(),
    version: timestamp,
  }

  const body = JSON.stringify(backupData, null, 2)

  const s3Key = `templates/${data.templateName}/${timestamp}.json`
  const latestKey = `templates/${data.templateName}/latest.json`

  // Write versioned + latest in parallel
  await Promise.all([
    s3.send(
      new PutObjectCommand({
        Bucket: getS3Config().bucket,
        Key: s3Key,
        Body: body,
        ContentType: 'application/json',
      }),
    ),
    s3.send(
      new PutObjectCommand({
        Bucket: getS3Config().bucket,
        Key: latestKey,
        Body: body,
        ContentType: 'application/json',
      }),
    ),
  ])

  return { success: true, s3Key, timestamp }
}

export async function getTemplateBackup(
  credentials: AWSSessionCredentials,
  templateName: string,
  version?: string,
): Promise<TemplateBackup> {
  const s3 = createS3Client(credentials)

  const key = version
    ? `templates/${templateName}/${version}.json`
    : `templates/${templateName}/latest.json`

  const response = await s3.send(
    new GetObjectCommand({ Bucket: getS3Config().bucket, Key: key }),
  )

  const text = await response.Body!.transformToString()
  return JSON.parse(text) as TemplateBackup
}

export async function listTemplateBackups(
  credentials: AWSSessionCredentials,
  templateName: string,
): Promise<BackupVersion[]> {
  const s3 = createS3Client(credentials)

  const response = await s3.send(
    new ListObjectsV2Command({
      Bucket: getS3Config().bucket,
      Prefix: `templates/${templateName}/`,
    }),
  )

  const backups: BackupVersion[] = (response.Contents ?? [])
    .filter((obj) => !obj.Key!.endsWith('latest.json'))
    .map((obj) => ({
      version: obj.Key!.split('/').pop()!.replace('.json', ''),
      key: obj.Key!,
      lastModified: obj.LastModified!.toISOString(),
      size: obj.Size ?? 0,
    }))
    .sort((a, b) => b.version.localeCompare(a.version))

  return backups
}

// ─── Send test email ─────────────────────────────────────────────────────────

export async function sendTestEmail(
  credentials: AWSSessionCredentials,
  data: {
    toEmail: string
    fromEmail: string
    subject: string
    html: string
    text?: string
  },
): Promise<{ success: boolean; messageId: string; message: string }> {
  const client = createSESv2Client(credentials)
  const { ses } = useSettingsStore.getState().settings

  const response = await client.send(
    new SendEmailCommand({
      FromEmailAddress: data.fromEmail,
      Destination: { ToAddresses: [data.toEmail] },
      Content: {
        Simple: {
          Subject: { Data: data.subject, Charset: 'UTF-8' },
          Body: {
            Html: { Data: data.html, Charset: 'UTF-8' },
            ...(data.text ? { Text: { Data: data.text, Charset: 'UTF-8' } } : {}),
          },
        },
      },
      ...(ses.defaultConfigurationSet ? { ConfigurationSetName: ses.defaultConfigurationSet } : {}),
    }),
  )

  return {
    success: true,
    messageId: response.MessageId ?? '',
    message: `E-mail de teste enviado para ${data.toEmail}`,
  }
}

// ─── Verified identities ────────────────────────────────────────────────────

export async function listVerifiedIdentities(
  credentials: AWSSessionCredentials,
): Promise<VerifiedIdentity[]> {
  const client = createSESv2Client(credentials)

  const identities: VerifiedIdentity[] = []
  let nextToken: string | undefined

  do {
    const response = await client.send(
      new ListEmailIdentitiesCommand({
        PageSize: 100,
        ...(nextToken ? { NextToken: nextToken } : {}),
      }),
    )

    for (const item of response.EmailIdentities ?? []) {
      if (item.SendingEnabled && item.VerificationStatus === 'SUCCESS') {
        identities.push({
          identity: item.IdentityName ?? '',
          type: item.IdentityType ?? '',
          sendingEnabled: item.SendingEnabled ?? false,
          verificationStatus: item.VerificationStatus ?? 'NOT_STARTED',
        })
      }
    }

    nextToken = response.NextToken
  } while (nextToken)

  return identities
}
