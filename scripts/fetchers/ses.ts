import { SESClient, ListIdentitiesCommand,
         GetIdentityVerificationAttributesCommand,
         GetSendQuotaCommand,
         ListConfigurationSetsCommand } from '@aws-sdk/client-ses';

export interface SESSnapshot {
  identities: Array<{
    email: string;
    verificationStatus: string;
  }>;
  sendQuota: {
    max24HourSend: number;
    maxSendRate: number;
    sentLast24Hours: number;
  };
  configurationSets: string[];
}

export async function fetchSES(client: SESClient): Promise<SESSnapshot> {
  console.log('🔍 Buscando SES...');
  try {
    const listRes = await client.send(new ListIdentitiesCommand({ IdentityType: 'EmailAddress' }));
    const ids = listRes.Identities ?? [];

    let verificationMap: Record<string, string> = {};
    if (ids.length > 0) {
      const verRes = await client.send(
        new GetIdentityVerificationAttributesCommand({ Identities: ids })
      );
      verificationMap = Object.fromEntries(
        Object.entries(verRes.VerificationAttributes ?? {}).map(([k, v]) => [
          k, v.VerificationStatus ?? 'Unknown',
        ])
      );
    }

    const quotaRes = await client.send(new GetSendQuotaCommand({}));
    const setsRes  = await client.send(new ListConfigurationSetsCommand({}));

    const result: SESSnapshot = {
      identities: ids.map(id => ({
        email: id,
        verificationStatus: verificationMap[id] ?? 'Unknown',
      })),
      sendQuota: {
        max24HourSend:   quotaRes.Max24HourSend ?? 0,
        maxSendRate:     quotaRes.MaxSendRate ?? 0,
        sentLast24Hours: quotaRes.SentLast24Hours ?? 0,
      },
      configurationSets: (setsRes.ConfigurationSets ?? []).map(s => s.Name ?? ''),
    };
    console.log(`  ✓ ${result.identities.length} identidade(s) SES`);
    return result;
  } catch (err) {
    console.warn('  ⚠ SES:', (err as Error).message);
    return { identities: [], sendQuota: { max24HourSend: 0, maxSendRate: 0, sentLast24Hours: 0 }, configurationSets: [] };
  }
}
