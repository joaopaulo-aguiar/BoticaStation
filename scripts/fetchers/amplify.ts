import { AmplifyClient, ListAppsCommand,
         ListBranchesCommand } from '@aws-sdk/client-amplify';

export interface AmplifySnapshot {
  apps: Array<{
    appId: string; name: string; repository: string;
    defaultDomain: string; platform: string;
    branches: Array<{
      branchName: string; stage: string; enableAutoBuild: boolean;
      lastDeployTime?: string; status?: string;
    }>;
  }>;
}

export async function fetchAmplify(client: AmplifyClient): Promise<AmplifySnapshot> {
  console.log('🔍 Buscando Amplify...');
  try {
    const list = await client.send(new ListAppsCommand({}));
    const apps: AmplifySnapshot['apps'] = [];
    for (const app of list.apps ?? []) {
      const branches = await client.send(new ListBranchesCommand({ appId: app.appId! }));
      apps.push({
        appId: app.appId ?? '',
        name: app.name ?? '',
        repository: app.repository ?? '',
        defaultDomain: app.defaultDomain ?? '',
        platform: app.platform ?? '',
        branches: (branches.branches ?? []).map(b => ({
          branchName: b.branchName ?? '',
          stage: b.stage ?? '',
          enableAutoBuild: b.enableAutoBuild ?? false,
          lastDeployTime: b.activeJobId,
          status: b.framework,
        })),
      });
    }
    console.log(`  ✓ ${apps.length} app(s) Amplify`);
    return { apps };
  } catch (err) {
    console.warn('  ⚠ Amplify:', (err as Error).message);
    return { apps: [] };
  }
}
