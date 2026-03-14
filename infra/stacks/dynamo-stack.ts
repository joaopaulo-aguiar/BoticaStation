import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export class DynamoStack extends cdk.Stack {
  /** Tabela principal — single-table design (Segments, Campaigns, Automations, Settings, etc.) */
  public readonly configTable: dynamodb.Table;
  /** Tabela de eventos de contato — time-series */
  public readonly contactEventTable: dynamodb.Table;
  /** Tabela de contatos */
  public readonly contactTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const isProd = this.node.tryGetContext('env') === 'production';
    const removalPolicy = isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;

    // ── Config_Table (single-table) ───────────────────────────
    this.configTable = new dynamodb.Table(this, 'ConfigTable', {
      tableName: 'Config_Table',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy,
      pointInTimeRecoverySpecification: isProd ? { pointInTimeRecoveryEnabled: true } : undefined,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    // GSIs existentes (adicionar conforme o schema real)
    this.configTable.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ── ContactEvent ──────────────────────────────────────────
    this.contactEventTable = new dynamodb.Table(this, 'ContactEventTable', {
      tableName: 'ContactEvent',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy,
      pointInTimeRecoverySpecification: isProd ? { pointInTimeRecoveryEnabled: true } : undefined,
    });

    // ── Contact ───────────────────────────────────────────────
    this.contactTable = new dynamodb.Table(this, 'ContactTable', {
      tableName: 'Contact',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy,
      pointInTimeRecoverySpecification: isProd ? { pointInTimeRecoveryEnabled: true } : undefined,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    // ── Tags obrigatórias ─────────────────────────────────────
    cdk.Tags.of(this).add('Project', 'BoticaStation');
    cdk.Tags.of(this).add('ManagedBy', 'CDK');

    // ── Outputs cross-stack ───────────────────────────────────
    new cdk.CfnOutput(this, 'ConfigTableName', { value: this.configTable.tableName });
    new cdk.CfnOutput(this, 'ConfigTableArn', { value: this.configTable.tableArn });
    new cdk.CfnOutput(this, 'ContactEventTableName', { value: this.contactEventTable.tableName });
    new cdk.CfnOutput(this, 'ContactEventTableArn', { value: this.contactEventTable.tableArn });
    new cdk.CfnOutput(this, 'ContactTableName', { value: this.contactTable.tableName });
    new cdk.CfnOutput(this, 'ContactTableArn', { value: this.contactTable.tableArn });
  }
}
