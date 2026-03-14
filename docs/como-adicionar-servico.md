# Como adicionar um novo serviço AWS ao projeto

## Checklist obrigatório (siga esta ordem)

### 1. Stack CDK
Crie `/infra/stacks/NOME-stack.ts` com o construct do serviço.
Importe e instancie no `/infra/bin/app.ts`.
Passe referências necessárias para outras stacks via props.

### 2. Fetcher de documentação
Crie `/scripts/fetchers/NOME.ts` que:
- Importa o cliente AWS SDK v3 do serviço
- Exporta uma função `fetchNOME(client): Promise<NOMESnapshot>`
- Define e exporta a interface TypeScript do snapshot
- Trata erros com try/catch e avisa sem interromper o sync

Modelo mínimo:
```typescript
import { XxxClient, ListXxxCommand } from '@aws-sdk/client-xxx';

export interface XxxSnapshot {
  items: Array<{ name: string; [key: string]: unknown }>;
}

export async function fetchXxx(client: XxxClient): Promise<XxxSnapshot> {
  try {
    const res = await client.send(new ListXxxCommand({}));
    return { items: res.Items ?? [] };
  } catch (err) {
    console.warn('⚠ Erro ao buscar Xxx:', (err as Error).message);
    return { items: [] };
  }
}
```

### 3. Generator de documentação
Crie `/scripts/generators/NOME-doc.ts` que:
- Recebe o snapshot do fetcher
- Retorna uma string Markdown formatada
- Começa com `autoHeader('sync-aws-docs')`
- Tem uma seção por recurso com tabela de propriedades

### 4. Registro no sync principal
Em `/scripts/sync-aws-docs.ts`:
- Importe o fetcher e o generator
- Adicione o cliente na lista de imports
- Adicione a chamada no `Promise.all` de fetches
- Adicione a chamada do generator e o `write()` do arquivo
- Adicione campos ao snapshot para detecção de mudanças no CHANGELOG

### 5. Permissões na DocsSyncRole
No console AWS → IAM → DocsSyncRole → Add permissions.
Adicione somente ações de leitura (`List*`, `Describe*`, `Get*`)
para o novo serviço. Nunca dar `*` ou permissões de escrita.

### 6. Documentação do projeto
- Adicione seção no `.github/copilot-instructions.md`
- Crie `/docs/adr/NNN-decisao-NOME.md` documentando por que este
  serviço foi escolhido, alternativas consideradas e consequências
- Adicione o arquivo gerado na lista de "arquivos automáticos" do
  copilot-instructions.md

### 7. Testes
- Adicione mocks do novo SDK em `__tests__/setup.ts`
- Crie ao menos um teste unitário para os handlers que usam o serviço

## Serviços já integrados
| Serviço        | Fetcher                    | Documento gerado          |
|----------------|----------------------------|---------------------------|
| AppSync        | fetchers/appsync.ts        | appsync/schema.graphql    |
| DynamoDB       | fetchers/dynamodb.ts       | docs/dynamodb-tables.md   |
| Lambda         | fetchers/lambda.ts         | docs/lambdas.md           |
| Step Functions | fetchers/stepfunctions.ts  | docs/step-functions/      |
| SES            | fetchers/ses.ts            | docs/ses.md               |
| ECS/Fargate    | fetchers/ecs.ts            | docs/ecs-fargate.md       |
| SQS            | fetchers/sqs.ts            | docs/sqs-queues.md        |
| Cognito        | fetchers/cognito.ts        | docs/cognito.md           |
| Amplify        | fetchers/amplify.ts        | docs/amplify.md           |
| CloudWatch     | fetchers/cloudwatch.ts     | docs/cloudwatch.md        |
| CloudFormation | fetchers/cloudformation.ts | (parte do snapshot)       |

## Próximos candidatos comuns
EventBridge, SNS, API Gateway REST, ElastiCache, Secrets Manager,
Parameter Store, WAF, Route53, Certificate Manager.
