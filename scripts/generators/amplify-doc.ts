import { autoHeader } from '../sync-aws-docs';
import type { AmplifySnapshot } from '../fetchers/amplify';

export function generateAmplifyDoc(data: AmplifySnapshot): string {
  let md = autoHeader('sync-aws-docs');
  md += '# Amplify — Frontend\n\n';

  if (data.apps.length === 0) {
    md += '_Nenhum app encontrado._\n';
    return md;
  }

  for (const app of data.apps) {
    md += `## ${app.name}\n\n`;
    md += '| Propriedade | Valor |\n';
    md += '|---|---|\n';
    md += `| App ID | \`${app.appId}\` |\n`;
    md += `| Repositório | ${app.repository || '_não configurado_'} |\n`;
    md += `| Domínio | ${app.defaultDomain || '_nenhum_'} |\n`;
    md += `| Plataforma | ${app.platform} |\n`;
    md += '\n';

    if (app.branches.length > 0) {
      md += '### Branches\n\n';
      md += '| Branch | Stage | Auto-build |\n';
      md += '|---|---|---|\n';
      for (const b of app.branches) {
        const autobuild = b.enableAutoBuild ? '✅' : '❌';
        md += `| ${b.branchName} | ${b.stage} | ${autobuild} |\n`;
      }
      md += '\n';
    }
    md += '---\n\n';
  }

  return md;
}
