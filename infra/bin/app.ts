#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DynamoStack } from '../stacks/dynamo-stack';
import { AppSyncStack } from '../stacks/appsync-stack';
import { WorkflowStack } from '../stacks/workflow-stack';
import { SESStack } from '../stacks/ses-stack';
import { ECSStack } from '../stacks/ecs-stack';
import { SQSStack } from '../stacks/sqs-stack';
import { CognitoStack } from '../stacks/cognito-stack';
import { MonitoringStack } from '../stacks/monitoring-stack';

const app = new cdk.App();

const env: cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? 'sa-east-1',
};

const tags = { Project: 'BoticaStation', ManagedBy: 'CDK' };

// ── Stacks de fundação ──────────────────────────────────────
const dynamoStack = new DynamoStack(app, 'BoticaStation-Dynamo', { env, tags });
const cognitoStack = new CognitoStack(app, 'BoticaStation-Cognito', { env, tags });
const sqsStack = new SQSStack(app, 'BoticaStation-SQS', { env, tags });
const sesStack = new SESStack(app, 'BoticaStation-SES', { env, tags });

// ── Stacks que dependem das anteriores ──────────────────────
const appsyncStack = new AppSyncStack(app, 'BoticaStation-AppSync', { env, tags });
appsyncStack.addDependency(dynamoStack);
appsyncStack.addDependency(cognitoStack);

const workflowStack = new WorkflowStack(app, 'BoticaStation-Workflows', { env, tags });
workflowStack.addDependency(dynamoStack);
workflowStack.addDependency(sqsStack);

const ecsStack = new ECSStack(app, 'BoticaStation-ECS', { env, tags });
ecsStack.addDependency(dynamoStack);
ecsStack.addDependency(sqsStack);

// ── Monitoramento (depende de todas) ────────────────────────
const monitoringStack = new MonitoringStack(app, 'BoticaStation-Monitoring', { env, tags });
monitoringStack.addDependency(dynamoStack);
monitoringStack.addDependency(sqsStack);
monitoringStack.addDependency(ecsStack);

app.synth();
