import { autoHeader } from '../sync-aws-docs';
import type { DynamoTableInfo } from '../fetchers/dynamodb';

export function generateDynamoDoc(tables: DynamoTableInfo[]): string {
  let md = autoHeader('sync-aws-docs');
  md += '# Tabelas DynamoDB\n\n';

  if (tables.length === 0) {
    md += '_Nenhuma tabela encontrada._\n';
    return md;
  }

  md += `Total: **${tables.length}** tabela(s)\n\n`;

  for (const t of tables) {
    md += `## ${t.tableName}\n\n`;
    md += '| Propriedade | Valor |\n';
    md += '|---|---|\n';
    md += `| Status | ${t.status} |\n`;
    md += `| Partition Key | \`${t.partitionKey}\` |\n`;
    if (t.sortKey) md += `| Sort Key | \`${t.sortKey}\` |\n`;
    md += `| Billing Mode | ${t.billingMode} |\n`;
    md += `| Items | ${t.itemCount.toLocaleString('pt-BR')} |\n`;
    md += `| Tamanho | ${(t.sizeBytes / 1024 / 1024).toFixed(2)} MB |\n`;
    md += `| Stream | ${t.streamEnabled ? '✅ Ativo' : '❌ Inativo'} |\n`;
    md += '\n';

    if (t.gsis.length > 0) {
      md += '### GSIs\n\n';
      md += '| Index | Key Schema | Projeção |\n';
      md += '|---|---|---|\n';
      for (const g of t.gsis) {
        md += `| ${g.indexName} | ${g.keySchema} | ${g.projection} |\n`;
      }
      md += '\n';
    }
    md += '---\n\n';
  }
  return md;
}
