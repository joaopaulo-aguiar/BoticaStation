import { autoHeader } from '../sync-aws-docs';
import type { SESSnapshot } from '../fetchers/ses';

export function generateSESDoc(data: SESSnapshot): string {
  let md = autoHeader('sync-aws-docs');
  md += '# SES — Configuração de E-mail\n\n';

  // Identidades
  md += '## Identidades verificadas\n\n';
  if (data.identities.length === 0) {
    md += '_Nenhuma identidade encontrada._\n\n';
  } else {
    md += '| E-mail | Status |\n';
    md += '|---|---|\n';
    for (const id of data.identities) {
      const icon = id.verificationStatus === 'Success' ? '✅' : '⏳';
      md += `| ${id.email} | ${icon} ${id.verificationStatus} |\n`;
    }
    md += '\n';
  }

  // Cota de envio
  md += '## Cota de envio\n\n';
  md += '| Propriedade | Valor |\n';
  md += '|---|---|\n';
  md += `| Limite 24h | ${data.sendQuota.max24HourSend.toLocaleString('pt-BR')} |\n`;
  md += `| Rate máximo | ${data.sendQuota.maxSendRate}/s |\n`;
  md += `| Enviados (24h) | ${data.sendQuota.sentLast24Hours.toLocaleString('pt-BR')} |\n`;
  md += '\n';

  // Configuration Sets
  md += '## Configuration Sets\n\n';
  if (data.configurationSets.length === 0) {
    md += '_Nenhum configuration set._\n';
  } else {
    for (const cs of data.configurationSets) {
      md += `- ${cs}\n`;
    }
  }
  md += '\n';

  return md;
}
