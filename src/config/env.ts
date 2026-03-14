/**
 * Variáveis de ambiente tipadas — nunca usar process.env diretamente.
 * Toda variável nova deve ser adicionada aqui.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`❌ Variável de ambiente obrigatória não definida: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const env = {
  // ── Região ──────────────────────────────────────────────────
  region: optional('AWS_REGION', 'sa-east-1'),

  // ── DynamoDB ────────────────────────────────────────────────
  configTableName:       optional('TABLE_NAME', 'Config_Table'),
  contactEventTableName: optional('CONTACT_EVENT_TABLE', 'ContactEvent'),
  contactTableName:      optional('CONTACT_TABLE', 'Contact'),
  dynamoEndpoint:        process.env.DYNAMODB_ENDPOINT,

  // ── SQS ─────────────────────────────────────────────────────
  sqsQueueUrl: optional('SQS_QUEUE_URL', ''),

  // ── Cognito ─────────────────────────────────────────────────
  cognitoUserPoolId: optional('COGNITO_USER_POOL_ID', ''),
  cognitoClientId:   optional('COGNITO_CLIENT_ID', ''),

  // ── SES ─────────────────────────────────────────────────────
  sesFromEmail: optional('SES_FROM_EMAIL', ''),

  // ── Step Functions / Scheduler ──────────────────────────────
  scheduleGroup:    optional('SCHEDULE_GROUP', 'marketing-campaigns'),
  targetLambdaArn:  optional('TARGET_LAMBDA_ARN', ''),
  schedulerRoleArn: optional('SCHEDULER_ROLE_ARN', ''),
  sfnRoleArn:       optional('SFN_ROLE_ARN', ''),

  // ── ECS / Fargate ───────────────────────────────────────────
  clusterName: optional('ECS_CLUSTER_NAME', ''),

  // ── Ambiente ────────────────────────────────────────────────
  stage: optional('STAGE', 'dev'),
  isProduction: optional('STAGE', 'dev') === 'production',
} as const;
