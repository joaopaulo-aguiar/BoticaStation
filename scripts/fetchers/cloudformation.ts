import { CloudFormationClient, ListStacksCommand,
         DescribeStacksCommand,
         ListStackResourcesCommand } from '@aws-sdk/client-cloudformation';

export interface CloudFormationSnapshot {
  stacks: Array<{
    stackName: string;
    stackStatus: string;
    creationTime: string;
    lastUpdated: string;
    resourceCount: number;
    outputs: Array<{ key: string; value: string }>;
  }>;
}

export async function fetchCloudFormation(client: CloudFormationClient): Promise<CloudFormationSnapshot> {
  console.log('🔍 Buscando CloudFormation...');
  try {
    const listRes = await client.send(new ListStacksCommand({
      StackStatusFilter: [
        'CREATE_COMPLETE', 'UPDATE_COMPLETE', 'UPDATE_ROLLBACK_COMPLETE',
      ],
    }));

    const stacks: CloudFormationSnapshot['stacks'] = [];
    for (const summary of listRes.StackSummaries ?? []) {
      try {
        const descRes = await client.send(
          new DescribeStacksCommand({ StackName: summary.StackName! })
        );
        const stack = descRes.Stacks?.[0];
        const resources = await client.send(
          new ListStackResourcesCommand({ StackName: summary.StackName! })
        );

        stacks.push({
          stackName: summary.StackName ?? '',
          stackStatus: summary.StackStatus ?? '',
          creationTime: summary.CreationTime?.toISOString() ?? '',
          lastUpdated: summary.LastUpdatedTime?.toISOString() ?? '',
          resourceCount: resources.StackResourceSummaries?.length ?? 0,
          outputs: (stack?.Outputs ?? []).map(o => ({
            key: o.OutputKey ?? '',
            value: o.OutputValue ?? '',
          })),
        });
      } catch {
        // Stack pode ter sido deletada entre list e describe
      }
    }

    console.log(`  ✓ ${stacks.length} stack(s) CloudFormation`);
    return { stacks };
  } catch (err) {
    console.warn('  ⚠ CloudFormation:', (err as Error).message);
    return { stacks: [] };
  }
}
