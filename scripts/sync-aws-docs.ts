import { AppSyncClient }       from '@aws-sdk/client-appsync';
import { DynamoDBClient }      from '@aws-sdk/client-dynamodb';
import { LambdaClient }        from '@aws-sdk/client-lambda';
import { SFNClient }           from '@aws-sdk/client-sfn';
import { SESClient }           from '@aws-sdk/client-ses';
import { ECSClient }           from '@aws-sdk/client-ecs';
import { ECRClient }           from '@aws-sdk/client-ecr';
import { SQSClient }           from '@aws-sdk/client-sqs';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { AmplifyClient }       from '@aws-sdk/client-amplify';
import { CloudWatchClient }    from '@aws-sdk/client-cloudwatch';
import { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import * as fs   from 'fs';
import * as path from 'path';

// ── importa fetchers (um por serviço) ────────────────────────
import { fetchAppSync }        from './fetchers/appsync';
import { fetchDynamoDB }       from './fetchers/dynamodb';
import { fetchLambdas }        from './fetchers/lambda';
import { fetchStepFunctions }  from './fetchers/stepfunctions';
import { fetchSES }            from './fetchers/ses';
import { fetchECS }            from './fetchers/ecs';
import { fetchSQS }            from './fetchers/sqs';
import { fetchCognito }        from './fetchers/cognito';
import { fetchAmplify }        from './fetchers/amplify';
import { fetchCloudWatch }     from './fetchers/cloudwatch';
import { fetchCloudFormation } from './fetchers/cloudformation';

// ── importa generators (um por documento) ───────────────────
import { generateDynamoDoc }        from './generators/dynamo-doc';
import { generateLambdaDoc }        from './generators/lambda-doc';
import { generateStepFunctionDocs } from './generators/stepfunctions-doc';
import { generateSESDoc }           from './generators/ses-doc';
import { generateECSDoc }           from './generators/ecs-doc';
import { generateSQSDoc }           from './generators/sqs-doc';
import { generateCognitoDoc }       from './generators/cognito-doc';
import { generateAmplifyDoc }       from './generators/amplify-doc';
import { generateCloudWatchDoc }    from './generators/cloudwatch-doc';
import { detectChanges }            from './generators/changelog-diff';

const REGION = process.env.AWS_DEFAULT_REGION ?? process.env.AWS_REGION ?? 'us-east-1';
const ROOT   = process.cwd();

// ── helper de escrita ────────────────────────────────────────
export function write(filePath: string, content: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`  ✅ ${path.relative(ROOT, filePath)}`);
}

export function autoHeader(tool: string): string {
  return (
    `> ⚠️ Gerado automaticamente por \`${tool}\`\n` +
    `> Última atualização: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n` +
    `> **Não edite manualmente** — sobrescrito no próximo sync.\n\n`
  );
}

// ── main ─────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 Sincronizando documentação com AWS...\n');
  console.log(`📍 Região: ${REGION}\n`);

  // Carrega snapshot anterior para diff
  const snapshotPath = path.join(ROOT, 'aws-snapshot.json');
  let prev: any = null;
  if (fs.existsSync(snapshotPath)) {
    prev = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
    console.log('📋 Snapshot anterior carregado\n');
  }

  // ── instancia clientes ──────────────────────────────────────
  const cfg = { region: REGION };
  const clients = {
    appsync:  new AppSyncClient(cfg),
    dynamo:   new DynamoDBClient(cfg),
    lambda:   new LambdaClient(cfg),
    sfn:      new SFNClient(cfg),
    ses:      new SESClient(cfg),
    ecs:      new ECSClient(cfg),
    ecr:      new ECRClient(cfg),
    sqs:      new SQSClient(cfg),
    cognito:  new CognitoIdentityProviderClient(cfg),
    amplify:  new AmplifyClient(cfg),
    cw:       new CloudWatchClient(cfg),
    cwLogs:   new CloudWatchLogsClient(cfg),
    cfn:      new CloudFormationClient(cfg),
  };

  // ── busca todos os serviços em paralelo ─────────────────────
  console.log('🔍 Buscando dados de todos os serviços AWS...\n');
  const [
    appsyncData, dynamoData, lambdaData, sfnData,
    sesData, ecsData, sqsData, cognitoData,
    amplifyData, cwData, cfnData,
  ] = await Promise.all([
    fetchAppSync(clients.appsync),
    fetchDynamoDB(clients.dynamo),
    fetchLambdas(clients.lambda),
    fetchStepFunctions(clients.sfn),
    fetchSES(clients.ses),
    fetchECS(clients.ecs, clients.ecr),
    fetchSQS(clients.sqs),
    fetchCognito(clients.cognito),
    fetchAmplify(clients.amplify),
    fetchCloudWatch(clients.cw, clients.cwLogs),
    fetchCloudFormation(clients.cfn),
  ]);

  const snapshot = {
    capturedAt: new Date().toISOString(),
    region: REGION,
    appsync:        appsyncData,
    dynamodb:       dynamoData,
    lambdas:        lambdaData,
    stepFunctions:  sfnData,
    ses:            sesData,
    ecs:            ecsData,
    sqs:            sqsData,
    cognito:        cognitoData,
    amplify:        amplifyData,
    cloudwatch:     cwData,
    cloudformation: cfnData,
  };

  console.log('\n📝 Gerando documentação...\n');

  // Snapshot
  write(snapshotPath, JSON.stringify(snapshot, null, 2));

  // Schema GraphQL
  const schemas = Object.values(appsyncData.schemas as Record<string, string>);
  if (schemas.length > 0)
    write(path.join(ROOT, 'appsync/schema.graphql'), schemas[0]);

  // Docs de cada serviço
  write(path.join(ROOT, 'docs/dynamodb-tables.md'), generateDynamoDoc(dynamoData.tables));
  write(path.join(ROOT, 'docs/lambdas.md'),         generateLambdaDoc(lambdaData.functions));
  write(path.join(ROOT, 'docs/ses.md'),              generateSESDoc(sesData));
  write(path.join(ROOT, 'docs/ecs-fargate.md'),      generateECSDoc(ecsData));
  write(path.join(ROOT, 'docs/sqs-queues.md'),       generateSQSDoc(sqsData));
  write(path.join(ROOT, 'docs/cognito.md'),          generateCognitoDoc(cognitoData));
  write(path.join(ROOT, 'docs/amplify.md'),          generateAmplifyDoc(amplifyData));
  write(path.join(ROOT, 'docs/cloudwatch.md'),       generateCloudWatchDoc(cwData));

  // Step Functions (um arquivo por máquina)
  const sfDocs = generateStepFunctionDocs(sfnData.stateMachines);
  for (const [name, content] of Object.entries(sfDocs))
    write(path.join(ROOT, `docs/step-functions/${name}.md`), content);

  // CHANGELOG com diff automático
  const changes = detectChanges(prev, snapshot);
  if (changes.length > 0) {
    const changelogPath = path.join(ROOT, 'CHANGELOG.md');
    const date = new Date().toISOString().split('T')[0];
    const entry = `\n## [Sync ${date}] — ${changes.length} mudança(s) detectada(s)\n\n${changes.join('\n')}\n`;
    if (fs.existsSync(changelogPath)) {
      const existing = fs.readFileSync(changelogPath, 'utf-8');
      const marker = '## [Unreleased]';
      write(changelogPath, existing.includes(marker)
        ? existing.replace(marker, marker + entry)
        : existing + entry);
    }
  }

  console.log('\n🎉 Sincronização concluída!');
  console.log(`   ${Object.keys(snapshot).length - 2} serviços documentados`);
  if (changes.length > 0)
    console.log(`   ${changes.length} mudança(s) registrada(s) no CHANGELOG`);
  console.log('\n  git diff aws-snapshot.json  → o que mudou na AWS');
  console.log('  git diff docs/              → documentação atualizada\n');
}

main().catch(err => {
  console.error('\n❌ Erro no sync:', err.message ?? err);
  process.exit(1);
});
