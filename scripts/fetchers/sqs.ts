import { SQSClient, ListQueuesCommand,
         GetQueueAttributesCommand } from '@aws-sdk/client-sqs';

export interface SQSSnapshot {
  queues: Array<{
    name: string; url: string; arn: string;
    approximateMessages: number; approximateNotVisible: number;
    visibilityTimeout: number; messageRetentionPeriod: number;
    dlqArn?: string; isFifo: boolean;
  }>;
}

export async function fetchSQS(client: SQSClient): Promise<SQSSnapshot> {
  console.log('🔍 Buscando SQS...');
  try {
    const list = await client.send(new ListQueuesCommand({}));
    const queues: SQSSnapshot['queues'] = [];
    for (const url of list.QueueUrls ?? []) {
      const attrs = await client.send(new GetQueueAttributesCommand({
        QueueUrl: url,
        AttributeNames: ['All'],
      }));
      const a = attrs.Attributes ?? {};
      queues.push({
        name: url.split('/').pop() ?? '',
        url,
        arn: a.QueueArn ?? '',
        approximateMessages: parseInt(a.ApproximateNumberOfMessages ?? '0'),
        approximateNotVisible: parseInt(a.ApproximateNumberOfMessagesNotVisible ?? '0'),
        visibilityTimeout: parseInt(a.VisibilityTimeout ?? '30'),
        messageRetentionPeriod: parseInt(a.MessageRetentionPeriod ?? '86400'),
        dlqArn: a.RedrivePolicy ? JSON.parse(a.RedrivePolicy).deadLetterTargetArn : undefined,
        isFifo: url.endsWith('.fifo'),
      });
    }
    console.log(`  ✓ ${queues.length} fila(s) SQS`);
    return { queues };
  } catch (err) {
    console.warn('  ⚠ SQS:', (err as Error).message);
    return { queues: [] };
  }
}
