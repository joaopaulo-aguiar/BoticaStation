/**
 * AWS SES Identity Management API.
 *
 * Provides functions for managing SES email identities (domains & emails):
 * - List all identities with their verification status
 * - Create new domain or email identities
 * - Get DKIM/verification details
 * - Delete identities
 *
 * Used in Settings → SES Domain Configuration.
 */
import {
  SESv2Client,
  ListEmailIdentitiesCommand,
  GetEmailIdentityCommand,
  CreateEmailIdentityCommand,
  DeleteEmailIdentityCommand,
  type IdentityType,
  type DkimAttributes,
} from '@aws-sdk/client-sesv2'
import type { AWSSessionCredentials } from '@/shared/types'

const SES_REGION = 'sa-east-1'

function createSES(credentials: AWSSessionCredentials): SESv2Client {
  return new SESv2Client({
    region: SES_REGION,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  })
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SesIdentity {
  identity: string
  type: 'DOMAIN' | 'EMAIL_ADDRESS'
  sendingEnabled: boolean
  verificationStatus: string
  dkimStatus?: string
  dkimTokens?: string[]
  lastChecked?: string
}

export interface SesIdentityDetail extends SesIdentity {
  dkimAttributes?: {
    signingEnabled: boolean
    status: string
    tokens: string[]
    signingAttributesOrigin?: string
    nextSigningKeyLength?: string
    currentSigningKeyLength?: string
    lastKeyGenerationTimestamp?: string
  }
  mailFromDomain?: string
  mailFromStatus?: string
  feedbackForwardingEnabled?: boolean
  configurationSetName?: string
}

export interface DkimRecord {
  name: string
  value: string
  type: 'CNAME'
}

// ─── API Functions ───────────────────────────────────────────────────────────

/**
 * List all SES email identities (domains and email addresses)
 * with their verification and sending status.
 */
export async function listAllIdentities(
  credentials: AWSSessionCredentials,
): Promise<SesIdentity[]> {
  const client = createSES(credentials)
  const identities: SesIdentity[] = []
  let nextToken: string | undefined

  do {
    const response = await client.send(
      new ListEmailIdentitiesCommand({
        PageSize: 100,
        ...(nextToken ? { NextToken: nextToken } : {}),
      }),
    )

    for (const item of response.EmailIdentities ?? []) {
      identities.push({
        identity: item.IdentityName ?? '',
        type: (item.IdentityType as 'DOMAIN' | 'EMAIL_ADDRESS') ?? 'EMAIL_ADDRESS',
        sendingEnabled: item.SendingEnabled ?? false,
        verificationStatus: item.VerificationStatus ?? 'NOT_STARTED',
      })
    }

    nextToken = response.NextToken
  } while (nextToken)

  return identities
}

/**
 * Get detailed information about a specific identity,
 * including DKIM tokens for domain verification.
 */
export async function getIdentityDetail(
  credentials: AWSSessionCredentials,
  identityName: string,
): Promise<SesIdentityDetail> {
  const client = createSES(credentials)

  const response = await client.send(
    new GetEmailIdentityCommand({ EmailIdentity: identityName }),
  )

  const dkim = response.DkimAttributes
  const mailFrom = response.MailFromAttributes

  return {
    identity: identityName,
    type: (response.IdentityType as 'DOMAIN' | 'EMAIL_ADDRESS') ?? 'EMAIL_ADDRESS',
    sendingEnabled: response.SendingEnabled ?? false,
    verificationStatus: response.VerifiedForSendingStatus ? 'SUCCESS' : 'PENDING',
    dkimStatus: dkim?.Status ?? undefined,
    dkimTokens: dkim?.Tokens ?? [],
    dkimAttributes: dkim
      ? {
          signingEnabled: dkim.SigningEnabled ?? false,
          status: dkim.Status ?? 'NOT_STARTED',
          tokens: dkim.Tokens ?? [],
          signingAttributesOrigin: dkim.SigningAttributesOrigin ?? undefined,
          nextSigningKeyLength: dkim.NextSigningKeyLength ?? undefined,
          currentSigningKeyLength: dkim.CurrentSigningKeyLength ?? undefined,
          lastKeyGenerationTimestamp: dkim.LastKeyGenerationTimestamp?.toISOString() ?? undefined,
        }
      : undefined,
    mailFromDomain: mailFrom?.MailFromDomain ?? undefined,
    mailFromStatus: mailFrom?.MailFromDomainStatus ?? undefined,
    feedbackForwardingEnabled: response.FeedbackForwardingStatus ?? undefined,
    configurationSetName: response.ConfigurationSetName ?? undefined,
  }
}

/**
 * Create a new SES email identity (domain or email address).
 * - For domains: triggers DKIM key generation, returns tokens for DNS verification.
 * - For emails: triggers a verification email to that address.
 */
export async function createIdentity(
  credentials: AWSSessionCredentials,
  identityName: string,
): Promise<{ success: boolean; dkimTokens?: string[]; message: string }> {
  const client = createSES(credentials)

  const response = await client.send(
    new CreateEmailIdentityCommand({
      EmailIdentity: identityName,
    }),
  )

  const isDomain = response.IdentityType === 'DOMAIN'
  const tokens = response.DkimAttributes?.Tokens ?? []

  return {
    success: true,
    dkimTokens: isDomain ? tokens : undefined,
    message: isDomain
      ? `Domínio "${identityName}" criado. Configure os registros DKIM no DNS.`
      : `E-mail "${identityName}" criado. Verifique sua caixa de entrada para confirmar.`,
  }
}

/**
 * Delete an SES email identity.
 */
export async function deleteIdentity(
  credentials: AWSSessionCredentials,
  identityName: string,
): Promise<{ success: boolean; message: string }> {
  const client = createSES(credentials)

  await client.send(
    new DeleteEmailIdentityCommand({ EmailIdentity: identityName }),
  )

  return {
    success: true,
    message: `Identidade "${identityName}" removida com sucesso.`,
  }
}

/**
 * Get DKIM DNS records that need to be added for domain verification.
 * Returns CNAME records in the format needed for DNS configuration.
 */
export function getDkimRecords(identityName: string, tokens: string[]): DkimRecord[] {
  return tokens.map((token) => ({
    name: `${token}._domainkey.${identityName}`,
    value: `${token}.dkim.amazonses.com`,
    type: 'CNAME' as const,
  }))
}
