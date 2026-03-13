# Arquitetura de Triggers — Automações (DynamoDB Streams)

> Documento de design para disparo automático de automações com base em eventos
> de contato (criação, mudança de tag, lifecycle, eventos de compra, etc.)
>
> **Decisão de Arquitetura:** DynamoDB Streams → Lambda (automations-trigger)
>
> Escolhida por ser a opção mais simples, econômica e confiável.

---

## Visão Geral

```
Config_Table (DynamoDB)
    │
    ├── CONTACT#{uuid} / METADATA        ← Contatos (INSERT / MODIFY)
    ├── CONTACT#{uuid} / EVENT#...       ← Eventos do contato (INSERT)
    │
    ▼ DynamoDB Stream (NEW_AND_OLD_IMAGES)
    │
Lambda: automations-trigger
    │
    ├── Detecta tipo de mudança:
    │     • Novo contato criado (INSERT on METADATA)
    │     • Tag adicionada (MODIFY: tags diff)
    │     • Tag removida (MODIFY: tags diff)
    │     • Lifecycle mudou (MODIFY: lifecycleStage diff)
    │     • Evento de compra (INSERT on EVENT# com eventType=Purchase)
    │     • Carrinho abandonado (INSERT on EVENT# com eventType=CartAbandoned)
    │     • Formulário enviado (INSERT on EVENT# com eventType=FormSubmit)
    │     • Evento personalizado (INSERT on EVENT#)
    │
    ├── Query DynamoDB: automações ATIVAS que correspondem ao trigger
    │     PK = "AUTOMATION", status = "active"
    │     Filtra por trigger.type + trigger.params
    │
    └── Para cada automação correspondente:
          StartExecution(stateMachineArn, { contactData })

Step Functions (execução da automação)
```

---

## Por que DynamoDB Streams? (Análise de custo-benefício)

### Opções Avaliadas

| Opção | Custo | Complexidade | Confiabilidade | Latência |
|-------|-------|-------------|----------------|----------|
| **DynamoDB Streams → Lambda** | ✅ Grátis (incluído no DDB) | ✅ Simples (1 Lambda) | ✅ Exactly-once | ~100ms |
| EventBridge Pipes + Rules | ❌ ~$0.40/M events | ⚠️ Médio (Pipes + Rules) | ✅ At-least-once | ~200ms |
| Código nos Lambdas existentes | ✅ Grátis | ❌ Alto (mudar N Lambdas) | ⚠️ Acoplado | ~50ms |
| SNS/SQS pub/sub | ⚠️ ~$0.50/M msgs | ⚠️ Médio | ✅ At-least-once | ~150ms |

### Decisão: **DynamoDB Streams → Lambda**

**Motivos:**
1. **Custo zero adicional** — DynamoDB Streams é incluído sem custo extra
2. **Nenhuma mudança nos Lambdas existentes** — O stream captura TODAS as escritas automaticamente
3. **Exactly-once processing** — Garantido pelo DynamoDB Streams
4. **Simplicidade** — Apenas 1 novo Lambda (`automations-trigger`)
5. **Captura tudo** — Qualquer mudança no contato ou evento é detectada, incluindo as feitas por outros Lambdas, imports CSV, APIs externas, etc.

---

## Lambda: `automations-trigger`

### Runtime & Config

| Config | Valor |
|--------|-------|
| Runtime | Node.js 20.x |
| Handler | `index.handler` |
| Memory | 256 MB |
| Timeout | 30 segundos |
| Batch Size | 10 (DDB Stream) |
| Max Batching Window | 5 segundos |
| Starting Position | LATEST |
| Retry Attempts | 2 |

### Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `TABLE_NAME` | `Config_Table` |
| `AWS_REGION` | `sa-east-1` |

### Lógica Principal

```javascript
export async function handler(event) {
  for (const record of event.Records) {
    // Ignorar DELETEs
    if (record.eventName === 'REMOVE') continue;
    
    const newImage = record.dynamodb?.NewImage;
    const oldImage = record.dynamodb?.OldImage;
    const pk = newImage?.PK?.S;
    const sk = newImage?.SK?.S;
    
    // Só processar itens de contato
    if (!pk?.startsWith('CONTACT#')) continue;
    
    const contactId = pk.replace('CONTACT#', '');
    const changes = detectChanges(record.eventName, sk, newImage, oldImage);
    
    if (changes.length === 0) continue;
    
    // Buscar automações ativas que correspondem aos triggers detectados
    for (const change of changes) {
      const automations = await findMatchingAutomations(change);
      
      for (const automation of automations) {
        // Verificar se o contato já está em execução nesta automação
        // (evitar re-trigger do mesmo contato)
        await startExecutionIfNotRunning(automation, contactId, newImage);
      }
    }
  }
}
```

### Detecção de Mudanças

```javascript
function detectChanges(eventName, sk, newImage, oldImage) {
  const changes = [];
  
  if (sk === 'METADATA') {
    // INSERT = novo contato
    if (eventName === 'INSERT') {
      changes.push({ type: 'CONTACT_CREATED' });
    }
    
    if (eventName === 'MODIFY') {
      // Detectar tags adicionadas
      const oldTags = (oldImage?.tags?.L ?? []).map(t => t.S);
      const newTags = (newImage?.tags?.L ?? []).map(t => t.S);
      
      const addedTags = newTags.filter(t => !oldTags.includes(t));
      const removedTags = oldTags.filter(t => !newTags.includes(t));
      
      for (const tag of addedTags) {
        changes.push({ type: 'TAG_ADDED', params: { tagId: tag } });
      }
      for (const tag of removedTags) {
        changes.push({ type: 'TAG_REMOVED', params: { tagId: tag } });
      }
      
      // Detectar mudança de lifecycle
      const oldLifecycle = oldImage?.lifecycleStage?.S;
      const newLifecycle = newImage?.lifecycleStage?.S;
      if (oldLifecycle !== newLifecycle) {
        changes.push({ 
          type: 'LIFECYCLE_CHANGED',
          params: { newStage: newLifecycle, oldStage: oldLifecycle }
        });
      }
    }
  }
  
  // EVENT# = evento do contato
  if (sk?.startsWith('EVENT#') && eventName === 'INSERT') {
    const eventType = newImage?.eventType?.S;
    
    if (eventType === 'Purchase') {
      changes.push({ type: 'PURCHASE_MADE', params: { eventType } });
    } else if (eventType === 'CartAbandoned') {
      changes.push({ type: 'CART_ABANDONED', params: { eventType } });
    } else if (eventType === 'FormSubmit') {
      changes.push({ type: 'FORM_SUBMITTED', params: { eventType } });
    }
    
    // Sempre emitir EVENT_OCCURRED genérico
    changes.push({ type: 'EVENT_OCCURRED', params: { eventType } });
  }
  
  return changes;
}
```

### Busca de Automações

```javascript
async function findMatchingAutomations(change) {
  // Query todas as automações
  const { Items = [] } = await ddb.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': 'AUTOMATION' },
  }));
  
  return Items.filter(item => {
    if (item.status !== 'active') return false;
    if (!item.stateMachineArn) return false;
    
    const trigger = typeof item.trigger === 'string' 
      ? JSON.parse(item.trigger) 
      : item.trigger;
    
    // Tipo deve corresponder
    if (trigger.type !== change.type) return false;
    
    // Verificar params específicos
    if (trigger.type === 'TAG_ADDED' || trigger.type === 'TAG_REMOVED') {
      // Se a automação especifica uma tag, deve corresponder
      if (trigger.params.tagId && trigger.params.tagId !== change.params?.tagId) {
        return false;
      }
    }
    
    if (trigger.type === 'LIFECYCLE_CHANGED') {
      if (trigger.params.newStage && trigger.params.newStage !== change.params?.newStage) {
        return false;
      }
    }
    
    if (trigger.type === 'EVENT_OCCURRED') {
      if (trigger.params.eventType && trigger.params.eventType !== change.params?.eventType) {
        return false;
      }
    }
    
    return true;
  });
}
```

### Prevenção de Duplicatas

```javascript
async function startExecutionIfNotRunning(automation, contactId, contactData) {
  const executionName = `c-${contactId.replace(/[^a-zA-Z0-9_-]/g, '')}-${Date.now()}`;
  
  // Montar input com dados do contato
  const input = {
    contactId,
    email: contactData?.email?.S ?? '',
    fullName: contactData?.fullName?.S ?? '',
    phone: contactData?.phone?.S ?? '',
    lifecycleStage: contactData?.lifecycleStage?.S ?? '',
    tags: (contactData?.tags?.L ?? []).map(t => t.S),
    automationId: automation.id,
    automationName: automation.name,
    triggeredAt: new Date().toISOString(),
    triggerSource: 'dynamodb-stream',
  };
  
  try {
    await sfn.send(new StartExecutionCommand({
      stateMachineArn: automation.stateMachineArn,
      name: executionName,
      input: JSON.stringify(input),
    }));
    
    // Incrementar contador
    await ddb.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: 'AUTOMATION', SK: `AUTOMATION#${automation.id}` },
      UpdateExpression: 'ADD executionCount :inc',
      ExpressionAttributeValues: { ':inc': 1 },
    }));
    
    console.log(`Started execution for automation=${automation.name} contact=${contactId}`);
  } catch (err) {
    // ExecutionAlreadyExists = idempotência OK
    if (err.name !== 'ExecutionAlreadyExists') throw err;
  }
}
```

---

## Evitar Loop Infinito

**Problema:** A automação pode adicionar/remover tags no contato, o que gera novos eventos no Stream, que poderiam re-disparar a mesma automação.

**Solução:** O `automations-trigger` Lambda deve:

1. **Ignorar atualizações feitas pelo `automations-manager`** — Verificar o campo `updatedBy` (se existir) ou a presença de `$.lastAction` no contexto
2. **Usar nome de execução com contactId** — Step Functions rejeita execuções com mesmo nome (dentro de 90 dias)
3. **GSI de deduplicação** (opcional) — Criar item temporário `EXECUTION#automationId#contactId` com TTL para verificar se já está rodando

A solução mais simples é a #2: o nome do execution inclui contactId, então se o mesmo contato já está em execução, a nova tentativa falha silenciosamente.

**Para evitar loops causados pelo próprio fluxo:**
- O Lambda `automations-manager` (quando chamado pelo Step Functions como Task) NÃO deve disparar novo trigger para as mesmas tags/lifecycle que o fluxo adicionou
- Solução: usar um flag no UpdateItem: `SET _triggerSource = :src` quando a mudança é feita pelo Step Functions, e o `automations-trigger` ignora mudanças com `_triggerSource = 'automation'`

---

## IAM Policy: Lambda `automations-trigger`

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadDynamoDBStream",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetRecords",
        "dynamodb:GetShardIterator",
        "dynamodb:DescribeStream",
        "dynamodb:ListStreams"
      ],
      "Resource": "arn:aws:dynamodb:sa-east-1:176322301236:table/Config_Table/stream/*"
    },
    {
      "Sid": "QueryAutomations",
      "Effect": "Allow",
      "Action": [
        "dynamodb:Query",
        "dynamodb:UpdateItem"
      ],
      "Resource": "arn:aws:dynamodb:sa-east-1:176322301236:table/Config_Table"
    },
    {
      "Sid": "StartStepFunctions",
      "Effect": "Allow",
      "Action": "states:StartExecution",
      "Resource": "arn:aws:states:sa-east-1:176322301236:stateMachine:botica-auto-*"
    },
    {
      "Sid": "CloudWatchLogs",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:sa-east-1:176322301236:log-group:/aws/lambda/automations-trigger:*"
    }
  ]
}
```

---

## Configuração do DynamoDB Stream

| Config | Valor |
|--------|-------|
| Tabela | `Config_Table` |
| Stream View Type | `NEW_AND_OLD_IMAGES` |
| Event Source Mapping | Lambda `automations-trigger` |
| Filter Pattern | `{ "eventName": ["INSERT", "MODIFY"], "dynamodb": { "Keys": { "PK": { "S": [{"prefix": "CONTACT#"}] } } } }` |
| Batch Size | 10 |
| Max Batching Window | 5s |
| Starting Position | LATEST |
| Retry | 2 attempts |
| On Failure | SQS DLQ (opcional) |

**Nota sobre Event Filter Pattern:** O filtro no Event Source Mapping garante que o Lambda só é invocado para registros de contato (`CONTACT#`), ignorando automações, configurações, templates, etc. Isso reduz drasticamente as invocações desnecessárias.

---

## Fluxo Completo (Exemplo)

### Cenário: Tag "VIP" adicionada ao contato → automação "Boas-vindas VIP"

```
1. Operador adiciona tag "VIP" ao contato (via UI ou import)
   → Contact Lambda faz UpdateItem em CONTACT#{id}/METADATA (tags: [..., "VIP"])

2. DynamoDB Stream dispara evento MODIFY
   → automations-trigger Lambda recebe o record

3. Lambda detecta:
   - oldImage.tags = ["Pets"]
   - newImage.tags = ["Pets", "VIP"]
   - Mudança: TAG_ADDED com tagId="VIP"

4. Lambda busca automações ativas com trigger type=TAG_ADDED
   - Encontra: "Boas-vindas VIP" (trigger: { type: TAG_ADDED, params: { tagId: "VIP" } })

5. Lambda inicia execução do Step Functions:
   - stateMachineArn: arn:aws:states:...:botica-auto-{automationId}
   - input: { contactId, email, fullName, tags: ["Pets", "VIP"], ... }

6. Step Functions executa o fluxo:
   Enviar Email → Aguardar 3 dias → Condição → Adicionar Tag / Fim
```

### Cenário: Compra registrada → automação "Pós-compra"

```
1. Sistema registra evento de compra:
   → PutItem CONTACT#{id}/EVENT#2026-03-13T...#uuid com eventType="Purchase"

2. DynamoDB Stream dispara evento INSERT
   → automations-trigger Lambda recebe o record

3. Lambda detecta:
   - SK começa com "EVENT#"
   - eventType = "Purchase"
   - Mudanças: [PURCHASE_MADE, EVENT_OCCURRED]

4. Lambda busca automações com trigger type=PURCHASE_MADE
   - Encontra: "Email Pós-compra"

5. Lambda carrega dados do contato (GetItem CONTACT#{id}/METADATA)
   e inicia execução do Step Functions

6. Step Functions executa: Enviar Email agradecimento → Aguardar 7 dias → Enviar pesquisa NPS
```

---

## Passos para Implementação

### 1. Habilitar DynamoDB Stream na Config_Table
```bash
aws dynamodb update-table \
  --table-name Config_Table \
  --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES \
  --region sa-east-1
```

### 2. Criar o Lambda `automations-trigger`
- Código em `lambda/automations-trigger/index.mjs`
- Runtime: Node.js 20.x
- IAM Role com policies acima

### 3. Criar Event Source Mapping
```bash
aws lambda create-event-source-mapping \
  --function-name automations-trigger \
  --event-source-arn <DDB_STREAM_ARN> \
  --starting-position LATEST \
  --batch-size 10 \
  --maximum-batching-window-in-seconds 5 \
  --maximum-retry-attempts 2 \
  --filter-criteria '{"Filters":[{"Pattern":"{\"eventName\":[\"INSERT\",\"MODIFY\"],\"dynamodb\":{\"Keys\":{\"PK\":{\"S\":[{\"prefix\":\"CONTACT#\"}]}}}}"}]}'
```

### 4. Atualizar `automations-manager` para incluir flag anti-loop
Quando o Step Functions invoca o Lambda para ADD_TAG, REMOVE_TAG, CHANGE_LIFECYCLE:
- Adicionar `_triggerSource: 'automation'` no UpdateItem
- O `automations-trigger` ignora records com `_triggerSource = 'automation'`

---

## Estimativa de Custo

| Item | Custo Estimado (10K contatos, 50K eventos/mês) |
|------|------------------------------------------------|
| DynamoDB Stream | Grátis (incluído) |
| Lambda invocações (~50K events / batch 10 = ~5K invocações) | ~$0.01 |
| Lambda duração (~5K × 200ms × 256MB) | ~$0.03 |
| Step Functions (Standard) | ~$2.50 per 100K transitions |
| **Total adicional** | **~$2.54/mês** |

Extremamente econômico para o volume esperado.
