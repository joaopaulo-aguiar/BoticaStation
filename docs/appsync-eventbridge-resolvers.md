# AppSync — Resolvers EventBridge Scheduler (Campaigns)

> Resolvers AppSync para integração com **AWS EventBridge Scheduler**.
> Operações de agendamento, pausa, retomada e cancelamento de campanhas.
> Runtime: `APPSYNC_JS 1.0.0`.

---

## Pré-requisitos

### Data Sources

| Nome | Tipo | Target |
|---|---|---|
| `CampaignSchedulerLambda` | AWS Lambda | `arn:aws:lambda:sa-east-1:176322301236:function:campaign-scheduler` |
| `ConfigTable` | DynamoDB | `Config_Table` (existente) |

### Lambda — campaign-scheduler

A Lambda `campaign-scheduler` recebe um payload com `{ field, arguments, identity }` e roteia internamente.

**Permissões IAM da Lambda:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "scheduler:CreateSchedule",
        "scheduler:UpdateSchedule",
        "scheduler:DeleteSchedule",
        "scheduler:GetSchedule"
      ],
      "Resource": "arn:aws:scheduler:sa-east-1:176322301236:schedule/marketing-campaigns/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:sa-east-1:176322301236:table/Config_Table"
    },
    {
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": "arn:aws:iam::176322301236:role/EventBridgeSchedulerRole"
    }
  ]
}
```

### EventBridge Scheduler Execution Role

Crie uma role `EventBridgeSchedulerRole` com trust policy para `scheduler.amazonaws.com` e permissão para invocar a Lambda target:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "lambda:InvokeFunction",
      "Resource": "arn:aws:lambda:sa-east-1:176322301236:function:marketing-worker"
    }
  ]
}
```

---

## Estrutura dos Dados — Campaign Settings

Armazenado na `Config_Table`:

| Atributo | Tipo | Exemplo |
|---|---|---|
| PK | String | `SETTINGS` |
| SK | String | `CAMPAIGN_SETTINGS` |
| timezone | String | `America/Sao_Paulo` |
| scheduleGroupName | String | `marketing-campaigns` |
| defaultUtmSource | String | `botica` |
| defaultUtmMedium | String | `email` |

---

## Resolvers — Lambda-backed (CampaignSchedulerLambda)

Todos os resolvers abaixo usam o mesmo padrão de request/response, pois a lógica vive na Lambda.

---

### 1. scheduleCampaign

**Schema**: `scheduleCampaign(id: ID!, scheduledAt: AWSDateTime!): Campaign!`
**Data Source**: `CampaignSchedulerLambda`

> Cria um one-time schedule no EventBridge Scheduler para a campanha.
> Atualiza a campanha no DynamoDB: status → `scheduled`, scheduleArn, scheduledAt.
> Para "Enviar Agora", o frontend envia `scheduledAt = now + 5 seconds`.

#### Request Handler
```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  return {
    operation: 'Invoke',
    payload: {
      field: 'scheduleCampaign',
      arguments: ctx.args,
      identity: ctx.identity,
    },
  };
}
```

#### Response Handler
```javascript
import { util } from '@aws-appsync/utils';

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  if (ctx.result.error) {
    util.error(ctx.result.error, 'LambdaError');
  }
  return ctx.result;
}
```

---

### 2. rescheduleCampaign

**Schema**: `rescheduleCampaign(id: ID!, scheduledAt: AWSDateTime!): Campaign!`
**Data Source**: `CampaignSchedulerLambda`

> Atualiza o horário do schedule existente no EventBridge.
> Atualiza scheduledAt na campanha DynamoDB.

#### Request Handler
```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  return {
    operation: 'Invoke',
    payload: {
      field: 'rescheduleCampaign',
      arguments: ctx.args,
      identity: ctx.identity,
    },
  };
}
```

#### Response Handler
```javascript
import { util } from '@aws-appsync/utils';

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  if (ctx.result.error) {
    util.error(ctx.result.error, 'LambdaError');
  }
  return ctx.result;
}
```

---

### 3. pauseCampaign

**Schema**: `pauseCampaign(id: ID!): Campaign!`
**Data Source**: `CampaignSchedulerLambda`

> Atualiza o schedule no EventBridge para State = `DISABLED`.
> Atualiza status da campanha no DynamoDB para `paused`.

#### Request Handler
```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  return {
    operation: 'Invoke',
    payload: {
      field: 'pauseCampaign',
      arguments: ctx.args,
      identity: ctx.identity,
    },
  };
}
```

#### Response Handler
```javascript
import { util } from '@aws-appsync/utils';

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  if (ctx.result.error) {
    util.error(ctx.result.error, 'LambdaError');
  }
  return ctx.result;
}
```

---

### 4. resumeCampaign

**Schema**: `resumeCampaign(id: ID!): Campaign!`
**Data Source**: `CampaignSchedulerLambda`

> Atualiza o schedule no EventBridge para State = `ENABLED`.
> Atualiza status da campanha no DynamoDB para `scheduled`.

#### Request Handler
```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  return {
    operation: 'Invoke',
    payload: {
      field: 'resumeCampaign',
      arguments: ctx.args,
      identity: ctx.identity,
    },
  };
}
```

#### Response Handler
```javascript
import { util } from '@aws-appsync/utils';

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  if (ctx.result.error) {
    util.error(ctx.result.error, 'LambdaError');
  }
  return ctx.result;
}
```

---

### 5. cancelCampaign

**Schema**: `cancelCampaign(id: ID!): Campaign!`
**Data Source**: `CampaignSchedulerLambda`

> Deleta o schedule do EventBridge (se existir).
> Atualiza status da campanha no DynamoDB para `cancelled`.

#### Request Handler
```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  return {
    operation: 'Invoke',
    payload: {
      field: 'cancelCampaign',
      arguments: ctx.args,
      identity: ctx.identity,
    },
  };
}
```

#### Response Handler
```javascript
import { util } from '@aws-appsync/utils';

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  if (ctx.result.error) {
    util.error(ctx.result.error, 'LambdaError');
  }
  return ctx.result;
}
```

---

### 6. deleteCampaign (atualizado)

**Schema**: `deleteCampaign(id: ID!): Boolean!`
**Data Source**: `CampaignSchedulerLambda`

> ⚠️ Atualização: Agora usa Lambda em vez de DynamoDB direto,
> pois precisa deletar o schedule do EventBridge caso exista.

#### Request Handler
```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  return {
    operation: 'Invoke',
    payload: {
      field: 'deleteCampaign',
      arguments: ctx.args,
      identity: ctx.identity,
    },
  };
}
```

#### Response Handler
```javascript
import { util } from '@aws-appsync/utils';

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  return ctx.result === true || ctx.result?.deleted === true;
}
```

---

### 7. duplicateCampaign

**Schema**: `duplicateCampaign(id: ID!): Campaign!`
**Data Source**: `CampaignSchedulerLambda`

> Copia todos os campos da campanha original (exceto id, status, métricas, scheduleArn).
> Cria uma nova campanha com status `draft` e nome "{original} (cópia)".

#### Request Handler
```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  return {
    operation: 'Invoke',
    payload: {
      field: 'duplicateCampaign',
      arguments: ctx.args,
      identity: ctx.identity,
    },
  };
}
```

#### Response Handler
```javascript
import { util } from '@aws-appsync/utils';

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  if (ctx.result.error) {
    util.error(ctx.result.error, 'LambdaError');
  }
  return ctx.result;
}
```

---

### 8. sendCampaign (legacy → schedule imediato)

**Schema**: `sendCampaign(id: ID!): Campaign!`
**Data Source**: `CampaignSchedulerLambda`

> Mantido por compatibilidade. Internamente cria um schedule para agora + 5 segundos.

#### Request Handler
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

#### Response Handler
```javascript
import { util } from '@aws-appsync/utils';

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  if (ctx.result.error) {
    util.error(ctx.result.error, 'LambdaError');
  }
  return ctx.result;
}
```

---

## Resolvers — DynamoDB Direto (ConfigTable)

### 9. getCampaignSettings

**Schema**: `getCampaignSettings: CampaignSettings`
**Data Source**: `ConfigTable`

#### Request Handler
```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  return {
    operation: 'GetItem',
    key: util.dynamodb.toMapValues({
      PK: 'SETTINGS',
      SK: 'CAMPAIGN_SETTINGS',
    }),
  };
}
```

#### Response Handler
```javascript
export function response(ctx) {
  if (ctx.error) {
    return null;
  }
  // Return defaults if item doesn't exist yet
  if (!ctx.result) {
    return {
      timezone: 'America/Sao_Paulo',
      scheduleGroupName: 'marketing-campaigns',
      defaultUtmSource: null,
      defaultUtmMedium: 'email',
    };
  }
  return ctx.result;
}
```

---

### 10. updateCampaignSettings

**Schema**: `updateCampaignSettings(input: UpdateCampaignSettingsInput!): CampaignSettings!`
**Data Source**: `ConfigTable`

#### Request Handler
```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const input = ctx.args.input;
  const now = util.time.nowISO8601();

  const expParts = ['#updatedAt = :updatedAt'];
  const expNames = { '#updatedAt': 'updatedAt' };
  const expValues = util.dynamodb.toMapValues({ ':updatedAt': now });

  if (input.timezone != null) {
    expParts.push('#timezone = :timezone');
    expNames['#timezone'] = 'timezone';
    Object.assign(expValues, util.dynamodb.toMapValues({ ':timezone': input.timezone }));
  }
  if (input.scheduleGroupName != null) {
    expParts.push('#scheduleGroupName = :scheduleGroupName');
    expNames['#scheduleGroupName'] = 'scheduleGroupName';
    Object.assign(expValues, util.dynamodb.toMapValues({ ':scheduleGroupName': input.scheduleGroupName }));
  }
  if (input.defaultUtmSource !== undefined) {
    expParts.push('#defaultUtmSource = :defaultUtmSource');
    expNames['#defaultUtmSource'] = 'defaultUtmSource';
    Object.assign(expValues, util.dynamodb.toMapValues({ ':defaultUtmSource': input.defaultUtmSource }));
  }
  if (input.defaultUtmMedium !== undefined) {
    expParts.push('#defaultUtmMedium = :defaultUtmMedium');
    expNames['#defaultUtmMedium'] = 'defaultUtmMedium';
    Object.assign(expValues, util.dynamodb.toMapValues({ ':defaultUtmMedium': input.defaultUtmMedium }));
  }

  return {
    operation: 'UpdateItem',
    key: util.dynamodb.toMapValues({
      PK: 'SETTINGS',
      SK: 'CAMPAIGN_SETTINGS',
    }),
    update: {
      expression: `SET ${expParts.join(', ')}`,
      expressionNames: expNames,
      expressionValues: expValues,
    },
  };
}
```

#### Response Handler
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

## Resumo de Data Sources (Atualizado)

| Resolver | Data Source | Tipo |
|---|---|---|
| listCampaigns | ConfigTable | DynamoDB |
| getCampaign | ConfigTable | DynamoDB |
| createCampaign | ConfigTable | DynamoDB |
| updateCampaign | ConfigTable | DynamoDB |
| **deleteCampaign** | **CampaignSchedulerLambda** | **Lambda** ⚠️ |
| **scheduleCampaign** | **CampaignSchedulerLambda** | **Lambda** |
| **rescheduleCampaign** | **CampaignSchedulerLambda** | **Lambda** |
| **sendCampaign** | **CampaignSchedulerLambda** | **Lambda** |
| **pauseCampaign** | **CampaignSchedulerLambda** | **Lambda** ⚠️ |
| **resumeCampaign** | **CampaignSchedulerLambda** | **Lambda** |
| **cancelCampaign** | **CampaignSchedulerLambda** | **Lambda** ⚠️ |
| **duplicateCampaign** | **CampaignSchedulerLambda** | **Lambda** |
| getCampaignSettings | ConfigTable | DynamoDB |
| updateCampaignSettings | ConfigTable | DynamoDB |

> ⚠️ `deleteCampaign`, `pauseCampaign` e `cancelCampaign` foram migrados de DynamoDB direto para Lambda, pois agora precisam interagir com EventBridge Scheduler.

---

## Notas de Implementação

1. **Schedule Name**: Cada schedule usa o pattern `campaign-{campaignId}` como nome. Isso permite encontrar/deletar schedules facilmente.

2. **Schedule Group**: Todas as campanhas são agrupadas no grupo `marketing-campaigns` (configurável em Campaign Settings).

3. **One-time Schedule**: Usa `ScheduleExpression: at(yyyy-MM-ddTHH:mm:ss)` com `FlexibleTimeWindow: OFF`.

4. **Target**: O schedule invoca a Lambda `marketing-worker` com payload:
   ```json
   {
     "campaignId": "uuid-da-campanha",
     "action": "process"
   }
   ```

5. **State Management**: Pausar/Retomar alterna o State do schedule entre `DISABLED` e `ENABLED`.

6. **Idempotência**: A Lambda `campaign-scheduler` sempre verifica o status atual da campanha antes de executar operações.

7. **Cleanup**: Ao deletar ou cancelar uma campanha, o schedule é removido do EventBridge.
