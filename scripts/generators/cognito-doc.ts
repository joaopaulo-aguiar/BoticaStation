import { autoHeader } from '../sync-aws-docs';
import type { CognitoSnapshot } from '../fetchers/cognito';

export function generateCognitoDoc(data: CognitoSnapshot): string {
  let md = autoHeader('sync-aws-docs');
  md += '# Cognito — Autenticação\n\n';

  if (data.userPools.length === 0) {
    md += '_Nenhum user pool encontrado._\n';
    return md;
  }

  for (const pool of data.userPools) {
    md += `## ${pool.name}\n\n`;
    md += '| Propriedade | Valor |\n';
    md += '|---|---|\n';
    md += `| ID | \`${pool.id}\` |\n`;
    md += `| Usuários estimados | ${pool.estimatedUsers.toLocaleString('pt-BR')} |\n`;
    md += `| MFA | ${pool.mfaConfig} |\n`;
    md += `| Senha mín. | ${pool.passwordPolicy.minLength} caracteres |\n`;
    md += `| Requer maiúscula | ${pool.passwordPolicy.requireUppercase ? '✅' : '❌'} |\n`;
    md += `| Requer número | ${pool.passwordPolicy.requireNumbers ? '✅' : '❌'} |\n`;
    md += `| Requer símbolo | ${pool.passwordPolicy.requireSymbols ? '✅' : '❌'} |\n`;
    md += '\n';

    if (pool.clients.length > 0) {
      md += '### App Clients\n\n';
      md += '| Nome | OAuth Flows | Callback URLs |\n';
      md += '|---|---|---|\n';
      for (const c of pool.clients) {
        const flows = c.allowedOAuthFlows.join(', ') || '_nenhum_';
        const urls = c.callbackUrls.join(', ') || '_nenhum_';
        md += `| ${c.clientName} | ${flows} | ${urls} |\n`;
      }
      md += '\n';
    }
    md += '---\n\n';
  }

  return md;
}
