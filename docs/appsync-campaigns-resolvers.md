# AppSync — Resolvers DynamoDB Direto (Campaigns)

> Integração direta AppSync ↔ DynamoDB via **JS Resolvers** (runtime `APPSYNC_JS 1.0.0`).
> Sem Lambda (exceto `sendCampaign` que requer Lambda para orquestrar envio SES).
> Cada campo do schema recebe um resolver com request/response handler.

---

## Pré-requisitos

- **Tabela DynamoDB**: `Config_Table`
- **Data Source no AppSync**: Usar o data source existente do tipo **DynamoDB** apontando para `Config_Table`, com role IAM que permita `dynamodb:GetItem`, `PutItem`, `UpdateItem`, `DeleteItem`, `Query`.
- **Nome do Data Source**: usar `ConfigTable` (referenciado abaixo).
- **Para sendCampaign**: Criar data source do tipo **Lambda** apontando para a função de envio de campanhas.

---

## Estrutura da Tabela (Config_Table)

| Atributo | Tipo | Descrição |
|---|---|---|
| PK | String | `CAMPAIGN` (fixo para listar todas) |
| SK | String | `CAMPAIGN#{uuid}` |
| id | String | UUID |
| name | String | Nome da campanha |
| subject | String | Assunto do e-mail |
| templateName | String | Nome do template SES |
| senderProfileId | String | ID do perfil de remetente |
| recipientFilter | String | Filtro de destinatários (JSON) |
| status | String | `draft` / `scheduled` / `sending` / `sent` / `paused` / `cancelled` |
| scheduledAt | String | ISO 8601 (nullable) |
| sentAt | String | ISO 8601 (nullable) |
| metrics | Map | `{ sent, delivered, opened, clicked, bounced, complained, unsubscribed }` |
| configurationSet | String | Nome do Configuration Set SES (nullable) |
| createdAt | String | ISO 8601 |
| updatedAt | String | ISO 8601 |
| createdBy | String | Cognito sub/email |

---

## 1. listCampaigns

**Schema**: `listCampaigns: [Campaign!]!`
**Data Source**: `ConfigTable`

### Request Handler
```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  return {
    operation: 'Query',
    query: {
      expression: 'PK = :pk',
      expressionValues: util.dynamodb.toMapValues({ ':pk': 'CAMPAIGN' }),
    },
    scanIndexForward: false,
  };
}
```

### Response Handler
```javascript
import { util } from '@aws-appsync/utils';

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  return ctx.result.items ?? [];
}
```

---

## 2. getCampaign

**Schema**: `getCampaign(id: ID!): Campaign`
**Data Source**: `ConfigTable`

### Request Handler
```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  return {
    operation: 'GetItem',
    key: util.dynamodb.toMapValues({
      PK: 'CAMPAIGN',
      SK: `CAMPAIGN#${ctx.args.id}`,
    }),
  };
}
```

### Response Handler
```javascript
export function response(ctx) {
  return ctx.result;
}
```

---

## 3. createCampaign

**Schema**: `createCampaign(input: CreateCampaignInput!): Campaign!`
**Data Source**: `ConfigTable`

### Request Handler
```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const id = util.autoId();
  const now = util.time.nowISO8601();
  const caller = ctx.identity?.claims?.email ?? ctx.identity?.sub ?? 'system';
  const input = ctx.args.input;

  const item = {
    PK: 'CAMPAIGN',
    SK: `CAMPAIGN#${id}`,
    id,
    name: input.name,
    subject: input.subject,
    templateName: input.templateName,
    senderProfileId: input.senderProfileId,
    recipientFilter: input.recipientFilter ?? null,
    status: 'draft',
    scheduledAt: input.scheduledAt ?? null,
    sentAt: null,
    metrics: {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      complained: 0,
      unsubscribed: 0,
    },
    configurationSet: input.configurationSet ?? null,
    createdAt: now,
    updatedAt: now,
    createdBy: caller,
  };

  return {
    operation: 'PutItem',
    key: util.dynamodb.toMapValues({ PK: item.PK, SK: item.SK }),
    attributeValues: util.dynamodb.toMapValues(item),
  };
}
```

### Response Handler
```javascript
import { util } from '@aws-appsync/utils';

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  return ctx.result;
}
```

---

## 4. updateCampaign

**Schema**: `updateCampaign(id: ID!, input: UpdateCampaignInput!): Campaign!`
**Data Source**: `ConfigTable`

### Request Handler
```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const id = ctx.args.id;
  const input = ctx.args.input;
  const now = util.time.nowISO8601();

  const expParts = ['#updatedAt = :updatedAt'];
  const expNames = { '#updatedAt': 'updatedAt' };
  const expValues = util.dynamodb.toMapValues({ ':updatedAt': now });

  if (input.name != null) {
    expParts.push('#name = :name');
    expNames['#name'] = 'name';
    Object.assign(expValues, util.dynamodb.toMapValues({ ':name': input.name }));
  }
  if (input.subject != null) {
    expParts.push('#subject = :subject');
    expNames['#subject'] = 'subject';
    Object.assign(expValues, util.dynamodb.toMapValues({ ':subject': input.subject }));
  }
  if (input.templateName != null) {
    expParts.push('#templateName = :templateName');
    expNames['#templateName'] = 'templateName';
    Object.assign(expValues, util.dynamodb.toMapValues({ ':templateName': input.templateName }));
  }
  if (input.senderProfileId != null) {
    expParts.push('#senderProfileId = :senderProfileId');
    expNames['#senderProfileId'] = 'senderProfileId';
    Object.assign(expValues, util.dynamodb.toMapValues({ ':senderProfileId': input.senderProfileId }));
  }
  if (input.recipientFilter != null) {
    expParts.push('#recipientFilter = :recipientFilter');
    expNames['#recipientFilter'] = 'recipientFilter';
    Object.assign(expValues, util.dynamodb.toMapValues({ ':recipientFilter': input.recipientFilter }));
  }
  if (input.scheduledAt != null) {
    expParts.push('#scheduledAt = :scheduledAt');
    expNames['#scheduledAt'] = 'scheduledAt';
    Object.assign(expValues, util.dynamodb.toMapValues({ ':scheduledAt': input.scheduledAt }));
  }
  if (input.configurationSet != null) {
    expParts.push('#configurationSet = :configurationSet');
    expNames['#configurationSet'] = 'configurationSet';
    Object.assign(expValues, util.dynamodb.toMapValues({ ':configurationSet': input.configurationSet }));
  }

  return {
    operation: 'UpdateItem',
    key: util.dynamodb.toMapValues({
      PK: 'CAMPAIGN',
      SK: `CAMPAIGN#${id}`,
    }),
    update: {
      expression: `SET ${expParts.join(', ')}`,
      expressionNames: expNames,
      expressionValues: expValues,
    },
    condition: {
      expression: 'attribute_exists(PK)',
    },
  };
}
```

### Response Handler
```javascript
import { util } from '@aws-appsync/utils';

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  return ctx.result;
}
```

---

## 5. deleteCampaign

**Schema**: `deleteCampaign(id: ID!): Boolean!`
**Data Source**: `ConfigTable`

### Request Handler
```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  return {
    operation: 'DeleteItem',
    key: util.dynamodb.toMapValues({
      PK: 'CAMPAIGN',
      SK: `CAMPAIGN#${ctx.args.id}`,
    }),
    condition: {
      expression: 'attribute_exists(PK)',
    },
  };
}
```

### Response Handler
```javascript
import { util } from '@aws-appsync/utils';

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  return true;
}
```

---

## 6. sendCampaign

**Schema**: `sendCampaign(id: ID!): Campaign!`
**Data Source**: `SendCampaignLambda` (Lambda)

> ⚠️ Esta mutation requer uma **Lambda** pois precisa:
> 1. Buscar a campanha no DynamoDB
> 2. Buscar os contatos pelo filtro
> 3. Enviar e-mails via SES usando o template e configuration set
> 4. Atualizar o status da campanha para `sending`
>
> Alternativamente, pode usar **Pipeline Resolver** com dois steps DynamoDB
> (get campaign → update status) e um step Lambda (envio SES).

### Request Handler
```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  return {
    operation: 'Invoke',
    payload: {
      field: 'sendCampaign',
      arguments: ctx.args,
      identity: ctx.identity,
    },
  };
}
```

### Response Handler
```javascript
import { util } from '@aws-appsync/utils';

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  return ctx.result;
}
```

---

## 7. pauseCampaign

**Schema**: `pauseCampaign(id: ID!): Campaign!`
**Data Source**: `ConfigTable`

> Atualiza o status para `paused`. Só permite pausar campanhas com status `sending` ou `scheduled`.

### Request Handler
```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const now = util.time.nowISO8601();

  return {
    operation: 'UpdateItem',
    key: util.dynamodb.toMapValues({
      PK: 'CAMPAIGN',
      SK: `CAMPAIGN#${ctx.args.id}`,
    }),
    update: {
      expression: 'SET #status = :status, #updatedAt = :updatedAt',
      expressionNames: {
        '#status': 'status',
        '#updatedAt': 'updatedAt',
      },
      expressionValues: util.dynamodb.toMapValues({
        ':status': 'paused',
        ':updatedAt': now,
        ':sending': 'sending',
        ':scheduled': 'scheduled',
      }),
    },
    condition: {
      expression: 'attribute_exists(PK) AND (#status = :sending OR #status = :scheduled)',
      expressionNames: { '#status': 'status' },
    },
  };
}
```

### Response Handler
```javascript
import { util } from '@aws-appsync/utils';

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  return ctx.result;
}
```

---

## 8. cancelCampaign

**Schema**: `cancelCampaign(id: ID!): Campaign!`
**Data Source**: `ConfigTable`

> Atualiza o status para `cancelled`. Só permite cancelar campanhas que não estejam `sent` ou `cancelled`.

### Request Handler
```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const now = util.time.nowISO8601();

  return {
    operation: 'UpdateItem',
    key: util.dynamodb.toMapValues({
      PK: 'CAMPAIGN',
      SK: `CAMPAIGN#${ctx.args.id}`,
    }),
    update: {
      expression: 'SET #status = :status, #updatedAt = :updatedAt',
      expressionNames: {
        '#status': 'status',
        '#updatedAt': 'updatedAt',
      },
      expressionValues: util.dynamodb.toMapValues({
        ':status': 'cancelled',
        ':updatedAt': now,
        ':sent': 'sent',
        ':cancelled': 'cancelled',
      }),
    },
    condition: {
      expression: 'attribute_exists(PK) AND #status <> :sent AND #status <> :cancelled',
      expressionNames: { '#status': 'status' },
    },
  };
}
```

### Response Handler
```javascript
import { util } from '@aws-appsync/utils';

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  return ctx.result;
}
```

---

## Resumo de Data Sources

| Resolver | Data Source | Tipo |
|---|---|---|
| listCampaigns | ConfigTable | DynamoDB |
| getCampaign | ConfigTable | DynamoDB |
| createCampaign | ConfigTable | DynamoDB |
| updateCampaign | ConfigTable | DynamoDB |
| deleteCampaign | ConfigTable | DynamoDB |
| sendCampaign | SendCampaignLambda | Lambda |
| pauseCampaign | ConfigTable | DynamoDB |
| cancelCampaign | ConfigTable | DynamoDB |

---

## Notas de Implementação

1. **PK/SK Pattern**: Todas as campanhas usam `PK = "CAMPAIGN"` e `SK = "CAMPAIGN#{id}"` na `Config_Table`, seguindo o padrão single-table design existente.

2. **sendCampaign**: É o único resolver que precisa de Lambda, pois envolve:
   - Leitura da campanha
   - Query de contatos (filtro)
   - Chamadas SES em lote (SendBulkTemplatedEmail)
   - Atualização de status e métricas

3. **Condition Expressions**: `pauseCampaign` e `cancelCampaign` usam condition expressions para garantir transições de status válidas (ex: só pode pausar se estiver `sending` ou `scheduled`).

4. **Metrics**: As métricas iniciais são zeradas no `createCampaign`. A atualização das métricas reais deve ser feita por eventos SNS/SES → Lambda → DynamoDB (via SES event notifications no Configuration Set).

5. **SES Tags (Message Tags)**:
   - **Restrição SES**: Tag names e values só aceitam caracteres ASCII alfanuméricos + `_`, `-`, `.`, `@`. Sem espaços, sem acentos.
   - **E-mail de teste** (`sendTestEmail`): O frontend envia `tags: '{"campanha":"Teste_de_Envio"}'`. A Lambda deve sanitizar os valores antes de enviar ao SES.
   - **Envio de campanha** (`sendCampaign`): A Lambda de envio deve incluir `Tags: [{ Name: "campanha", Value: sanitize(campaign.name) }]` em cada chamada SES.
   - **Função de sanitização** para a Lambda:
     ```javascript
     function sanitizeSesTagValue(value) {
       return value
         .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
         .replace(/\s+/g, '_')                              // espaços → _
         .replace(/[^a-zA-Z0-9_\-\.@]/g, '')               // remove chars inválidos
         .slice(0, 256);                                     // limite SES
     }
     ```
   - O campo `tags` é do tipo `AWSJSON` (string JSON com pares chave-valor). Exemplo: `{"campanha":"Black_Friday_2025","tipo":"promocional"}`.
