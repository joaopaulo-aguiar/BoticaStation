import { CloudWatchClient, DescribeAlarmsCommand,
         ListDashboardsCommand } from '@aws-sdk/client-cloudwatch';
import { CloudWatchLogsClient, DescribeLogGroupsCommand } from '@aws-sdk/client-cloudwatch-logs';

export interface CloudWatchSnapshot {
  alarms: Array<{
    name: string; state: string; metric: string;
    threshold: number; comparisonOperator: string; namespace: string;
  }>;
  logGroups: Array<{
    name: string; retentionDays: number; storedBytes: number;
  }>;
  dashboards: string[];
}

export async function fetchCloudWatch(
  cw: CloudWatchClient,
  logs: CloudWatchLogsClient
): Promise<CloudWatchSnapshot> {
  console.log('🔍 Buscando CloudWatch...');
  try {
    const alarmsRes = await cw.send(new DescribeAlarmsCommand({ AlarmTypes: ['MetricAlarm'] }));
    const logsRes   = await logs.send(new DescribeLogGroupsCommand({}));
    const dashRes   = await cw.send(new ListDashboardsCommand({}));

    const result: CloudWatchSnapshot = {
      alarms: (alarmsRes.MetricAlarms ?? []).map(a => ({
        name: a.AlarmName ?? '',
        state: a.StateValue ?? '',
        metric: a.MetricName ?? '',
        threshold: a.Threshold ?? 0,
        comparisonOperator: a.ComparisonOperator ?? '',
        namespace: a.Namespace ?? '',
      })),
      logGroups: (logsRes.logGroups ?? []).map(g => ({
        name: g.logGroupName ?? '',
        retentionDays: g.retentionInDays ?? 0,
        storedBytes: g.storedBytes ?? 0,
      })),
      dashboards: (dashRes.DashboardEntries ?? []).map(d => d.DashboardName ?? ''),
    };

    console.log(`  ✓ ${result.alarms.length} alarme(s), ${result.logGroups.length} grupo(s) de log`);
    return result;
  } catch (err) {
    console.warn('  ⚠ CloudWatch:', (err as Error).message);
    return { alarms: [], logGroups: [], dashboards: [] };
  }
}
