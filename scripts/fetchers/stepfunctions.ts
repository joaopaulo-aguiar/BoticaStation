import { SFNClient, ListStateMachinesCommand,
         DescribeStateMachineCommand } from '@aws-sdk/client-sfn';

export interface StateMachineInfo {
  name: string;
  arn: string;
  status: string;
  type: string;
  definition: string;
  roleArn: string;
  creationDate: string;
}

export interface StepFunctionsSnapshot {
  stateMachines: StateMachineInfo[];
}

export async function fetchStepFunctions(client: SFNClient): Promise<StepFunctionsSnapshot> {
  console.log('🔍 Buscando Step Functions...');
  try {
    const listRes = await client.send(new ListStateMachinesCommand({}));
    const stateMachines: StateMachineInfo[] = [];

    for (const sm of listRes.stateMachines ?? []) {
      const desc = await client.send(
        new DescribeStateMachineCommand({ stateMachineArn: sm.stateMachineArn! })
      );
      stateMachines.push({
        name: desc.name ?? '',
        arn: desc.stateMachineArn ?? '',
        status: desc.status ?? '',
        type: desc.type ?? '',
        definition: desc.definition ?? '{}',
        roleArn: desc.roleArn ?? '',
        creationDate: desc.creationDate?.toISOString() ?? '',
      });
    }

    console.log(`  ✓ ${stateMachines.length} máquina(s) de estado`);
    return { stateMachines };
  } catch (err) {
    console.warn('  ⚠ Step Functions:', (err as Error).message);
    return { stateMachines: [] };
  }
}
