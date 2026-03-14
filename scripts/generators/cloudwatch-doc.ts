import { autoHeader } from '../sync-aws-docs';
import type { CloudWatchSnapshot } from '../fetchers/cloudwatch';

export function generateCloudWatchDoc(data: CloudWatchSnapshot): string {
  let md = autoHeader('sync-aws-docs');
  md += '# CloudWatch — Monitoramento\n\n';

  // Alarmes
  md += '## Alarmes\n\n';
  if (data.alarms.length === 0) {
    md += '_Nenhum alarme configurado._\n\n';
  } else {
    md += '| Nome | Estado | Métrica | Threshold | Namespace |\n';
    md += '|---|---|---|---|---|\n';
    for (const a of data.alarms) {
      const stateIcon = a.state === 'ALARM' ? '🔴' : a.state === 'OK' ? '🟢' : '⚪';
      md += `| ${a.name} | ${stateIcon} ${a.state} | ${a.metric} | ${a.comparisonOperator} ${a.threshold} | ${a.namespace} |\n`;
    }
    md += '\n';

    const inAlarm = data.alarms.filter(a => a.state === 'ALARM');
    if (inAlarm.length > 0) {
      md += `### 🔴 ${inAlarm.length} alarme(s) em estado ALARM\n\n`;
      for (const a of inAlarm) {
        md += `- **${a.name}**: ${a.metric} ${a.comparisonOperator} ${a.threshold} (${a.namespace})\n`;
      }
      md += '\n';
    }
  }

  // Grupos de log
  md += '## Grupos de Log\n\n';
  if (data.logGroups.length === 0) {
    md += '_Nenhum grupo de log encontrado._\n\n';
  } else {
    md += '| Nome | Retenção | Tamanho |\n';
    md += '|---|---|---|\n';
    for (const g of data.logGroups) {
      const retention = g.retentionDays > 0 ? `${g.retentionDays} dias` : '♾️ infinita';
      const size = g.storedBytes > 1024 * 1024
        ? `${(g.storedBytes / 1024 / 1024).toFixed(1)} MB`
        : `${(g.storedBytes / 1024).toFixed(0)} KB`;
      md += `| ${g.name} | ${retention} | ${size} |\n`;
    }
    md += '\n';
  }

  // Dashboards
  md += '## Dashboards\n\n';
  if (data.dashboards.length === 0) {
    md += '_Nenhum dashboard configurado._\n';
  } else {
    for (const d of data.dashboards) {
      md += `- ${d}\n`;
    }
  }
  md += '\n';

  return md;
}
