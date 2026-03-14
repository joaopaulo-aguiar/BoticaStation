import { LambdaClient, ListFunctionsCommand,
         GetFunctionCommand } from '@aws-sdk/client-lambda';

export interface LambdaFunctionInfo {
  functionName: string;
  runtime: string;
  handler: string;
  memorySize: number;
  timeout: number;
  codeSize: number;
  lastModified: string;
  description: string;
  layers: string[];
  environment: Record<string, string>;
}

export interface LambdaSnapshot {
  functions: LambdaFunctionInfo[];
}

export async function fetchLambdas(client: LambdaClient): Promise<LambdaSnapshot> {
  console.log('🔍 Buscando Lambda...');
  try {
    const functions: LambdaFunctionInfo[] = [];
    let marker: string | undefined;

    do {
      const res = await client.send(new ListFunctionsCommand({ Marker: marker }));
      for (const fn of res.Functions ?? []) {
        functions.push({
          functionName: fn.FunctionName ?? '',
          runtime: fn.Runtime ?? '',
          handler: fn.Handler ?? '',
          memorySize: fn.MemorySize ?? 128,
          timeout: fn.Timeout ?? 3,
          codeSize: fn.CodeSize ?? 0,
          lastModified: fn.LastModified ?? '',
          description: fn.Description ?? '',
          layers: (fn.Layers ?? []).map(l => l.Arn ?? ''),
          environment: fn.Environment?.Variables ?? {},
        });
      }
      marker = res.NextMarker;
    } while (marker);

    console.log(`  ✓ ${functions.length} função(ões) Lambda`);
    return { functions };
  } catch (err) {
    console.warn('  ⚠ Lambda:', (err as Error).message);
    return { functions: [] };
  }
}
