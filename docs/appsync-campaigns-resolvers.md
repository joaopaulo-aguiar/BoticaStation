# AppSync — Resolvers DynamoDB Direto (Campaigns)

> Integração direta AppSync ↔ DynamoDB via **JS Resolvers** (runtime `APPSYNC_JS 1.0.0`).
> Operações CRUD básicas de campanhas (create, update, list, get).
> Para operações de agendamento (schedule, pause, resume, cancel, delete, duplicate), veja `appsync-eventbridge-resolvers.md`.
> Cada campo do schema recebe um resolver com request/response handler.

---

## Pré-requisitos

- **Tabela DynamoDB**: `Config_Table`
- **Data Source no AppSync**: Usar o data source existente do tipo **DynamoDB** apontando para `Config_Table`, com role IAM que permita `dynamodb:GetItem`, `PutItem`, `UpdateItem`, `DeleteItem`, `Query`.
- **Nome do Data Source**: usar `ConfigTable` (referenciado abaixo).
- **Para schedule/pause/resume/cancel/delete/duplicate**: Veja `appsync-eventbridge-resolvers.md` — usam Lambda `CampaignSchedulerLambda`.

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
| recipientType | String | `all` / `lifecycleStage` / `segment` |
| recipientFilter | String | Valor do filtro (ex: `lead`, `customer`) — nullable |
| segmentId | String | ID do segmento (quando recipientType = `segment`) — nullable |
| status | String | `draft` / `scheduled` / `sending` / `sent` / `paused` / `cancelled` |
| scheduledAt | String | ISO 8601 (nullable) |
| sentAt | String | ISO 8601 (nullable) |
| completedAt | String | ISO 8601 (nullable) |
| metrics | Map | `{ sent, delivered, opened, clicked, bounced, complained, unsubscribed }` |
| configurationSet | String | Nome do Configuration Set SES (nullable) |
| scheduleArn | String | ARN do schedule no EventBridge (nullable) |
| timezone | String | Fuso horário do agendamento (nullable) |
| utmParams | String | AWSJSON com parâmetros UTM (nullable) |
| estimatedRecipients | Number | Contagem estimada de destinatários (nullable) |
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
    recipientType: input.recipientType ?? 'all',
    recipientFilter: input.recipientFilter ?? null,
    segmentId: input.segmentId ?? null,
    status: 'draft',
    scheduledAt: input.scheduledAt ?? null,
    sentAt: null,
    completedAt: null,
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
    scheduleArn: null,
    timezone: null,
    utmParams: input.utmParams ?? null,
    estimatedRecipients: null,
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
  if (input.recipientType != null) {
    expParts.push('#recipientType = :recipientType');
    expNames['#recipientType'] = 'recipientType';
    Object.assign(expValues, util.dynamodb.toMapValues({ ':recipientType': input.recipientType }));
  }
  if (input.segmentId !== undefined) {
    expParts.push('#segmentId = :segmentId');
    expNames['#segmentId'] = 'segmentId';
    Object.assign(expValues, util.dynamodb.toMapValues({ ':segmentId': input.segmentId }));
  }
  if (input.utmParams !== undefined) {
    expParts.push('#utmParams = :utmParams');
    expNames['#utmParams'] = 'utmParams';
    Object.assign(expValues, util.dynamodb.toMapValues({ ':utmParams': input.utmParams }));
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

> ⚠️ **MIGRADO PARA LAMBDA** — Veja `appsync-eventbridge-resolvers.md`.
> A operação de delete agora usa `CampaignSchedulerLambda` para também remover o schedule do EventBridge.

---

## 6. sendCampaign

> ⚠️ **MIGRADO PARA LAMBDA** — Veja `appsync-eventbridge-resolvers.md`.
> Agora cria um schedule imediato (+5s) no EventBridge em vez de enviar diretamente.

---

## 7. pauseCampaign

> ⚠️ **MIGRADO PARA LAMBDA** — Veja `appsync-eventbridge-resolvers.md`.
> Agora pausa o schedule no EventBridge.

---

## 8. cancelCampaign

> ⚠️ **MIGRADO PARA LAMBDA** — Veja `appsync-eventbridge-resolvers.md`.
> Agora remove o schedule do EventBridge.

---

## Resumo de Data Sources

| Resolver | Data Source | Tipo |
|---|---|---|
| listCampaigns | ConfigTable | DynamoDB |
| getCampaign | ConfigTable | DynamoDB |
| createCampaign | ConfigTable | DynamoDB |
| updateCampaign | ConfigTable | DynamoDB |
| deleteCampaign | CampaignSchedulerLambda | Lambda ⚠️ |
| scheduleCampaign | CampaignSchedulerLambda | Lambda |
| rescheduleCampaign | CampaignSchedulerLambda | Lambda |
| sendCampaign | CampaignSchedulerLambda | Lambda |
| pauseCampaign | CampaignSchedulerLambda | Lambda ⚠️ |
| resumeCampaign | CampaignSchedulerLambda | Lambda |
| cancelCampaign | CampaignSchedulerLambda | Lambda ⚠️ |
| duplicateCampaign | CampaignSchedulerLambda | Lambda |
| getCampaignSettings | ConfigTable | DynamoDB |
| updateCampaignSettings | ConfigTable | DynamoDB |

> Veja `appsync-eventbridge-resolvers.md` para os resolvers Lambda.

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
