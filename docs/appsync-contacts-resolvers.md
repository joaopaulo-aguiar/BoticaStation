# AppSync — Resolvers DynamoDB Direto (Contacts)

> Integração direta AppSync ↔ DynamoDB via **JS Resolvers** (runtime `APPSYNC_JS 1.0.0`).
> Sem Lambda. Cada campo do schema recebe um resolver com request/response handler.

---

## Pré-requisitos

- **Tabela DynamoDB**: `Contact`
- **Data Source no AppSync**: Criar um data source do tipo **DynamoDB** apontando para a tabela `Contact`, com role IAM que permita `dynamodb:GetItem`, `PutItem`, `UpdateItem`, `DeleteItem`, `Query`, `BatchWriteItem`.
- **Nome do Data Source**: usar `ContactTable` (referenciado abaixo).

---

## Estrutura da Tabela

| Atributo | Tipo | Descrição |
|---|---|---|
| PK | String | `CONTACT#{uuid}` |
| SK | String | `METADATA` |
| GSI1PK | String | fixo `CONTACT` |
| GSI1SK | String | `{created_at}` ISO 8601 |
| id | String | UUID |
| email | String | |
| phone | String | |
| fullName | String | |
| lifecycleStage | String | `lead` / `subscriber` / `customer` |
| tags | List | `["tag1", "tag2"]` |
| status | String | `active` / `inactive` |
| source | String | `manual_input` / `import_csv` |
| cashbackInfo | Map | `{ currentBalance, lifetimeEarned, expiryDate }` |
| stats | Map | `{ emailSends, emailDeliveries, emailOpens, emailClicks, emailBounces, emailComplaints, smsSends, smsDeliveries }` — contadores atômicos atualizados via Lambda |
| createdAt | String | ISO 8601 |
| updatedAt | String | ISO 8601 |
| createdBy | String | Cognito sub/email |
| updatedBy | String | Cognito sub/email |

### GSIs

| Nome | Partition Key | Sort Key | Uso |
|---|---|---|---|
| GSI1-AllContacts | GSI1PK | GSI1SK | listContacts (sem Scan) |
| GSI2-ByEmail | email | — | findContactByEmail |
| GSI3-ByPhone | phone | — | findContactByPhone |
| GSI4-ByLifecycleStage | lifecycleStage | createdAt | filtros |
| GSI5-ByStatus | status | createdAt | filtros |

---

## 1. createContact

**Schema**: `createContact(input: CreateContactInput!): Contact!`
**Data Source**: `ContactTable`

### Request Handler
```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const id = util.autoId();
  const now = util.time.nowISO8601();
  const caller = ctx.identity?.claims?.email ?? ctx.identity?.sub ?? 'system';
  const input = ctx.args.input;

  const item = {
    PK: `CONTACT#${id}`,
    SK: 'METADATA',
    GSI1PK: 'CONTACT',
    GSI1SK: now,
    id,
    email: input.email,
    phone: input.phone ?? null,
    fullName: input.fullName,
    lifecycleStage: input.lifecycleStage ?? 'lead',
    tags: input.tags ?? [],
    status: 'active',
    source: input.source ?? 'manual_input',
    cashbackInfo: {
      currentBalance: input.cashbackBalance ?? 0,
      lifetimeEarned: input.cashbackBalance ?? 0,
      expiryDate: null,
    },
    createdAt: now,
    updatedAt: now,
    createdBy: caller,
    updatedBy: caller,
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

## 2. getContact

**Schema**: `getContact(id: ID!): Contact`
**Data Source**: `ContactTable`

### Request Handler
```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  return {
    operation: 'GetItem',
    key: util.dynamodb.toMapValues({
      PK: `CONTACT#${ctx.args.id}`,
      SK: 'METADATA',
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

## 3. updateContact

**Schema**: `updateContact(id: ID!, input: UpdateContactInput!): Contact!`
**Data Source**: `ContactTable`

### Request Handler
```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const id = ctx.args.id;
  const input = ctx.args.input;
  const now = util.time.nowISO8601();
  const caller = ctx.identity?.claims?.email ?? ctx.identity?.sub ?? 'system';

  const expParts = ['#updatedAt = :updatedAt', '#updatedBy = :updatedBy'];
  const expNames = { '#updatedAt': 'updatedAt', '#updatedBy': 'updatedBy' };
  const expValues = util.dynamodb.toMapValues({ ':updatedAt': now, ':updatedBy': caller });

  if (input.fullName != null) {
    expParts.push('#fullName = :fullName');
    expNames['#fullName'] = 'fullName';
    Object.assign(expValues, util.dynamodb.toMapValues({ ':fullName': input.fullName }));
  }
  if (input.email != null) {
    expParts.push('#email = :email');
    expNames['#email'] = 'email';
    Object.assign(expValues, util.dynamodb.toMapValues({ ':email': input.email }));
  }
  if (input.phone != null) {
    expParts.push('#phone = :phone');
    expNames['#phone'] = 'phone';
    Object.assign(expValues, util.dynamodb.toMapValues({ ':phone': input.phone }));
  }
  if (input.lifecycleStage != null) {
    expParts.push('#lifecycleStage = :lifecycleStage');
    expNames['#lifecycleStage'] = 'lifecycleStage';
    Object.assign(expValues, util.dynamodb.toMapValues({ ':lifecycleStage': input.lifecycleStage }));
  }
  if (input.tags != null) {
    expParts.push('#tags = :tags');
    expNames['#tags'] = 'tags';
    Object.assign(expValues, util.dynamodb.toMapValues({ ':tags': input.tags }));
  }
  if (input.status != null) {
    expParts.push('#status = :status');
    expNames['#status'] = 'status';
    Object.assign(expValues, util.dynamodb.toMapValues({ ':status': input.status }));
  }

  return {
    operation: 'UpdateItem',
    key: util.dynamodb.toMapValues({
      PK: `CONTACT#${id}`,
      SK: 'METADATA',
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

## 4. deleteContact

**Schema**: `deleteContact(id: ID!): Boolean!`
**Data Source**: `ContactTable`

### Request Handler
```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  return {
    operation: 'DeleteItem',
    key: util.dynamodb.toMapValues({
      PK: `CONTACT#${ctx.args.id}`,
      SK: 'METADATA',
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

## 5. listContacts

**Schema**: `listContacts(pageSize, nextToken, filter, sort): ContactListResult!`
**Data Source**: `ContactTable`

> Usa GSI1-AllContacts (`GSI1PK = "CONTACT"`, `GSI1SK = created_at`).
> Não faz Scan.

### Request Handler
```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const limit = ctx.args.pageSize ?? 50;
  const nextToken = ctx.args.nextToken ?? null;
  const filter = ctx.args.filter;
  const sort = ctx.args.sort;

  const scanForward = sort?.direction === 'ASC';

  // Expressão de filtro pós-query (DynamoDB filter expression)
  const filterParts = [];
  const filterNames = {};
  const filterValues = {};

  if (filter?.lifecycleStage) {
    filterParts.push('#ls = :ls');
    filterNames['#ls'] = 'lifecycleStage';
    filterValues[':ls'] = { S: filter.lifecycleStage };
  }
  if (filter?.status) {
    filterParts.push('#st = :st');
    filterNames['#st'] = 'status';
    filterValues[':st'] = { S: filter.status };
  }
  if (filter?.tag) {
    filterParts.push('contains(#tags, :tag)');
    filterNames['#tags'] = 'tags';
    filterValues[':tag'] = { S: filter.tag };
  }
  if (filter?.search) {
    filterParts.push('(contains(#fn, :search) OR contains(#em, :search) OR contains(#ph, :search))');
    filterNames['#fn'] = 'fullName';
    filterNames['#em'] = 'email';
    filterNames['#ph'] = 'phone';
    filterValues[':search'] = { S: filter.search.toLowerCase() };
  }

  const query = {
    operation: 'Query',
    index: 'GSI1-AllContacts',
    query: {
      expression: 'GSI1PK = :pk',
      expressionValues: util.dynamodb.toMapValues({ ':pk': 'CONTACT' }),
    },
    limit,
    scanIndexForward: scanForward,
  };

  if (nextToken) {
    query.nextToken = nextToken;
  }

  if (filterParts.length > 0) {
    query.filter = {
      expression: filterParts.join(' AND '),
      expressionNames: filterNames,
      expressionValues: filterValues,
    };
  }

  return query;
}
```

### Response Handler
```javascript
import { util } from '@aws-appsync/utils';

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

---

## 6. findContactByEmail

**Schema**: `findContactByEmail(email: String!): Contact`
**Data Source**: `ContactTable`

> Usa GSI2-ByEmail.

### Request Handler
```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  return {
    operation: 'Query',
    index: 'GSI2-ByEmail',
    query: {
      expression: 'email = :email',
      expressionValues: util.dynamodb.toMapValues({ ':email': ctx.args.email }),
    },
    limit: 1,
  };
}
```

### Response Handler
```javascript
export function response(ctx) {
  const items = ctx.result.items ?? [];
  return items.length > 0 ? items[0] : null;
}
```

---

## 7. findContactByPhone

**Schema**: `findContactByPhone(phone: String!): Contact`
**Data Source**: `ContactTable`

> Usa GSI3-ByPhone.

### Request Handler
```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  return {
    operation: 'Query',
    index: 'GSI3-ByPhone',
    query: {
      expression: 'phone = :phone',
      expressionValues: util.dynamodb.toMapValues({ ':phone': ctx.args.phone }),
    },
    limit: 1,
  };
}
```

### Response Handler
```javascript
export function response(ctx) {
  const items = ctx.result.items ?? [];
  return items.length > 0 ? items[0] : null;
}
```

---

## 8. importContacts (Pipeline Resolver + Lambda)

> **`importContacts` NÃO pode ser feito 100% com resolver direto** porque precisa
> de lógica complexa: gerar UUIDs em loop, verificar duplicatas por email (Query GSI2),
> e BatchWriteItem com batches de 25. **Recomendação: usar Lambda apenas para este resolver.**

Se quiser manter tudo sem Lambda, a alternativa é o frontend chamar `createContact`
em loop (um por um) — mas isso é lento para imports grandes.

### Opção Lambda (recomendada para importContacts)

```javascript
import { DynamoDBClient, BatchWriteItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { randomUUID } from 'crypto';

const ddb = new DynamoDBClient({});
const TABLE = process.env.TABLE_NAME; // "Contact"

export const handler = async (event) => {
  const inputs = event.arguments.inputs;
  const caller = event.identity?.claims?.email ?? event.identity?.sub ?? 'system';
  const now = new Date().toISOString();

  let success = 0;
  let failed = 0;
  const errors = [];

  // 1. Verificar duplicatas por email (batch de queries no GSI2)
  const existingEmails = new Set();
  for (const input of inputs) {
    const result = await ddb.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI2-ByEmail',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: marshall({ ':email': input.email }),
      Limit: 1,
    }));
    if (result.Items && result.Items.length > 0) {
      existingEmails.add(input.email);
    }
  }

  // 2. Preparar itens válidos
  const validItems = [];
  for (const input of inputs) {
    if (existingEmails.has(input.email)) {
      failed++;
      errors.push(`Duplicado: ${input.email}`);
      continue;
    }
    const id = randomUUID();
    validItems.push({
      PutRequest: {
        Item: marshall({
          PK: `CONTACT#${id}`,
          SK: 'METADATA',
          GSI1PK: 'CONTACT',
          GSI1SK: now,
          id,
          email: input.email,
          phone: input.phone ?? null,
          fullName: input.fullName,
          lifecycleStage: input.lifecycleStage ?? 'lead',
          tags: input.tags ?? [],
          status: 'active',
          source: input.source ?? 'import_csv',
          cashbackInfo: {
            currentBalance: input.cashbackBalance ?? 0,
            lifetimeEarned: input.cashbackBalance ?? 0,
            expiryDate: null,
          },
          createdAt: now,
          updatedAt: now,
          createdBy: caller,
          updatedBy: caller,
        }),
      },
    });
  }

  // 3. BatchWriteItem em lotes de 25
  for (let i = 0; i < validItems.length; i += 25) {
    const batch = validItems.slice(i, i + 25);
    try {
      await ddb.send(new BatchWriteItemCommand({
        RequestItems: { [TABLE]: batch },
      }));
      success += batch.length;
    } catch (err) {
      failed += batch.length;
      errors.push(`Batch erro: ${err.message}`);
    }
  }

  return { success, failed, errors: errors.length > 0 ? errors : null };
};
```

---

## Como Configurar no Console AppSync

Para cada resolver (exceto `importContacts`):

1. Ir em **Schema** → clicar no campo (ex: `createContact`) → **Attach Resolver**
2. Selecionar **Data Source**: `ContactTable`
3. Selecionar **Runtime**: `APPSYNC_JS 1.0.0`
4. Colar o **Request Handler** e **Response Handler** correspondente
5. Salvar

Para `importContacts`:
1. Criar uma **Lambda function** com o código acima
2. Criar um **Data Source** do tipo Lambda no AppSync apontando para essa função
3. Attach resolver no campo `importContacts` usando esse data source Lambda

---

## Variáveis de Ambiente (Lambda importContacts)

| Variável | Valor |
|---|---|
| TABLE_NAME | `Contact` |

## IAM Role (Data Source DynamoDB)

A role do data source `ContactTable` precisa de:

```json
{
  "Effect": "Allow",
  "Action": [
    "dynamodb:GetItem",
    "dynamodb:PutItem",
    "dynamodb:UpdateItem",
    "dynamodb:DeleteItem",
    "dynamodb:Query"
  ],
  "Resource": [
    "arn:aws:dynamodb:sa-east-1:*:table/Contact",
    "arn:aws:dynamodb:sa-east-1:*:table/Contact/index/*"
  ]
}
```

## IAM Role (Lambda importContacts)

```json
{
  "Effect": "Allow",
  "Action": [
    "dynamodb:Query",
    "dynamodb:BatchWriteItem"
  ],
  "Resource": [
    "arn:aws:dynamodb:sa-east-1:*:table/Contact",
    "arn:aws:dynamodb:sa-east-1:*:table/Contact/index/GSI2-ByEmail"
  ]
}
```

---

## Nota sobre `search` (filtro de texto)

O filtro `search` no `listContacts` usa `contains()` no DynamoDB que é **case-sensitive**.
Para busca case-insensitive, considere armazenar campos de busca em lowercase
(ex: `fullNameLower`, `emailLower`) e buscar com o valor já em lowercase.
