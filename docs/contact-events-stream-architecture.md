# Arquitetura: DynamoDB Streams — Contact Events & Audit Trail

> Documento de análise e design para:
> 1. **Condições de entrada (triggers)** — como o `automations-trigger` detecta eventos na tabela `ContactEvent`
> 2. **Geração automática de eventos** — DynamoDB Stream na `Config_Table` para registrar
>    mudanças de contato (tag, lifecycle, status) como registros EVENT# no histórico do contato

---

## Situação Atual

### Tabela: `Config_Table`

```
PK                          SK                                          Tipo
─────────────────────────── ─────────────────────────────────────────── ────────────
CONTACT#1cbb52fe-f384-...   METADATA                                    Dados do contato
CONTACT#1cbb52fe-f384-...   EVENT#2026-03-09T20:17:45Z#0103019cd4...   Evento SES (email)
AUTOMATION                  AUTOMATION#abc-123                           Automação
```

### Quem grava EVENT# hoje?

| Fonte | eventType | Como chega no DynamoDB |
|-------|-----------|----------------------|
| **SES Event Destination → SQS → contacts-api** | `Send`, `Delivery`, `Open`, `Click`, `Bounce`, `Complaint` | Lambda `contacts-api` faz PutItem |
| **Nada mais** | — | Mudanças de tag, lifecycle, status **NÃO** geram EVENT# |

### O que falta?

Atualmente, quando o operador muda uma tag, lifecycle ou status de um contato:
- O METADATA do contato é atualizado (`CONTACT#/METADATA`)
- **Nenhum EVENT# é criado** — não há registro histórico da mudança
- O `automations-trigger` detecta a mudança via DynamoDB Stream (MODIFY em METADATA)

**Mas esses eventos "internos" não ficam no histórico do contato.** Se alguém quiser ver
"quando a tag VIP foi adicionada?" ou "quando o status mudou para inactive?", não há registro.

---

## Análise: Preciso de outro DynamoDB Stream?

**Não.** A `Config_Table` já tem (ou terá) UM DynamoDB Stream habilitado. O DynamoDB permite
**múltiplas Event Source Mappings** (vários Lambdas) no mesmo stream.

```
Config_Table (1 DynamoDB Stream)
    │
    ├── Event Source Mapping 1 → automations-trigger
    │     Filter: PK prefix "CONTACT#", eventName INSERT/MODIFY
    │     Função: Disparar automações
    │
    └── Event Source Mapping 2 → contact-events-logger (NOVO)
          Filter: PK prefix "CONTACT#", SK = "METADATA", eventName MODIFY
          Função: Criar registros EVENT# de auditoria
```

### Por que não um stream separado?

| Opção | Viável? | Motivo |
|-------|---------|--------|
| Outro stream na mesma tabela | ❌ Impossível | DynamoDB permite **1 stream por tabela** |
| Tabela separada para contatos | ❌ Desnecessário | Contatos e eventos já coabitam na Config_Table (single-table design) |
| Outra Event Source Mapping no mesmo stream | ✅ **Correto** | Múltiplos Lambdas podem consumir do mesmo stream |
| Código inline nos Lambdas existentes | ⚠️ Alternativa | Funciona mas exige modificar N Lambdas diferentes |

### Decisão: **Nova Event Source Mapping → Lambda `contact-events-logger`**

**Motivos:**
1. **Centralizado** — Um único Lambda gera eventos para TODAS as modificações de METADATA, independente da fonte (UI, import, API, automação)
2. **Sem código duplicado** — Não precisa modificar `contacts-api`, `automations-manager`, `import-contacts`, etc.
3. **Audit trail completo** — Cada mudança gera um registro rastreável
4. **Custo zero adicional** — O stream já existe para o `automations-trigger`

---

## Estrutura do ContactEvent (EVENT#)

### Eventos SES existentes (referência)

```json
{
  "PK":           { "S": "CONTACT#1cbb52fe-f384-407a-93f3-65d79f041635" },
  "SK":           { "S": "EVENT#2026-03-09T20:17:45Z#0103019cd43fa122-85d28592-..." },
  "contactId":    { "S": "1cbb52fe-f384-407a-93f3-65d79f041635" },
  "eventType":    { "S": "Send" },
  "channel":      { "S": "email" },
  "campaignName": { "S": "VGVzdGVfZGVfRW52aW8" },
  "subject":      { "S": "Sem Assunto" },
  "details":      { "S": "No additional details" },
  "eventId":      { "S": "0103019cd43fa122-85d28592-..." },
  "createdAt":    { "S": "2026-03-09T20:17:46.130Z" }
}
```

### Novos eventos de sistema (audit trail)

| eventType | channel | Quando | Details |
|-----------|---------|--------|---------|
| `TagAdded` | `system` | Tag adicionada ao contato | `Tag 'VIP' adicionada` |
| `TagRemoved` | `system` | Tag removida do contato | `Tag 'VIP' removida` |
| `LifecycleChanged` | `system` | Estágio do funil alterado | `Lifecycle: lead → customer` |
| `StatusChanged` | `system` | Status do contato alterado | `Status: active → inactive` |
| `EmailStatusChanged` | `system` | Status do e-mail alterado | `Email status: subscribed → unsubscribed` |
| `ProfileUpdated` | `system` | Dados do perfil atualizados | `Email alterado de x@y.com para z@y.com` |

### Formato do evento de sistema

```json
{
  "PK": "CONTACT#1cbb52fe-f384-407a-93f3-65d79f041635",
  "SK": "EVENT#2026-03-13T15:30:00.000Z#sys-abc12345",
  "contactId": "1cbb52fe-f384-407a-93f3-65d79f041635",
  "eventType": "TagAdded",
  "channel": "system",
  "details": "Tag 'VIP' adicionada",
  "eventId": "sys-abc12345",
  "createdAt": "2026-03-13T15:30:00.000Z",
  "_eventSource": "stream-logger"
}
```

**Campo `_eventSource`**: Identifica que o evento foi criado pelo logger (não pelo SES/API).
Utilizado pelo `automations-trigger` para diferenciar fonte do evento se necessário.

---

## Lambda: `contact-events-logger`

### Runtime & Config

| Config | Valor |
|--------|-------|
| Runtime | Node.js 20.x |
| Handler | `index.handler` |
| Memory | 128 MB |
| Timeout | 15 segundos |
| Batch Size | 25 |
| Max Batching Window | 10 segundos |
| Starting Position | LATEST |
| Retry Attempts | 2 |

### Event Source Mapping — Filter Pattern

```json
{
  "Filters": [
    {
      "Pattern": "{\"eventName\":[\"MODIFY\"],\"dynamodb\":{\"Keys\":{\"PK\":{\"S\":[{\"prefix\":\"CONTACT#\"}]},\"SK\":{\"S\":[\"METADATA\"]}}}}"
    }
  ]
}
```

**Filtros aplicados:**
- `eventName = MODIFY` — Só mudanças (não INSERT de novos contatos)
- `PK prefix CONTACT#` — Só itens de contato
- `SK = METADATA` — Só o registro principal (não EVENT#)

> **Nota:** INSERTs de contato (CONTACT_CREATED) não geram evento de auditoria aqui
> porque o contato já aparece na lista com `createdAt`. Se quiser registrar, basta
> adicionar `"INSERT"` ao filtro de eventName.

### Lógica Principal

```javascript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { randomUUID } from 'crypto';

const TABLE_NAME = process.env.TABLE_NAME || 'Config_Table';
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'sa-east-1' }));

export async function handler(event) {
  const records = event.Records ?? [];
  let created = 0;

  for (const record of records) {
    try {
      if (record.eventName !== 'MODIFY') continue;

      const newImage = record.dynamodb?.NewImage;
      const oldImage = record.dynamodb?.OldImage;
      if (!newImage || !oldImage) continue;

      // Anti-loop: ignorar mudanças feitas por automações
      // (essas já foram detectadas pelo automations-trigger)
      if (newImage._triggerSource?.S === 'automation') continue;

      const pk = newImage.PK?.S;
      const contactId = pk?.replace('CONTACT#', '');
      if (!contactId) continue;

      const changes = detectMetadataChanges(newImage, oldImage);

      for (const change of changes) {
        const now = new Date().toISOString();
        const eventId = `sys-${randomUUID().slice(0, 8)}`;

        await ddb.send(new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            PK: pk,
            SK: `EVENT#${now}#${eventId}`,
            contactId,
            eventType: change.eventType,
            channel: 'system',
            details: change.details,
            eventId,
            createdAt: now,
            _eventSource: 'stream-logger',
          },
        }));
        created++;
      }
    } catch (err) {
      console.error('Error processing record:', err);
    }
  }

  console.log(`Processed ${records.length} records, created ${created} events`);
  return { processed: records.length, created };
}

function detectMetadataChanges(newImage, oldImage) {
  const changes = [];

  // ── Tags ──
  const oldTags = (oldImage.tags?.L ?? []).map(t => t.S).filter(Boolean);
  const newTags = (newImage.tags?.L ?? []).map(t => t.S).filter(Boolean);

  for (const tag of newTags) {
    if (!oldTags.includes(tag)) {
      changes.push({ eventType: 'TagAdded', details: `Tag '${tag}' adicionada` });
    }
  }
  for (const tag of oldTags) {
    if (!newTags.includes(tag)) {
      changes.push({ eventType: 'TagRemoved', details: `Tag '${tag}' removida` });
    }
  }

  // ── Lifecycle ──
  const oldLifecycle = oldImage.lifecycleStage?.S;
  const newLifecycle = newImage.lifecycleStage?.S;
  if (oldLifecycle && newLifecycle && oldLifecycle !== newLifecycle) {
    changes.push({
      eventType: 'LifecycleChanged',
      details: `Lifecycle: ${oldLifecycle} → ${newLifecycle}`,
    });
  }

  // ── Status ──
  const oldStatus = oldImage.status?.S;
  const newStatus = newImage.status?.S;
  if (oldStatus && newStatus && oldStatus !== newStatus) {
    changes.push({
      eventType: 'StatusChanged',
      details: `Status: ${oldStatus} → ${newStatus}`,
    });
  }

  // ── Email Status ──
  const oldEmailStatus = oldImage.emailStatus?.S;
  const newEmailStatus = newImage.emailStatus?.S;
  if (oldEmailStatus && newEmailStatus && oldEmailStatus !== newEmailStatus) {
    changes.push({
      eventType: 'EmailStatusChanged',
      details: `Email status: ${oldEmailStatus} → ${newEmailStatus}`,
    });
  }

  // ── Profile fields (email, nome, telefone) ──
  const profileChanges = [];
  if (oldImage.email?.S !== newImage.email?.S && newImage.email?.S) {
    profileChanges.push(`Email alterado para ${newImage.email.S}`);
  }
  if (oldImage.fullName?.S !== newImage.fullName?.S && newImage.fullName?.S) {
    profileChanges.push(`Nome alterado para ${newImage.fullName.S}`);
  }
  if (oldImage.phone?.S !== newImage.phone?.S && newImage.phone?.S) {
    profileChanges.push(`Telefone alterado para ${newImage.phone.S}`);
  }
  if (profileChanges.length > 0) {
    changes.push({
      eventType: 'ProfileUpdated',
      details: profileChanges.join('; '),
    });
  }

  return changes;
}
```

---

## Interação com `automations-trigger`

### Fluxo completo: Tag "VIP" adicionada

```
1. Operador/API/Import adiciona tag "VIP" ao contato
   → UpdateItem CONTACT#{id}/METADATA (tags: [..., "VIP"])

2. DynamoDB Stream dispara MODIFY record

3. Event Source Mapping 1 → automations-trigger
   ├── Detecta TAG_ADDED (tagId: "VIP")
   ├── Busca automações com trigger TAG_ADDED + tagId="VIP"
   └── StartExecution (se encontrar automação correspondente)

4. Event Source Mapping 2 → contact-events-logger
   ├── Detecta tag "VIP" adicionada
   └── PutItem EVENT#...#sys-xxx (eventType: "TagAdded", details: "Tag 'VIP' adicionada")

5. O PutItem do passo 4 gera um NOVO record no Stream (INSERT de EVENT#)

6. Event Source Mapping 1 → automations-trigger (recebe o INSERT)
   ├── Detecta EVENT_OCCURRED (eventType: "TagAdded")
   ├── Busca automações com trigger EVENT_OCCURRED + eventType="TagAdded"
   └── StartExecution (se encontrar — seria uma automação DIFERENTE da do passo 3)

7. Event Source Mapping 2 → NÃO invocado (filtro requer SK=METADATA, mas SK=EVENT#)
```

### Tabela de disparo por tipo de trigger

| Trigger da Automação | Detectado pelo | Origem do Record |
|---------------------|---------------|-----------------|
| `CONTACT_CREATED` | automations-trigger | INSERT em METADATA |
| `TAG_ADDED` | automations-trigger | MODIFY em METADATA (diff tags) |
| `TAG_REMOVED` | automations-trigger | MODIFY em METADATA (diff tags) |
| `LIFECYCLE_CHANGED` | automations-trigger | MODIFY em METADATA (diff lifecycle) |
| `PURCHASE_MADE` | automations-trigger | INSERT em EVENT# (eventType=Purchase) |
| `CART_ABANDONED` | automations-trigger | INSERT em EVENT# (eventType=CartAbandoned) |
| `FORM_SUBMITTED` | automations-trigger | INSERT em EVENT# (eventType=FormSubmit) |
| `EVENT_OCCURRED` | automations-trigger | INSERT em EVENT# (qualquer eventType) |

**Nota:** Os EVENT# criados pelo `contact-events-logger` (TagAdded, LifecycleChanged, etc.)
também disparam `EVENT_OCCURRED` no automations-trigger. Isso permite automações que reagem
a "qualquer evento" do contato, incluindo mudanças internas.

---

## Risco de Loop & Mitigação

### Cenário potencial de loop

```
1. Automação adiciona tag "VIP" ao contato
2. MODIFY em METADATA → contact-events-logger cria EVENT#TagAdded
3. INSERT EVENT#TagAdded → automations-trigger detecta EVENT_OCCURRED
4. Se existir automação EVENT_OCCURRED(TagAdded) → pode disparar nova automação
5. Nova automação adiciona outra tag → volta ao passo 1
```

### Mitigação (já implementada)

1. **Anti-loop `_triggerSource`**: Quando o `automations-manager` modifica o contato (via Step Functions), inclui `_triggerSource = 'automation'` no UpdateItem. O `automations-trigger` e o `contact-events-logger` ignoram esses records. ✅

2. **Nome de execução único**: `c-{contactId}-{timestamp}` — Step Functions rejeita execuções com nome duplicado dentro de 90 dias. ✅

3. **Filtro do logger**: O `contact-events-logger` só processa MODIFY em METADATA — não processa seus próprios INSERTs de EVENT#. ✅

```
Mudança feita por automação:
  MODIFY METADATA (_triggerSource=automation) → contact-events-logger IGNORA
                                              → automations-trigger IGNORA

Mudança feita por operador/API/import:
  MODIFY METADATA (sem _triggerSource) → contact-events-logger CRIA EVENT#
                                       → automations-trigger DETECTA e DISPARA

EVENT# criado pelo logger:
  INSERT EVENT# → automations-trigger DETECTA EVENT_OCCURRED
                → contact-events-logger NÃO invocado (filtro SK=METADATA)
```

---

## IAM Policy: Lambda `contact-events-logger`

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
      "Sid": "WriteContactEvents",
      "Effect": "Allow",
      "Action": "dynamodb:PutItem",
      "Resource": "arn:aws:dynamodb:sa-east-1:176322301236:table/Config_Table"
    },
    {
      "Sid": "CloudWatchLogs",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:sa-east-1:176322301236:log-group:/aws/lambda/contact-events-logger:*"
    }
  ]
}
```

---

## Passos para Implementação

### 1. Verificar que DynamoDB Stream já está habilitado

```bash
aws dynamodb describe-table \
  --table-name Config_Table \
  --query "Table.StreamSpecification" \
  --region sa-east-1
```

Se não estiver habilitado:
```bash
aws dynamodb update-table \
  --table-name Config_Table \
  --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES \
  --region sa-east-1
```

### 2. Criar o Lambda `contact-events-logger`

```bash
# Empacotar e subir o Lambda
cd lambda/contact-events-logger
zip -r function.zip index.mjs package.json

aws lambda create-function \
  --function-name contact-events-logger \
  --runtime nodejs20.x \
  --handler index.handler \
  --role arn:aws:iam::176322301236:role/ContactEventsLoggerRole \
  --zip-file fileb://function.zip \
  --memory-size 128 \
  --timeout 15 \
  --environment "Variables={TABLE_NAME=Config_Table,AWS_REGION=sa-east-1}" \
  --region sa-east-1
```

### 3. Obter Stream ARN

```bash
STREAM_ARN=$(aws dynamodb describe-table \
  --table-name Config_Table \
  --query "Table.LatestStreamArn" \
  --output text \
  --region sa-east-1)

echo $STREAM_ARN
```

### 4. Criar Event Source Mapping (com filtro)

```bash
aws lambda create-event-source-mapping \
  --function-name contact-events-logger \
  --event-source-arn $STREAM_ARN \
  --starting-position LATEST \
  --batch-size 25 \
  --maximum-batching-window-in-seconds 10 \
  --maximum-retry-attempts 2 \
  --filter-criteria '{"Filters":[{"Pattern":"{\"eventName\":[\"MODIFY\"],\"dynamodb\":{\"Keys\":{\"PK\":{\"S\":[{\"prefix\":\"CONTACT#\"}]},\"SK\":{\"S\":[\"METADATA\"]}}}}"}]}'
```

### 5. Criar Event Source Mapping para automations-trigger (se ainda não existir)

```bash
aws lambda create-event-source-mapping \
  --function-name automations-trigger \
  --event-source-arn $STREAM_ARN \
  --starting-position LATEST \
  --batch-size 10 \
  --maximum-batching-window-in-seconds 5 \
  --maximum-retry-attempts 2 \
  --filter-criteria '{"Filters":[{"Pattern":"{\"eventName\":[\"INSERT\",\"MODIFY\"],\"dynamodb\":{\"Keys\":{\"PK\":{\"S\":[{\"prefix\":\"CONTACT#\"}]}}}}"}]}'
```

---

## Estimativa de Custo Adicional

| Item | Custo Estimado (10K contatos, ~20K modificações/mês) |
|------|------------------------------------------------------|
| DynamoDB Stream reads | Grátis (já habilitado) |
| Lambda invocações (~20K events / batch 25 = ~800) | ~$0.001 |
| Lambda duração (~800 × 100ms × 128MB) | ~$0.001 |
| DynamoDB PutItem para EVENT# (~20K writes) | ~$0.025 (WCU on-demand) |
| **Total adicional** | **~$0.03/mês** |

Custo praticamente zero. O DynamoDB PutItem é a parte mais cara, e mesmo com 20K writes/mês
é menos de 3 centavos.

---

## Diagrama Completo: Ambos os Streams

```
Config_Table (DynamoDB)
    │
    │  DynamoDB Stream (NEW_AND_OLD_IMAGES)
    │
    ├─────────────────────────────────────────────────────┐
    │                                                     │
    ▼                                                     ▼
Event Source Mapping 1                           Event Source Mapping 2
Filter: CONTACT# prefix                         Filter: CONTACT# prefix
  + INSERT/MODIFY                                  + MODIFY only
                                                   + SK = "METADATA"
    │                                                     │
    ▼                                                     ▼
Lambda: automations-trigger                      Lambda: contact-events-logger
    │                                                     │
    ├── METADATA INSERT → CONTACT_CREATED                 ├── Diff tags → TagAdded/TagRemoved
    ├── METADATA MODIFY → TAG_ADDED/REMOVED               ├── Diff lifecycle → LifecycleChanged
    │                   → LIFECYCLE_CHANGED                ├── Diff status → StatusChanged
    ├── EVENT# INSERT  → PURCHASE_MADE                    ├── Diff email status → EmailStatusChanged
    │                  → CART_ABANDONED                    └── Diff profile → ProfileUpdated
    │                  → FORM_SUBMITTED                         │
    │                  → EVENT_OCCURRED                         │
    │                                                           ▼
    ▼                                                     PutItem EVENT# no DynamoDB
Step Functions (StartExecution)                   (events de auditoria do contato)
```
