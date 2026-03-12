# Contadores de Contatos — Arquitetura e Implementação

> Sistema de contagem atômica de contatos por lifecycle stage e por segmento,
> sem Scan na tabela, usando registros acumuladores no DynamoDB com `ADD` atômico.

---

## 1. Visão Geral

O sistema mantém **contadores pré-computados** em registros dedicados do DynamoDB,
atualizados atomicamente em cada operação que afeta a contagem (create, delete, import, mudança de lifecycle).

### Registros de Contagem

| Tabela | PK | SK | Campos | Descrição |
|---|---|---|---|---|
| `Contact` | `COUNTER` | `TOTAL` | `total`, `byLifecycle: { lead, subscriber, customer }` | Totais globais |
| `Config_Table` | `SEGMENT` | `SEGMENT#{segmentId}` | `contactCount` (já existe) | Contagem por segmento (atualizada sob demanda) |

### Exemplo do registro COUNTER#TOTAL na tabela Contact

```json
{
  "PK": "COUNTER",
  "SK": "TOTAL",
  "total": 150,
  "byLifecycle": {
    "lead": 80,
    "subscriber": 45,
    "customer": 25
  },
  "updatedAt": "2026-03-12T10:00:00.000Z"
}
```

---

## 2. Schema GraphQL — Alterações

### Novos Tipos

```graphql
type ContactCounters {
	total: Int!
	byLifecycle: LifecycleCounts!
	updatedAt: AWSDateTime
}

type LifecycleCounts {
	lead: Int!
	subscriber: Int!
	customer: Int!
}
```

### Nova Query

```graphql
type Query {
	# ... existentes ...
	getContactCounters: ContactCounters!
}
```

### Atualização do Schema Completo

Adicionar na seção `Query`:
```graphql
getContactCounters: ContactCounters!
```

---

## 3. Resolvers AppSync — Novos e Atualizados

---

### 3.1 getContactCounters (NOVO)

**Schema**: `getContactCounters: ContactCounters!`
**Data Source**: `ContactTable`

#### Request Handler
```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  return {
    operation: 'GetItem',
    key: util.dynamodb.toMapValues({
      PK: 'COUNTER',
      SK: 'TOTAL',
    }),
  };
}
```

#### Response Handler
```javascript
export function response(ctx) {
  if (!ctx.result) {
    // Registro ainda não existe — retorna zeros
    return {
      total: 0,
      byLifecycle: { lead: 0, subscriber: 0, customer: 0 },
      updatedAt: null,
    };
  }
  const r = ctx.result;
  const lc = r.byLifecycle ?? {};
  return {
    total: r.total ?? 0,
    byLifecycle: {
      lead: lc.lead ?? 0,
      subscriber: lc.subscriber ?? 0,
      customer: lc.customer ?? 0,
    },
    updatedAt: r.updatedAt ?? null,
  };
}
```

---

### 3.2 createContact — Atualizar para PIPELINE (2 steps)

> Trocar o resolver simples por um **pipeline resolver** com 2 functions:
> 1. `createContactItem` — cria o contato (código existente)
> 2. `incrementCounters` — incrementa contadores atômicos

**Tipo**: Pipeline Resolver
**Data Source**: `ContactTable`
**Functions**: `createContactItem`, `incrementContactCounters`

#### Function: createContactItem

O código é o **mesmo** do createContact atual (PutItem).

#### Function: incrementContactCounters

```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  // O resultado da function anterior (createContactItem) está em ctx.prev.result
  const contact = ctx.prev.result;
  const lifecycle = contact.lifecycleStage ?? 'lead';
  const now = util.time.nowISO8601();

  return {
    operation: 'UpdateItem',
    key: util.dynamodb.toMapValues({
      PK: 'COUNTER',
      SK: 'TOTAL',
    }),
    update: {
      expression: 'ADD #total :one, #byLifecycle.#lc :one SET #updatedAt = :now',
      expressionNames: {
        '#total': 'total',
        '#byLifecycle': 'byLifecycle',
        '#lc': lifecycle,
        '#updatedAt': 'updatedAt',
      },
      expressionValues: util.dynamodb.toMapValues({
        ':one': 1,
        ':now': now,
      }),
    },
  };
}

export function response(ctx) {
  // Retorna o contato criado (da function 1), não o resultado do counter
  return ctx.prev.result;
}
```

#### Pipeline Response Handler
```javascript
export function response(ctx) {
  // Retorna o resultado do stash (contato criado na function 1)
  return ctx.stash.createdContact ?? ctx.prev.result;
}
```

> **IMPORTANTE**: Na function `createContactItem`, adicione ao final do response handler:
> ```javascript
> ctx.stash.createdContact = ctx.result;
> return ctx.result;
> ```

---

### 3.3 deleteContact — Atualizar para PIPELINE (3 steps)

> 1. `getContactForDelete` — GetItem para ler o lifecycle antes de deletar
> 2. `deleteContactItem` — DeleteItem (código existente)
> 3. `decrementContactCounters` — decrementa contadores

#### Function: getContactForDelete

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

export function response(ctx) {
  if (!ctx.result) {
    util.error('Contact not found', 'NotFound');
  }
  ctx.stash.deletedContact = ctx.result;
  return ctx.result;
}
```

#### Function: deleteContactItem

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

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  return true;
}
```

#### Function: decrementContactCounters

```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const contact = ctx.stash.deletedContact;
  const lifecycle = contact.lifecycleStage ?? 'lead';
  const now = util.time.nowISO8601();

  return {
    operation: 'UpdateItem',
    key: util.dynamodb.toMapValues({
      PK: 'COUNTER',
      SK: 'TOTAL',
    }),
    update: {
      expression: 'ADD #total :minusOne, #byLifecycle.#lc :minusOne SET #updatedAt = :now',
      expressionNames: {
        '#total': 'total',
        '#byLifecycle': 'byLifecycle',
        '#lc': lifecycle,
        '#updatedAt': 'updatedAt',
      },
      expressionValues: util.dynamodb.toMapValues({
        ':minusOne': -1,
        ':now': now,
      }),
    },
  };
}

export function response(ctx) {
  return true;
}
```

#### Pipeline Response Handler
```javascript
export function response(ctx) {
  return true;
}
```

---

### 3.4 importContacts — Atualizar para PIPELINE

> 1. `importContactsBatch` — BatchPutItem (código existente)
> 2. `incrementCountersForImport` — incrementa contadores com base nos contatos importados

#### Function: incrementCountersForImport

```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  // O resultado da importação contém success count
  const inputs = ctx.args.inputs;
  const now = util.time.nowISO8601();

  // Contar lifecycle stages dos inputs
  let lead = 0, subscriber = 0, customer = 0;
  for (const input of inputs) {
    const lc = input.lifecycleStage ?? 'lead';
    if (lc === 'lead') lead++;
    else if (lc === 'subscriber') subscriber++;
    else if (lc === 'customer') customer++;
    else lead++; // fallback
  }

  const total = lead + subscriber + customer;

  // Usar SET para inicializar se não existir e ADD para incrementar atomicamente
  const expParts = ['ADD #total :total'];
  const expNames = {
    '#total': 'total',
    '#byLifecycle': 'byLifecycle',
    '#updatedAt': 'updatedAt',
  };
  const expValues = {
    ':total': total,
    ':now': now,
  };

  if (lead > 0) {
    expParts.push('ADD #byLifecycle.#lead :lead');
    expNames['#lead'] = 'lead';
    expValues[':lead'] = lead;
  }
  if (subscriber > 0) {
    expParts.push('ADD #byLifecycle.#subscriber :subscriber');
    expNames['#subscriber'] = 'subscriber';
    expValues[':subscriber'] = subscriber;
  }
  if (customer > 0) {
    expParts.push('ADD #byLifecycle.#customer :customer');
    expNames['#customer'] = 'customer';
    expValues[':customer'] = customer;
  }

  expParts.push('SET #updatedAt = :now');

  return {
    operation: 'UpdateItem',
    key: util.dynamodb.toMapValues({
      PK: 'COUNTER',
      SK: 'TOTAL',
    }),
    update: {
      expression: expParts.join(', ').replace(', SET', ' SET'),
      expressionNames: expNames,
      expressionValues: util.dynamodb.toMapValues(expValues),
    },
  };
}

export function response(ctx) {
  return ctx.prev.result; // retorna o ImportResult da function anterior
}
```

> **NOTA**: A importação pode ter falhas parciais. A contagem ideal usaria
> `ctx.prev.result.success` em vez de `inputs.length`. Se o BatchPutItem
> retorna quantos foram inseridos com sucesso, use esse valor.
> Uma abordagem mais robusta para import: na function `importContactsBatch`,
> salvar `ctx.stash.importedCount = { total, lead, subscriber, customer }`
> baseado nos que realmente foram inseridos.

---

### 3.5 updateContact — Mudança de Lifecycle (FUTURO)

Quando implementar mudança de lifecycle, o resolver de updateContact deve:

1. **Ler** o contato antes do update (GetItem) para saber o lifecycle antigo
2. Se `input.lifecycleStage` != null e diferente do antigo:
   - Decrementar `byLifecycle.{oldStage}` com ADD -1
   - Incrementar `byLifecycle.{newStage}` com ADD +1
   - O `total` permanece o mesmo

#### Function: adjustLifecycleCounters (após updateContactItem)

```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const oldLifecycle = ctx.stash.oldLifecycle;
  const newLifecycle = ctx.stash.newLifecycle;

  // Se não houve mudança de lifecycle, skip
  if (!oldLifecycle || !newLifecycle || oldLifecycle === newLifecycle) {
    return { operation: 'GetItem', key: util.dynamodb.toMapValues({ PK: 'COUNTER', SK: 'TOTAL' }) };
  }

  const now = util.time.nowISO8601();

  return {
    operation: 'UpdateItem',
    key: util.dynamodb.toMapValues({
      PK: 'COUNTER',
      SK: 'TOTAL',
    }),
    update: {
      expression: 'ADD #byLifecycle.#oldLc :minusOne, #byLifecycle.#newLc :one SET #updatedAt = :now',
      expressionNames: {
        '#byLifecycle': 'byLifecycle',
        '#oldLc': oldLifecycle,
        '#newLc': newLifecycle,
        '#updatedAt': 'updatedAt',
      },
      expressionValues: util.dynamodb.toMapValues({
        ':minusOne': -1,
        ':one': 1,
        ':now': now,
      }),
    },
  };
}

export function response(ctx) {
  return ctx.stash.updatedContact ?? ctx.prev.result;
}
```

> No response handler de `updateContactItem` (antes dessa function):
> ```javascript
> // Salvar no stash para o counter ajustar
> if (ctx.args.input.lifecycleStage) {
>   ctx.stash.newLifecycle = ctx.args.input.lifecycleStage;
> }
> ctx.stash.updatedContact = ctx.result;
> return ctx.result;
> ```
>
> E na function anterior (getContactBeforeUpdate), salvar:
> ```javascript
> ctx.stash.oldLifecycle = ctx.result.lifecycleStage;
> ```

---

## 4. Inicialização do Registro COUNTER

Criar o registro manualmente ou via script **uma única vez** na tabela `Contact`:

```json
{
  "PK": { "S": "COUNTER" },
  "SK": { "S": "TOTAL" },
  "total": { "N": "0" },
  "byLifecycle": {
    "M": {
      "lead": { "N": "0" },
      "subscriber": { "N": "0" },
      "customer": { "N": "0" }
    }
  },
  "updatedAt": { "S": "2026-03-12T00:00:00.000Z" }
}
```

> **Se já tem contatos na base**, rode um script de contagem inicial:
> ```javascript
> // Script one-time (rodar no AWS CLI ou Lambda)
> // Faz um Scan APENAS UMA VEZ para contar os existentes
> // Depois disso, os contadores são atualizados atomicamente
> ```

---

## 5. Contagem por Segmento

Os segmentos já têm o campo `contactCount` no schema. A contagem de segmento é
**mais complexa** pois depende das condições dinâmicas do segmento.

### Estratégia

- O `contactCount` do segmento é atualizado **on-demand** quando:
  1. O segmento é criado/atualizado (o resolver faz um `previewSegmentContacts` count)
  2. Uma campanha é criada apontando para esse segmento (nesse momento recalcula)
- Não faz contagem em tempo real a cada CRUD de contato (seria muito caro)

### Uso na Campanha

Na criação de campanha, o frontend exibe a estimativa baseada em:
- `recipientType === 'all'` → usa `contactCounters.total`
- `recipientType === 'lifecycleStage'` → usa `contactCounters.byLifecycle[stage]`
- `recipientType === 'segment'` → usa `segment.contactCount` do segmento selecionado

---

## 6. Tabela de Campos no DynamoDB

### Tabela Contact — Novo registro

| PK | SK | Atributos |
|---|---|---|
| `COUNTER` | `TOTAL` | `total` (Number), `byLifecycle` (Map: lead/subscriber/customer), `updatedAt` (String) |

### Novos campos no registro CONTACT (ecommerce)

| Atributo | Tipo | Descrição |
|---|---|---|
| `ecommerceInfo` | Map | `{ paidOrders, revenue, avgTicket, lastPurchaseAt, abandonedCarts, abandonedCartValue }` |
| `legalBasis` | String | `accepted` / `null` — Base legal LGPD |

---

## 7. Checklist de Implementação Backend

- [ ] **AppSync Schema**: Adicionar `ContactCounters`, `LifecycleCounts`, `getContactCounters` query
- [ ] **AppSync Schema**: Adicionar `EcommerceInfo` type, `ecommerceInfo` e `legalBasis` no `Contact`
- [ ] **Resolver**: Criar `getContactCounters` (GetItem simples)
- [ ] **Resolver**: Converter `createContact` para Pipeline (create + increment counter)
- [ ] **Resolver**: Converter `deleteContact` para Pipeline (get + delete + decrement counter)
- [ ] **Resolver**: Converter `importContacts` para Pipeline (import + increment counters)
- [ ] **Resolver**: Preparar `updateContact` para Pipeline (get old + update + adjust lifecycle counters)
- [ ] **DynamoDB**: Criar registro `COUNTER#TOTAL` na tabela Contact
- [ ] **DynamoDB**: Se necessário, rodar script de contagem inicial para contatos existentes

---

## 8. Resumo das Operações Atômicas

| Operação | Efeito no COUNTER |
|---|---|
| `createContact` | `ADD total +1`, `ADD byLifecycle.{stage} +1` |
| `deleteContact` | `ADD total -1`, `ADD byLifecycle.{stage} -1` |
| `importContacts` | `ADD total +N`, `ADD byLifecycle.{stage} +count` (por stage) |
| `updateContact` (lifecycle change) | `ADD byLifecycle.{old} -1`, `ADD byLifecycle.{new} +1` |

> Todas as operações usam `ADD` do DynamoDB que é **atômica** e segura para concorrência.
> Não há race conditions mesmo com múltiplas Lambda/resolvers rodando em paralelo.
