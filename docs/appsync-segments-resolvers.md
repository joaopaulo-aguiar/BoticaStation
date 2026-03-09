# AppSync — Resolvers DynamoDB Direto (Segments)

> Integração direta AppSync ↔ DynamoDB via **JS Resolvers** (runtime `APPSYNC_JS 1.0.0`).
> Sem Lambda. Cada campo do schema recebe um resolver com request/response handler.

---

## Pré-requisitos

- **Tabela DynamoDB**: `Config_Table` (compartilhada com Campaigns, Sender Profiles)
- **Data Source no AppSync**: Usar o data source existente `ConfigTable`, com role IAM que permita `dynamodb:GetItem`, `PutItem`, `UpdateItem`, `DeleteItem`, `Query`.
- **Nome do Data Source**: usar `ConfigTable` (referenciado abaixo).

---

## Estrutura na Tabela (Config_Table)

| Atributo | Tipo | Descrição |
|---|---|---|
| PK | String | `SEGMENT` (fixo para listar todos) |
| SK | String | `SEGMENT#{uuid}` |
| id | String | UUID |
| name | String | Nome do segmento |
| description | String | Descrição opcional |
| conditionLogic | String | `AND` ou `OR` |
| conditions | List | Array de `{ field, operator, value }` |
| contactCount | Number | Contagem estimada de contatos (nullable) |
| lastCountAt | String | Data da última contagem (nullable) |
| createdAt | String | ISO 8601 |
| updatedAt | String | ISO 8601 |
| createdBy | String | Cognito sub/email |

### Exemplo de Item

```json
{
  "PK": "SEGMENT",
  "SK": "SEGMENT#abc123",
  "id": "abc123",
  "name": "Leads com tag Pets",
  "description": "Contatos lead com tag Pets para campanha pet",
  "conditionLogic": "AND",
  "conditions": [
    { "field": "lifecycleStage", "operator": "equals", "value": "lead" },
    { "field": "tags", "operator": "contains", "value": "Pets" }
  ],
  "contactCount": null,
  "lastCountAt": null,
  "createdAt": "2025-06-15T10:00:00.000Z",
  "updatedAt": "2025-06-15T10:00:00.000Z",
  "createdBy": "admin@botica.com.br"
}
```

---

## 1. listSegments

**Schema**: `listSegments: [Segment!]!`
**Data Source**: `ConfigTable`

### Request Handler
```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  return {
    operation: 'Query',
    query: {
      expression: 'PK = :pk',
      expressionValues: util.dynamodb.toMapValues({ ':pk': 'SEGMENT' }),
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

## 2. getSegment

**Schema**: `getSegment(id: ID!): Segment`
**Data Source**: `ConfigTable`

### Request Handler
```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  return {
    operation: 'GetItem',
    key: util.dynamodb.toMapValues({
      PK: 'SEGMENT',
      SK: `SEGMENT#${ctx.args.id}`,
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

## 3. createSegment

**Schema**: `createSegment(input: CreateSegmentInput!): Segment!`
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
    PK: 'SEGMENT',
    SK: `SEGMENT#${id}`,
    id,
    name: input.name,
    description: input.description ?? null,
    conditionLogic: input.conditionLogic ?? 'AND',
    conditions: input.conditions,
    contactCount: null,
    lastCountAt: null,
    createdAt: now,
    updatedAt: now,
    createdBy: caller,
  };

  return {
    operation: 'PutItem',
    key: util.dynamodb.toMapValues({ PK: item.PK, SK: item.SK }),
    attributeValues: util.dynamodb.toMapValues(item),
    condition: {
      expression: 'attribute_not_exists(PK)',
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

## 4. updateSegment

**Schema**: `updateSegment(id: ID!, input: UpdateSegmentInput!): Segment!`
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
  if (input.description !== undefined) {
    expParts.push('#description = :description');
    expNames['#description'] = 'description';
    Object.assign(expValues, util.dynamodb.toMapValues({ ':description': input.description }));
  }
  if (input.conditionLogic != null) {
    expParts.push('#conditionLogic = :conditionLogic');
    expNames['#conditionLogic'] = 'conditionLogic';
    Object.assign(expValues, util.dynamodb.toMapValues({ ':conditionLogic': input.conditionLogic }));
  }
  if (input.conditions != null) {
    expParts.push('#conditions = :conditions');
    expNames['#conditions'] = 'conditions';
    Object.assign(expValues, util.dynamodb.toMapValues({ ':conditions': input.conditions }));
  }

  return {
    operation: 'UpdateItem',
    key: util.dynamodb.toMapValues({
      PK: 'SEGMENT',
      SK: `SEGMENT#${id}`,
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

## 5. deleteSegment

**Schema**: `deleteSegment(id: ID!): Boolean!`
**Data Source**: `ConfigTable`

### Request Handler
```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  return {
    operation: 'DeleteItem',
    key: util.dynamodb.toMapValues({
      PK: 'SEGMENT',
      SK: `SEGMENT#${ctx.args.id}`,
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

## 5. previewSegmentContacts

**Schema**: `previewSegmentContacts(conditions: [SegmentConditionInput!]!, conditionLogic: String, search: String, pageSize: Int, nextToken: String): ContactListResult!`
**Data Source**: `ContactTable` (DynamoDB — mesma tabela do `listContacts`)
**Index**: `GSI1-AllContacts` (GSI1PK = "CONTACT")

> Resolver AppSync JS direto (sem Lambda). Constrói FilterExpression dinamicamente
> a partir das conditions do segmento e executa Query no GSI1-AllContacts.

### Resolver Code (AppSync JS — fluxo único)
```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const limit = ctx.args.pageSize ?? 50;
  const nextToken = ctx.args.nextToken ?? null;
  const conditions = ctx.args.conditions || [];
  const logic = (ctx.args.conditionLogic || 'AND').toUpperCase();
  const search = ctx.args.search ?? null;

  const filterParts = [];
  const filterNames = {};
  const filterValues = {};

  // ── Construir filtro a partir das conditions do segmento ──────────────────
  conditions.forEach((cond, i) => {
    const nameKey = `#cf${i}`;
    const valueKey = `:cv${i}`;

    // Mapear nome do campo
    filterNames[nameKey] = cond.field;

    switch (cond.operator) {
      case 'equals':
        filterParts.push(`${nameKey} = ${valueKey}`);
        filterValues[valueKey] = { S: cond.value };
        break;
      case 'not_equals':
        filterParts.push(`${nameKey} <> ${valueKey}`);
        filterValues[valueKey] = { S: cond.value };
        break;
      case 'contains':
        filterParts.push(`contains(${nameKey}, ${valueKey})`);
        filterValues[valueKey] = { S: cond.value };
        break;
      case 'not_contains':
        filterParts.push(`NOT contains(${nameKey}, ${valueKey})`);
        filterValues[valueKey] = { S: cond.value };
        break;
      case 'in':
        // "in" com valores separados por vírgula
        const vals = cond.value.split(',').map(v => v.trim());
        const inParts = vals.map((v, j) => {
          const vk = `:cv${i}_${j}`;
          filterValues[vk] = { S: v };
          return vk;
        });
        filterParts.push(`${nameKey} IN (${inParts.join(', ')})`);
        break;
      case 'after':
        filterParts.push(`${nameKey} > ${valueKey}`);
        filterValues[valueKey] = { S: cond.value };
        break;
      case 'before':
        filterParts.push(`${nameKey} < ${valueKey}`);
        filterValues[valueKey] = { S: cond.value };
        break;
      default:
        filterParts.push(`${nameKey} = ${valueKey}`);
        filterValues[valueKey] = { S: cond.value };
    }
  });

  // Unir condições com AND ou OR
  let conditionExpr = '';
  if (filterParts.length > 0) {
    const joiner = logic === 'OR' ? ' OR ' : ' AND ';
    conditionExpr = filterParts.length > 1
      ? `(${filterParts.join(joiner)})`
      : filterParts[0];
  }

  // ── Busca textual (search) ────────────────────────────────────────────────
  if (search) {
    filterNames['#fn'] = 'fullName';
    filterNames['#em'] = 'email';
    filterValues[':search'] = { S: search.toLowerCase() };
    const searchExpr = '(contains(#fn, :search) OR contains(#em, :search))';
    conditionExpr = conditionExpr
      ? `${conditionExpr} AND ${searchExpr}`
      : searchExpr;
  }

  // ── Montar request de Query ───────────────────────────────────────────────
  const queryRequest = {
    operation: 'Query',
    index: 'GSI1-AllContacts',
    query: {
      expression: 'GSI1PK = :pk',
      expressionValues: util.dynamodb.toMapValues({ ':pk': 'CONTACT' }),
    },
    limit: limit,
    scanIndexForward: false,
  };

  if (nextToken) {
    queryRequest.nextToken = nextToken;
  }

  if (conditionExpr) {
    queryRequest.filter = {
      expression: conditionExpr,
      expressionNames: filterNames,
      expressionValues: filterValues,
    };
  }

  return queryRequest;
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  return {
    items: ctx.result.items ?? [],
    nextToken: ctx.result.nextToken ?? null,
    totalCount: ctx.result.scannedCount ?? null,
  };
}
```

### Configuração no AppSync Console

1. **Attach resolver** na query `previewSegmentContacts`
2. **Data source**: Selecionar o data source DynamoDB que aponta para a tabela `Contact` (o mesmo usado por `listContacts`)
3. **Runtime**: `APPSYNC_JS 1.0.0`
4. Colar o código acima como **Resolver code** (campo único)

---

## Notas de Implementação

### Deduplicação na Hora do Envio

A deduplicação de contatos por segmento é feita **no momento do envio da campanha** pela Lambda `sendCampaign`, não no resolver:

1. Lambda lê o segmento (condições + lógica AND/OR)
2. Se AND: executa query com todas as condições como filtro
3. Se OR: executa query para cada condição independentemente, depois faz `Set` unique por `contactId`
4. Resultado: lista de contactIds únicos que recebem exatamente 1 email

### contactCount (Contagem Estimada)

O campo `contactCount` é nullable e pode ser preenchido de duas formas:
- **Sob demanda**: Um botão "Calcular" no frontend dispara uma contagem
- **Na hora do envio**: A Lambda `sendCampaign` atualiza a contagem como efeito colateral

Para um MVP, é aceitável deixar `contactCount` como `null` e calcular apenas quando o segmento for selecionado como destinatário de uma campanha.
