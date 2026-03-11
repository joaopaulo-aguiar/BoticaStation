# AppSync — Resolvers DynamoDB (Campaign Tags)

> Resolvers AppSync ↔ DynamoDB via **JS Resolvers** (runtime `APPSYNC_JS 1.0.0`).
> CRUD de Campaign Tags — armazenadas na `Config_Table` com PK=`TAG`, SK=`TAG#{id}`.

---

## Atualizações no GraphQL Schema

Adicionar os seguintes tipos, inputs, queries e mutations ao schema:

### Novos Types

```graphql
type CampaignTag {
	id: ID!
	name: String!
	color: String!
	createdAt: AWSDateTime!
	updatedAt: AWSDateTime
}
```

### Novos Inputs

```graphql
input CreateCampaignTagInput {
	name: String!
	color: String!
}

input UpdateCampaignTagInput {
	name: String
	color: String
}
```

### Novos Queries (adicionar ao type Query)

```graphql
type Query {
	# ... queries existentes ...
	
	# Campaign Tags
	listCampaignTags: [CampaignTag!]!
	getCampaignTag(id: ID!): CampaignTag
}
```

### Novas Mutations (adicionar ao type Mutation)

```graphql
type Mutation {
	# ... mutations existentes ...
	
	# Campaign Tags
	createCampaignTag(input: CreateCampaignTagInput!): CampaignTag!
	updateCampaignTag(id: ID!, input: UpdateCampaignTagInput!): CampaignTag!
	deleteCampaignTag(id: ID!): Boolean!
}
```

---

## Estrutura na Config_Table

| Atributo | Tipo | Descrição |
|---|---|---|
| PK | String | `TAG` (fixo para listar todas) |
| SK | String | `TAG#{uuid}` |
| id | String | UUID da tag |
| name | String | Nome da tag (ex: "Promoção", "Newsletter") |
| color | String | Cor da tag (ex: "blue", "green", "red", "purple") |
| createdAt | String | ISO 8601 |
| updatedAt | String | ISO 8601 |

---

## Resolvers — Data Source: `ConfigTable` (DynamoDB)

### 1. listCampaignTags

**Schema**: `listCampaignTags: [CampaignTag!]!`
**Data Source**: `ConfigTable`

```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  return {
    operation: 'Query',
    query: {
      expression: 'PK = :pk',
      expressionValues: util.dynamodb.toMapValues({ ':pk': 'TAG' }),
    },
    scanIndexForward: true,
  };
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  return ctx.result.items ?? [];
}
```

---

### 2. getCampaignTag

**Schema**: `getCampaignTag(id: ID!): CampaignTag`
**Data Source**: `ConfigTable`

```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  return {
    operation: 'GetItem',
    key: util.dynamodb.toMapValues({
      PK: 'TAG',
      SK: `TAG#${ctx.args.id}`,
    }),
  };
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  return ctx.result;
}
```

---

### 3. createCampaignTag

**Schema**: `createCampaignTag(input: CreateCampaignTagInput!): CampaignTag!`
**Data Source**: `ConfigTable`

```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const id = util.autoId();
  const now = util.time.nowISO8601();
  const { name, color } = ctx.args.input;

  return {
    operation: 'PutItem',
    key: util.dynamodb.toMapValues({
      PK: 'TAG',
      SK: `TAG#${id}`,
    }),
    attributeValues: util.dynamodb.toMapValues({
      id,
      name,
      color,
      createdAt: now,
      updatedAt: now,
    }),
    condition: {
      expression: 'attribute_not_exists(PK)',
    },
  };
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  return ctx.result;
}
```

---

### 4. updateCampaignTag

**Schema**: `updateCampaignTag(id: ID!, input: UpdateCampaignTagInput!): CampaignTag!`
**Data Source**: `ConfigTable`

```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const { id } = ctx.args;
  const { name, color } = ctx.args.input;
  const now = util.time.nowISO8601();

  const expParts = ['#updatedAt = :now'];
  const expNames = { '#updatedAt': 'updatedAt' };
  const expValues = { ':now': now };

  if (name !== undefined && name !== null) {
    expParts.push('#name = :name');
    expNames['#name'] = 'name';
    expValues[':name'] = name;
  }
  if (color !== undefined && color !== null) {
    expParts.push('#color = :color');
    expNames['#color'] = 'color';
    expValues[':color'] = color;
  }

  return {
    operation: 'UpdateItem',
    key: util.dynamodb.toMapValues({
      PK: 'TAG',
      SK: `TAG#${id}`,
    }),
    update: {
      expression: `SET ${expParts.join(', ')}`,
      expressionNames: expNames,
      expressionValues: util.dynamodb.toMapValues(expValues),
    },
    condition: {
      expression: 'attribute_exists(PK)',
    },
  };
}

export function response(ctx) {
  if (ctx.error) {
    if (ctx.error.type === 'DynamoDB:ConditionalCheckFailedException') {
      util.error('Tag não encontrada', 'NotFound');
    }
    util.error(ctx.error.message, ctx.error.type);
  }
  return ctx.result;
}
```

---

### 5. deleteCampaignTag

**Schema**: `deleteCampaignTag(id: ID!): Boolean!`
**Data Source**: `ConfigTable`

```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  return {
    operation: 'DeleteItem',
    key: util.dynamodb.toMapValues({
      PK: 'TAG',
      SK: `TAG#${ctx.args.id}`,
    }),
  };
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  return true;
}
```

---

## Resumo de Configuração no AppSync Console

| Campo GraphQL | Data Source | Runtime |
|---|---|---|
| `Query.listCampaignTags` | `ConfigTable` | APPSYNC_JS 1.0.0 |
| `Query.getCampaignTag` | `ConfigTable` | APPSYNC_JS 1.0.0 |
| `Mutation.createCampaignTag` | `ConfigTable` | APPSYNC_JS 1.0.0 |
| `Mutation.updateCampaignTag` | `ConfigTable` | APPSYNC_JS 1.0.0 |
| `Mutation.deleteCampaignTag` | `ConfigTable` | APPSYNC_JS 1.0.0 |

Todos os resolvers usam o mesmo Data Source `ConfigTable` existente, que já tem permissões para operações DynamoDB na `Config_Table`.
