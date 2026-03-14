/**
 * Setup global de testes — mocks de todos os serviços AWS.
 *
 * Usa aws-sdk-client-mock para interceptar chamadas ao SDK.
 * Adicione mocks de novos serviços aqui ao integrá-los.
 */

import { mockClient } from 'aws-sdk-client-mock';

// ── Clientes AWS ──────────────────────────────────────────────
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { SFNClient } from '@aws-sdk/client-sfn';
import { SESClient } from '@aws-sdk/client-ses';
import { SQSClient } from '@aws-sdk/client-sqs';
import { ECSClient } from '@aws-sdk/client-ecs';
import { ECRClient } from '@aws-sdk/client-ecr';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { AppSyncClient } from '@aws-sdk/client-appsync';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';

// ── Mocks de clientes ─────────────────────────────────────────
export const dynamoMock = mockClient(DynamoDBClient);
export const dynamoDocMock = mockClient(DynamoDBDocumentClient);
export const lambdaMock = mockClient(LambdaClient);
export const sfnMock = mockClient(SFNClient);
export const sesMock = mockClient(SESClient);
export const sqsMock = mockClient(SQSClient);
export const ecsMock = mockClient(ECSClient);
export const ecrMock = mockClient(ECRClient);
export const cognitoMock = mockClient(CognitoIdentityProviderClient);
export const appsyncMock = mockClient(AppSyncClient);
export const amplifyMock = mockClient(AmplifyClient);
export const cloudwatchMock = mockClient(CloudWatchClient);
export const cloudwatchLogsMock = mockClient(CloudWatchLogsClient);
export const cloudformationMock = mockClient(CloudFormationClient);

// ── Reset de todos os mocks entre testes ──────────────────────
beforeEach(() => {
  dynamoMock.reset();
  dynamoDocMock.reset();
  lambdaMock.reset();
  sfnMock.reset();
  sesMock.reset();
  sqsMock.reset();
  ecsMock.reset();
  ecrMock.reset();
  cognitoMock.reset();
  appsyncMock.reset();
  amplifyMock.reset();
  cloudwatchMock.reset();
  cloudwatchLogsMock.reset();
  cloudformationMock.reset();
});

// ── Variáveis de ambiente para testes ─────────────────────────
process.env.TABLE_NAME = 'Config_Table';
process.env.CONTACT_EVENT_TABLE = 'ContactEvent';
process.env.CONTACT_TABLE = 'Contact';
process.env.AWS_REGION = 'sa-east-1';
process.env.STAGE = 'test';
process.env.SQS_QUEUE_URL = 'https://sqs.sa-east-1.amazonaws.com/000000000000/test-queue';
process.env.COGNITO_USER_POOL_ID = 'sa-east-1_TestPool';
process.env.COGNITO_CLIENT_ID = 'test-client-id';
process.env.SES_FROM_EMAIL = 'test@example.com';
