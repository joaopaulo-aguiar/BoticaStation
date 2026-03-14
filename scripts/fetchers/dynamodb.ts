import { DynamoDBClient, ListTablesCommand,
         DescribeTableCommand } from '@aws-sdk/client-dynamodb';

export interface DynamoTableInfo {
  tableName: string;
  status: string;
  itemCount: number;
  sizeBytes: number;
  partitionKey: string;
  sortKey?: string;
  gsis: Array<{ indexName: string; keySchema: string; projection: string }>;
  billingMode: string;
  ttlAttribute?: string;
  streamEnabled: boolean;
}

export interface DynamoDBSnapshot {
  tables: DynamoTableInfo[];
}

export async function fetchDynamoDB(client: DynamoDBClient): Promise<DynamoDBSnapshot> {
  console.log('🔍 Buscando DynamoDB...');
  try {
    const listRes = await client.send(new ListTablesCommand({}));
    const tableNames = listRes.TableNames ?? [];
    const tables: DynamoTableInfo[] = [];

    for (const name of tableNames) {
      const desc = await client.send(new DescribeTableCommand({ TableName: name }));
      const t = desc.Table!;
      const ks = t.KeySchema ?? [];
      const pk = ks.find(k => k.KeyType === 'HASH');
      const sk = ks.find(k => k.KeyType === 'RANGE');

      tables.push({
        tableName: t.TableName ?? name,
        status: t.TableStatus ?? '',
        itemCount: t.ItemCount ?? 0,
        sizeBytes: t.TableSizeBytes ?? 0,
        partitionKey: pk?.AttributeName ?? '',
        sortKey: sk?.AttributeName,
        gsis: (t.GlobalSecondaryIndexes ?? []).map(g => ({
          indexName: g.IndexName ?? '',
          keySchema: (g.KeySchema ?? []).map(k => `${k.AttributeName} (${k.KeyType})`).join(', '),
          projection: g.Projection?.ProjectionType ?? '',
        })),
        billingMode: t.BillingModeSummary?.BillingMode ?? 'PROVISIONED',
        streamEnabled: !!t.StreamSpecification?.StreamEnabled,
      });
    }

    console.log(`  ✓ ${tables.length} tabela(s) DynamoDB`);
    return { tables };
  } catch (err) {
    console.warn('  ⚠ DynamoDB:', (err as Error).message);
    return { tables: [] };
  }
}
