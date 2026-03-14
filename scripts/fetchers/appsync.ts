import { AppSyncClient, ListGraphqlApisCommand,
         GetIntrospectionSchemaCommand } from '@aws-sdk/client-appsync';

export interface AppSyncSnapshot {
  apis: Array<{
    apiId: string; name: string; authenticationType: string;
    uris: Record<string, string>;
  }>;
  schemas: Record<string, string>;
}

export async function fetchAppSync(client: AppSyncClient): Promise<AppSyncSnapshot> {
  console.log('🔍 Buscando AppSync...');
  try {
    const listRes = await client.send(new ListGraphqlApisCommand({}));
    const apis = (listRes.graphqlApis ?? []).map(api => ({
      apiId: api.apiId ?? '',
      name: api.name ?? '',
      authenticationType: api.authenticationType ?? '',
      uris: (api.uris ?? {}) as Record<string, string>,
    }));

    const schemas: Record<string, string> = {};
    for (const api of apis) {
      try {
        const schemaRes = await client.send(new GetIntrospectionSchemaCommand({
          apiId: api.apiId,
          format: 'SDL',
        }));
        if (schemaRes.schema) {
          const decoder = new TextDecoder('utf-8');
          schemas[api.apiId] = decoder.decode(schemaRes.schema);
        }
      } catch {
        console.warn(`  ⚠ Schema não disponível para ${api.name}`);
      }
    }

    console.log(`  ✓ ${apis.length} API(s) AppSync`);
    return { apis, schemas };
  } catch (err) {
    console.warn('  ⚠ AppSync:', (err as Error).message);
    return { apis: [], schemas: {} };
  }
}
