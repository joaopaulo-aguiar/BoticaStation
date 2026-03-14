import { autoHeader } from '../sync-aws-docs';
import type { ECSSnapshot } from '../fetchers/ecs';

export function generateECSDoc(data: ECSSnapshot): string {
  let md = autoHeader('sync-aws-docs');
  md += '# ECS / Fargate — Clusters e Containers\n\n';

  // Clusters
  if (data.clusters.length === 0) {
    md += '_Nenhum cluster encontrado._\n\n';
  } else {
    for (const c of data.clusters) {
      md += `## Cluster: ${c.name}\n\n`;
      md += '| Propriedade | Valor |\n';
      md += '|---|---|\n';
      md += `| Status | ${c.status} |\n`;
      md += `| Serviços ativos | ${c.activeServicesCount} |\n`;
      md += `| Tasks rodando | ${c.runningTasksCount} |\n`;
      md += '\n';

      if (c.services.length > 0) {
        md += '### Serviços\n\n';
        md += '| Nome | Status | Desired | Running | Tipo |\n';
        md += '|---|---|---|---|---|\n';
        for (const s of c.services) {
          md += `| ${s.name} | ${s.status} | ${s.desiredCount} | ${s.runningCount} | ${s.launchType} |\n`;
        }
        md += '\n';
      }
      md += '---\n\n';
    }
  }

  // Task Definitions
  md += '## Task Definitions\n\n';
  if (data.taskDefinitions.length === 0) {
    md += '_Nenhuma task definition encontrada._\n\n';
  } else {
    md += '| Família | Revisão | CPU | Memória | Containers |\n';
    md += '|---|---|---|---|---|\n';
    for (const td of data.taskDefinitions) {
      const containers = td.containers.map(c => c.name).join(', ');
      md += `| ${td.family} | ${td.revision} | ${td.cpu} | ${td.memory} | ${containers} |\n`;
    }
    md += '\n';
  }

  // ECR
  md += '## Repositórios ECR\n\n';
  if (data.ecrRepositories.length === 0) {
    md += '_Nenhum repositório ECR encontrado._\n\n';
  } else {
    md += '| Nome | URI | Imagens | Última Tag |\n';
    md += '|---|---|---|---|\n';
    for (const r of data.ecrRepositories) {
      md += `| ${r.name} | \`${r.uri}\` | ${r.imageCount} | ${r.latestTag} |\n`;
    }
    md += '\n';
  }

  return md;
}
