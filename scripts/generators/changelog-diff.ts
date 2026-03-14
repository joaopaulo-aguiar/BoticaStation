/**
 * Detecta mudanças entre dois snapshots AWS e retorna descrições em Markdown.
 */
export function detectChanges(prev: any, current: any): string[] {
  if (!prev || !prev.capturedAt) return [];

  const changes: string[] = [];

  // Helper: compara arrays por uma chave
  function diffArrays(
    label: string,
    oldArr: any[] | undefined,
    newArr: any[] | undefined,
    keyFn: (item: any) => string
  ) {
    const oldItems = new Set((oldArr ?? []).map(keyFn));
    const newItems = new Set((newArr ?? []).map(keyFn));

    for (const item of newItems) {
      if (!oldItems.has(item)) changes.push(`- ➕ **${label}**: \`${item}\` adicionado`);
    }
    for (const item of oldItems) {
      if (!newItems.has(item)) changes.push(`- ➖ **${label}**: \`${item}\` removido`);
    }
  }

  // Lambda
  diffArrays(
    'Lambda',
    prev.lambdas?.functions,
    current.lambdas?.functions,
    (f: any) => f.functionName
  );

  // DynamoDB
  diffArrays(
    'DynamoDB',
    prev.dynamodb?.tables,
    current.dynamodb?.tables,
    (t: any) => t.tableName
  );

  // Step Functions
  diffArrays(
    'Step Functions',
    prev.stepFunctions?.stateMachines,
    current.stepFunctions?.stateMachines,
    (sm: any) => sm.name
  );

  // SES identities
  diffArrays(
    'SES Identidade',
    prev.ses?.identities,
    current.ses?.identities,
    (i: any) => i.email
  );

  // ECS clusters
  diffArrays(
    'ECS Cluster',
    prev.ecs?.clusters,
    current.ecs?.clusters,
    (c: any) => c.name
  );

  // ECS services (all clusters)
  const prevServices = (prev.ecs?.clusters ?? []).flatMap((c: any) => (c.services ?? []).map((s: any) => `${c.name}/${s.name}`));
  const currServices = (current.ecs?.clusters ?? []).flatMap((c: any) => (c.services ?? []).map((s: any) => `${c.name}/${s.name}`));
  diffArrays('ECS Serviço', prevServices.map((s: string) => ({ n: s })), currServices.map((s: string) => ({ n: s })), (x: any) => x.n);

  // ECR repositories
  diffArrays(
    'ECR Repo',
    prev.ecs?.ecrRepositories,
    current.ecs?.ecrRepositories,
    (r: any) => r.name
  );

  // SQS
  diffArrays(
    'SQS Fila',
    prev.sqs?.queues,
    current.sqs?.queues,
    (q: any) => q.name
  );

  // Cognito user pools
  diffArrays(
    'Cognito User Pool',
    prev.cognito?.userPools,
    current.cognito?.userPools,
    (p: any) => p.name
  );

  // Amplify apps
  diffArrays(
    'Amplify App',
    prev.amplify?.apps,
    current.amplify?.apps,
    (a: any) => a.name
  );

  // CloudWatch alarms
  diffArrays(
    'CloudWatch Alarme',
    prev.cloudwatch?.alarms,
    current.cloudwatch?.alarms,
    (a: any) => a.name
  );

  // CloudWatch alarm state changes
  const prevAlarms = new Map((prev.cloudwatch?.alarms ?? []).map((a: any) => [a.name, a.state]));
  for (const alarm of current.cloudwatch?.alarms ?? []) {
    const prevState = prevAlarms.get(alarm.name);
    if (prevState && prevState !== alarm.state) {
      changes.push(`- 🔔 **CloudWatch Alarme** \`${alarm.name}\`: ${prevState} → ${alarm.state}`);
    }
  }

  // CloudFormation stacks
  diffArrays(
    'CloudFormation Stack',
    prev.cloudformation?.stacks,
    current.cloudformation?.stacks,
    (s: any) => s.stackName
  );

  return changes;
}
