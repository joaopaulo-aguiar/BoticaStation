import { autoHeader } from '../sync-aws-docs';
import type { StateMachineInfo } from '../fetchers/stepfunctions';

export function generateStepFunctionDocs(
  machines: StateMachineInfo[]
): Record<string, string> {
  const docs: Record<string, string> = {};

  for (const sm of machines) {
    const safeName = sm.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    let md = autoHeader('sync-aws-docs');
    md += `# ${sm.name}\n\n`;
    md += '| Propriedade | Valor |\n';
    md += '|---|---|\n';
    md += `| ARN | \`${sm.arn}\` |\n`;
    md += `| Tipo | ${sm.type} |\n`;
    md += `| Status | ${sm.status} |\n`;
    md += `| Role | \`${sm.roleArn}\` |\n`;
    md += `| Criação | ${sm.creationDate} |\n\n`;

    md += '## Definição (ASL)\n\n';
    md += '```json\n';
    try {
      md += JSON.stringify(JSON.parse(sm.definition), null, 2);
    } catch {
      md += sm.definition;
    }
    md += '\n```\n';

    docs[safeName] = md;
  }

  return docs;
}
