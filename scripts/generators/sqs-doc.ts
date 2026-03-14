import { autoHeader } from '../sync-aws-docs';
import type { SQSSnapshot } from '../fetchers/sqs';

export function generateSQSDoc(data: SQSSnapshot): string {
  let md = autoHeader('sync-aws-docs');
  md += '# Filas SQS\n\n';

  if (data.queues.length === 0) {
    md += '_Nenhuma fila encontrada._\n';
    return md;
  }

  md += `Total: **${data.queues.length}** fila(s)\n\n`;

  md += '| Nome | Mensagens | Visibilidade | Retenção | DLQ | FIFO |\n';
  md += '|---|---|---|---|---|---|\n';
  for (const q of data.queues) {
    const dlq = q.dlqArn ? `✅ \`${q.dlqArn.split(':').pop()}\`` : '❌';
    const fifo = q.isFifo ? '✅' : '❌';
    const retentionDays = Math.floor(q.messageRetentionPeriod / 86400);
    const highlight = q.approximateMessages > 0 ? ' ⚠️' : '';
    md += `| ${q.name}${highlight} | ${q.approximateMessages} | ${q.visibilityTimeout}s | ${retentionDays}d | ${dlq} | ${fifo} |\n`;
  }
  md += '\n';

  // Destaque para filas com mensagens pendentes
  const withMessages = data.queues.filter(q => q.approximateMessages > 0);
  if (withMessages.length > 0) {
    md += '### ⚠️ Filas com mensagens pendentes\n\n';
    for (const q of withMessages) {
      md += `- **${q.name}**: ${q.approximateMessages} mensagem(ns) visível(is), ${q.approximateNotVisible} em processamento\n`;
    }
    md += '\n';
  }

  return md;
}
