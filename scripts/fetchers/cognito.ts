import { CognitoIdentityProviderClient, ListUserPoolsCommand,
         DescribeUserPoolCommand, ListUserPoolClientsCommand,
         DescribeUserPoolClientCommand,
         GetUserPoolMfaConfigCommand } from '@aws-sdk/client-cognito-identity-provider';

export interface CognitoSnapshot {
  userPools: Array<{
    id: string; name: string; status: string;
    mfaConfig: string; estimatedUsers: number;
    passwordPolicy: {
      minLength: number; requireUppercase: boolean;
      requireNumbers: boolean; requireSymbols: boolean;
    };
    clients: Array<{
      clientId: string; clientName: string;
      allowedOAuthFlows: string[]; callbackUrls: string[];
    }>;
  }>;
}

export async function fetchCognito(client: CognitoIdentityProviderClient): Promise<CognitoSnapshot> {
  console.log('🔍 Buscando Cognito...');
  try {
    const list = await client.send(new ListUserPoolsCommand({ MaxResults: 20 }));
    const userPools: CognitoSnapshot['userPools'] = [];
    for (const pool of list.UserPools ?? []) {
      const desc = await client.send(new DescribeUserPoolCommand({ UserPoolId: pool.Id! }));
      const mfa  = await client.send(new GetUserPoolMfaConfigCommand({ UserPoolId: pool.Id! }));
      const clientsList = await client.send(
        new ListUserPoolClientsCommand({ UserPoolId: pool.Id!, MaxResults: 20 })
      );
      const clients_: CognitoSnapshot['userPools'][0]['clients'] = [];
      for (const c of clientsList.UserPoolClients ?? []) {
        const cd = await client.send(
          new DescribeUserPoolClientCommand({ UserPoolId: pool.Id!, ClientId: c.ClientId! })
        );
        clients_.push({
          clientId: c.ClientId ?? '',
          clientName: c.ClientName ?? '',
          allowedOAuthFlows: cd.UserPoolClient?.AllowedOAuthFlows ?? [],
          callbackUrls: cd.UserPoolClient?.CallbackURLs ?? [],
        });
      }
      const up = desc.UserPool!;
      const pp = up.Policies?.PasswordPolicy;
      userPools.push({
        id: pool.Id ?? '',
        name: pool.Name ?? '',
        status: up.Status ?? '',
        mfaConfig: mfa.MfaConfiguration ?? 'OFF',
        estimatedUsers: up.EstimatedNumberOfUsers ?? 0,
        passwordPolicy: {
          minLength: pp?.MinimumLength ?? 8,
          requireUppercase: pp?.RequireUppercase ?? false,
          requireNumbers: pp?.RequireNumbers ?? false,
          requireSymbols: pp?.RequireSymbols ?? false,
        },
        clients: clients_,
      });
    }
    console.log(`  ✓ ${userPools.length} user pool(s) Cognito`);
    return { userPools };
  } catch (err) {
    console.warn('  ⚠ Cognito:', (err as Error).message);
    return { userPools: [] };
  }
}
