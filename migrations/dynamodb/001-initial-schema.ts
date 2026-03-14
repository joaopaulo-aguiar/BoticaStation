// Placeholder — migração inicial
// Mova a definição das tabelas existentes para cá ao implementar o runner
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

export async function up(client: DynamoDBClient): Promise<void> {
  // Tabelas já existentes na AWS — esta migração é o "baseline"
  console.log('001-initial-schema: baseline — tabelas já existem na AWS');
}

export async function down(client: DynamoDBClient): Promise<void> {
  console.log('001-initial-schema: rollback não aplicável ao baseline');
}
