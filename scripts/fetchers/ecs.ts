import { ECSClient, ListClustersCommand, DescribeClustersCommand,
         ListServicesCommand, DescribeServicesCommand,
         ListTaskDefinitionsCommand, DescribeTaskDefinitionCommand } from '@aws-sdk/client-ecs';
import { ECRClient, DescribeRepositoriesCommand, ListImagesCommand } from '@aws-sdk/client-ecr';

export interface ECSSnapshot {
  clusters: Array<{
    name: string; arn: string; status: string;
    activeServicesCount: number; runningTasksCount: number;
    services: Array<{
      name: string; status: string; desiredCount: number;
      runningCount: number; taskDefinition: string; launchType: string;
    }>;
  }>;
  taskDefinitions: Array<{
    family: string; revision: number; status: string;
    cpu: string; memory: string; networkMode: string;
    containers: Array<{ name: string; image: string; cpu: number; memory: number }>;
  }>;
  ecrRepositories: Array<{
    name: string; uri: string; imageCount: number; latestTag: string;
  }>;
}

export async function fetchECS(ecs: ECSClient, ecr: ECRClient): Promise<ECSSnapshot> {
  console.log('🔍 Buscando ECS/Fargate...');
  try {
    const clusterArns = (await ecs.send(new ListClustersCommand({}))).clusterArns ?? [];
    const clusters: ECSSnapshot['clusters'] = [];

    if (clusterArns.length > 0) {
      const desc = await ecs.send(new DescribeClustersCommand({ clusters: clusterArns }));
      for (const c of desc.clusters ?? []) {
        const serviceArns = (await ecs.send(
          new ListServicesCommand({ cluster: c.clusterArn! })
        )).serviceArns ?? [];
        let services: ECSSnapshot['clusters'][0]['services'] = [];
        if (serviceArns.length > 0) {
          const svcDesc = await ecs.send(
            new DescribeServicesCommand({ cluster: c.clusterArn!, services: serviceArns })
          );
          services = (svcDesc.services ?? []).map(s => ({
            name: s.serviceName ?? '',
            status: s.status ?? '',
            desiredCount: s.desiredCount ?? 0,
            runningCount: s.runningCount ?? 0,
            taskDefinition: s.taskDefinition ?? '',
            launchType: s.launchType ?? 'FARGATE',
          }));
        }
        clusters.push({
          name: c.clusterName ?? '',
          arn: c.clusterArn ?? '',
          status: c.status ?? '',
          activeServicesCount: c.activeServicesCount ?? 0,
          runningTasksCount: c.runningTasksCount ?? 0,
          services,
        });
      }
    }

    // Task definitions (últimas 10 famílias)
    const tdArns = ((await ecs.send(
      new ListTaskDefinitionsCommand({ sort: 'DESC', maxResults: 10 })
    )).taskDefinitionArns ?? []);
    const taskDefinitions: ECSSnapshot['taskDefinitions'] = [];
    for (const arn of tdArns.slice(0, 10)) {
      const td = (await ecs.send(new DescribeTaskDefinitionCommand({ taskDefinition: arn }))).taskDefinition;
      if (td) taskDefinitions.push({
        family: td.family ?? '',
        revision: td.revision ?? 0,
        status: td.status ?? '',
        cpu: td.cpu ?? '',
        memory: td.memory ?? '',
        networkMode: td.networkMode ?? '',
        containers: (td.containerDefinitions ?? []).map(c => ({
          name: c.name ?? '',
          image: c.image ?? '',
          cpu: c.cpu ?? 0,
          memory: c.memory ?? 0,
        })),
      });
    }

    // ECR
    const repos = (await ecr.send(new DescribeRepositoriesCommand({}))).repositories ?? [];
    const ecrRepositories: ECSSnapshot['ecrRepositories'] = [];
    for (const repo of repos) {
      const images = await ecr.send(
        new ListImagesCommand({ repositoryName: repo.repositoryName!, filter: { tagStatus: 'TAGGED' } })
      );
      ecrRepositories.push({
        name: repo.repositoryName ?? '',
        uri: repo.repositoryUri ?? '',
        imageCount: images.imageIds?.length ?? 0,
        latestTag: images.imageIds?.[0]?.imageTag ?? 'latest',
      });
    }

    console.log(`  ✓ ${clusters.length} cluster(s), ${ecrRepositories.length} repo(s) ECR`);
    return { clusters, taskDefinitions, ecrRepositories };
  } catch (err) {
    console.warn('  ⚠ ECS:', (err as Error).message);
    return { clusters: [], taskDefinitions: [], ecrRepositories: [] };
  }
}
