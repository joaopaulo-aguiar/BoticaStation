import { autoHeader } from '../sync-aws-docs';
import type { LambdaFunctionInfo } from '../fetchers/lambda';

export function generateLambdaDoc(functions: LambdaFunctionInfo[]): string {
  let md = autoHeader('sync-aws-docs');
  md += '# Funções Lambda\n\n';

  if (functions.length === 0) {
    md += '_Nenhuma função encontrada._\n';
    return md;
  }

  md += `Total: **${functions.length}** função(ões)\n\n`;

  md += '## Resumo\n\n';
  md += '| Função | Runtime | Memória | Timeout | Código |\n';
  md += '|---|---|---|---|---|\n';
  for (const fn of functions) {
    const size = fn.codeSize > 1024 * 1024
      ? `${(fn.codeSize / 1024 / 1024).toFixed(1)} MB`
      : `${(fn.codeSize / 1024).toFixed(0)} KB`;
    md += `| ${fn.functionName} | ${fn.runtime} | ${fn.memorySize} MB | ${fn.timeout}s | ${size} |\n`;
  }
  md += '\n';

  for (const fn of functions) {
    md += `## ${fn.functionName}\n\n`;
    md += `${fn.description || '_Sem descrição_'}\n\n`;
    md += '| Propriedade | Valor |\n';
    md += '|---|---|\n';
    md += `| Runtime | ${fn.runtime} |\n`;
    md += `| Handler | \`${fn.handler}\` |\n`;
    md += `| Memória | ${fn.memorySize} MB |\n`;
    md += `| Timeout | ${fn.timeout}s |\n`;
    md += `| Última modificação | ${fn.lastModified} |\n`;
    md += '\n';

    if (fn.layers.length > 0) {
      md += '**Layers:** ' + fn.layers.map(l => `\`${l.split(':').pop()}\``).join(', ') + '\n\n';
    }

    const envKeys = Object.keys(fn.environment);
    if (envKeys.length > 0) {
      md += '**Variáveis de ambiente:** ' + envKeys.map(k => `\`${k}\``).join(', ') + '\n\n';
    }
    md += '---\n\n';
  }
  return md;
}
