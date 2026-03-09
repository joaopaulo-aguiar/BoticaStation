# AppSync — Resolvers DynamoDB Direto (Contact Events)

> Integração direta AppSync ↔ DynamoDB via **JS Resolvers** (runtime `APPSYNC_JS 1.0.0`).
> Sem Lambda. Cada campo do schema recebe um resolver com request/response handler.

---

## Pré-requisitos

- **Tabela DynamoDB**: `ContactEvent`
- **Data Source no AppSync**: Criar um data source do tipo **DynamoDB** apontando para a tabela `ContactEvent`, com role IAM que permita `Query`.
- **Nome do Data Source**: usar `ContactEventTable` (referenciado abaixo).

> **Nota sobre Stats**: Os contadores de e-mail/SMS não ficam nesta tabela. Ficam diretamente no item do **Contact** (tabela `Contact`) como atributos atômicos (`emailSends`, `emailDeliveries`, etc.), atualizados pela Lambda via `UpdateItem ADD`. Assim, um único `GetItem` no contato traz tudo.

---

## Estrutura da Tabela

| Atributo | Tipo | Descrição |
|---|---|---|
| PK | String | `CONTACT#{contactId}` |
| SK | String | `EVENT#{timestamp}#{messageId}` |
| contactId | String | UUID do contato |
| eventId | String | Identificador único do evento (messageId SES) |
| channel | String | `email`, `whatsapp`, `sms` |
| eventType | String | `Send`, `Delivery`, `Open`, `Click`, `Bounce`, `Complaint`, `Reject` |
| details | String | JSON com detalhes extras (nullable) |
| campaignId | String | ID da campanha que originou o evento (nullable) |
| campaignName | String | Nome da campanha (nullable) |
| subject | String | Assunto do e-mail (nullable) |
| createdAt | String | ISO 8601 |

---

## 1. listContactEvents

**Schema**: `listContactEvents(contactId: ID!, limit: Int, nextToken: String, filter: ContactEventFilterInput): ContactEventListResult!`
**Data Source**: `ContactEventTable`

> Query na tabela principal usando PK = `CONTACT#{contactId}` e SK begins_with `EVENT#`.
> Retorna eventos em ordem decrescente (mais recentes primeiro).
> Filtro pós-query opcional por channel e eventType.

### Request Handler
```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const contactId = ctx.args.contactId;
  const limit = ctx.args.limit ?? 20;
  const nextToken = ctx.args.nextToken ?? null;
  const filter = ctx.args.filter;

  // Filtro pós-query opcional
  const filterParts = [];
  const filterNames = {};
  const filterValues = {};

  if (filter?.channel) {
    filterParts.push('#ch = :ch');
    filterNames['#ch'] = 'channel';
    filterValues[':ch'] = { S: filter.channel };
  }
  if (filter?.eventType) {
    filterParts.push('#et = :et');
    filterNames['#et'] = 'eventType';
    filterValues[':et'] = { S: filter.eventType };
  }

  const query = {
    operation: 'Query',
    query: {
      expression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      expressionValues: util.dynamodb.toMapValues({
        ':pk': `CONTACT#${contactId}`,
        ':skPrefix': 'EVENT#',
      }),
    },
    limit,
    scanIndexForward: false, // Mais recentes primeiro
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
  };
}
```

---

## 2. getContactEmailStats

**Schema**: `getContactEmailStats(contactId: ID!): ContactEmailStats`
**Data Source**: `ContactEventTable`

> GetItem direto no item de stats agregado: PK = `CONTACT#{contactId}`, SK = `EMAIL_STATS`.

### Request Handler
```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  return {
    operation: 'GetItem',
    key: util.dynamodb.toMapValues({
      PK: `CONTACT#${ctx.args.contactId}`,
      SK: 'EMAIL_STATS',
    }),
  };
}
```

### Response Handler
```javascript
export function response(ctx) {
  // Se o item não existir (contato nunca recebeu email), retorna zeros
  if (!ctx.result) {
    return {
      sends: 0,
      deliveries: 0,
      opens: 0,
      clicks: 0,
      bounces: 0,
      complaints: 0,
    };
  }
  return {
    sends: ctx.result.sends ?? 0,
    deliveries: ctx.result.deliveries ?? 0,
    opens: ctx.result.opens ?? 0,
    clicks: ctx.result.clicks ?? 0,
    bounces: ctx.result.bounces ?? 0,
    complaints: ctx.result.complaints ?? 0,
  };
}
```

---

## Notas de Implementação

### Formato da Sort Key dos Eventos

O SK segue o padrão `EVENT#{ISO8601}#{messageId}`:

```
EVENT#2025-06-15T14:30:00.000Z#0100019xxxxxxxxx-xxxxxxxx-xxxx
```

Isso garante:
- **Ordenação cronológica natural**: DynamoDB ordena strings lexicograficamente, e datas ISO 8601 são naturalmente ordenáveis.
- **Unicidade**: O messageId do SES garante que não há colisão mesmo para eventos no mesmo milissegundo.
- **Query eficiente**: `begins_with(SK, 'EVENT#')` retorna apenas eventos, sem necessidade de filtro extra.

### Quem Popula Esta Tabela?

Os eventos são escritos por uma **Lambda de processamento SES** que escuta o tópico SNS de notificações SES:

1. SES → SNS → Lambda
2. Lambda parseia o evento (Send, Delivery, Open, Click, Bounce, Complaint)
3. Lambda executa `PutItem` na tabela **ContactEvent** para o evento individual
4. Lambda executa `UpdateItem` com `ADD` na tabela **Contact** para incrementar os contadores (`emailSends`, `emailDeliveries`, etc.) diretamente no item do contato

Isso garante que um único `GetItem` no contato retorna todas as stats sem necessidade de query separada.

Os resolvers AppSync aqui descritos são **somente leitura**.
