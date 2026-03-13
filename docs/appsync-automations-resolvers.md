# AppSync — Lambda Resolver (Automações + Step Functions)

> Resolvers AppSync ↔ **Lambda** (`automations-manager`) para CRUD de Automações de Marketing
> e gerenciamento completo de AWS Step Functions.
>
> O `automations-manager` é um Lambda de propósito duplo:
> 1. **AppSync resolver** — CRUD de automações (DynamoDB + Step Functions)
> 2. **Step Functions Task handler** — operações de contato (tags, lifecycle, condições)
>
> **Envio de e-mails** é feito nativamente pelo Step Functions via integração SQS.
> Não há Lambda separado (marketing-worker).

---

## Arquitetura

```
AppSync (GraphQL)
    │
    ▼
Lambda: automations-manager          (event.field → CRUD)
    │
    ├── DynamoDB (Config_Table)
    │     PK = AUTOMATION, SK = AUTOMATION#{id}      (automações)
    │     PK = CONTACT#{uuid}, SK = METADATA          (contatos)
    │
    └── AWS Step Functions (Standard)
          ├── CreateStateMachine (ASL gerado dos nós)
          ├── UpdateStateMachine
          ├── DeleteStateMachine
          ├── StartExecution (carrega contato do DDB → input)
          ├── StopExecution
          ├── ListExecutions
          ├── DescribeExecution
          └── GetExecutionHistory

Step Functions State Machine (execução)
    │
    ├── SQS: sendMessage              → Envio de e-mail (fila transacional)
    │     QueueUrl: https://sqs.sa-east-1.amazonaws.com/176322301236/emails-transactional
    │
    ├── Lambda: automations-manager   → Operações de contato (event.action)
    │     ├── ADD_TAG
    │     ├── REMOVE_TAG
    │     ├── CHANGE_LIFECYCLE
    │     ├── CHANGE_STATUS
    │     └── EVALUATE_CONDITION
    │
    ├── Wait                          → Pausas temporizadas
    └── Choice                        → Bifurcação condicional
```

---

## Lambda: `automations-manager`

**Runtime:** Node.js 20.x
**Handler:** `index.handler`
**Pacote:** `lambda/automations-manager/`

### Variáveis de Ambiente

| Variável | Descrição |
|---|---|
| `TABLE_NAME` | Nome da tabela DynamoDB (`Config_Table`) |
| `SQS_QUEUE_URL` | URL da fila SQS transacional (`https://sqs.sa-east-1.amazonaws.com/176322301236/emails-transactional`) |
| `SFN_ROLE_ARN` | ARN do IAM Role para execução do Step Functions |
| `AWS_REGION` | Região AWS (default `sa-east-1`) |
| `AWS_LAMBDA_FUNCTION_ARN` | Self ARN (injetado pelo Lambda runtime, usado no ASL) |

### Dispatch

O handler analisa a estrutura do evento recebido:

- **`event.field`** → AppSync resolver (CRUD de automações)
- **`event.action`** → Step Functions Task (operações de contato/condições)

---

## Políticas IAM

### IAM Policy: Lambda `automations-manager`

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "StepFunctionsManagement",
      "Effect": "Allow",
      "Action": [
        "states:CreateStateMachine",
        "states:UpdateStateMachine",
        "states:DeleteStateMachine",
        "states:DescribeStateMachine",
        "states:StartExecution",
        "states:StopExecution",
        "states:ListExecutions",
        "states:DescribeExecution",
        "states:GetExecutionHistory",
        "states:ListTagsForResource",
        "states:TagResource"
      ],
      "Resource": "arn:aws:states:sa-east-1:176322301236:stateMachine:botica-auto-*"
    },
    {
      "Sid": "StepFunctionsExecutions",
      "Effect": "Allow",
      "Action": [
        "states:DescribeExecution",
        "states:StopExecution",
        "states:GetExecutionHistory"
      ],
      "Resource": "arn:aws:states:sa-east-1:176322301236:execution:botica-auto-*:*"
    },
    {
      "Sid": "DynamoDBAccess",
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:sa-east-1:176322301236:table/Config_Table"
    },
    {
      "Sid": "IAMPassRole",
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": "arn:aws:iam::176322301236:role/BoticaStation-StepFunctions-Role",
      "Condition": {
        "StringEquals": {
          "iam:PassedToService": "states.amazonaws.com"
        }
      }
    },
    {
      "Sid": "CloudWatchLogs",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:sa-east-1:176322301236:log-group:/aws/lambda/automations-manager:*"
    }
  ]
}
```

### IAM Policy: Step Functions Execution Role (`BoticaStation-StepFunctions-Role`)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "InvokeAutomationsManager",
      "Effect": "Allow",
      "Action": "lambda:InvokeFunction",
      "Resource": "arn:aws:lambda:sa-east-1:176322301236:function:automations-manager"
    },
    {
      "Sid": "SendEmailSQS",
      "Effect": "Allow",
      "Action": "sqs:SendMessage",
      "Resource": "arn:aws:sqs:sa-east-1:176322301236:emails-transactional"
    },
    {
      "Sid": "CloudWatchLogs",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogDelivery",
        "logs:GetLogDelivery",
        "logs:UpdateLogDelivery",
        "logs:DeleteLogDelivery",
        "logs:ListLogDeliveries",
        "logs:PutResourcePolicy",
        "logs:DescribeResourcePolicies",
        "logs:DescribeLogGroups"
      ],
      "Resource": "*"
    },
    {
      "Sid": "XRay",
      "Effect": "Allow",
      "Action": [
        "xray:PutTraceSegments",
        "xray:PutTelemetryRecords",
        "xray:GetSamplingRules",
        "xray:GetSamplingTargets"
      ],
      "Resource": "*"
    }
  ]
}
```

**Trust Policy** do Step Functions Role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "states.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

---

## Dispatch por Campo GraphQL (AppSync)

| Field (AppSync) | Operação | Tipo |
|---|---|---|
| `listAutomations` | Query DDB + enrich com SFN status | Query |
| `getAutomation` | GetItem + DescribeStateMachine | Query |
| `createAutomation` | PutItem + CreateStateMachine (ASL gerado) | Mutation |
| `updateAutomation` | UpdateItem + UpdateStateMachine | Mutation |
| `deleteAutomation` | DeleteItem + DeleteStateMachine | Mutation |
| `updateAutomationStatus` | UpdateItem (status) | Mutation |
| `duplicateAutomation` | Copy + CreateStateMachine | Mutation |
| `startExecution` | GetItem contato + StartExecution | Mutation |
| `stopExecution` | StopExecution | Mutation |
| `listExecutions` | ListExecutions (por automationId) | Query |
| `describeExecution` | DescribeExecution + tags | Query |
| `getExecutionHistory` | GetExecutionHistory | Query |

---

## Dispatch por Action (Step Functions Task)

| Action | Operação | DynamoDB |
|---|---|---|
| `ADD_TAG` | Adiciona tag ao contato (list_append, sem duplicatas) | UpdateItem `CONTACT#{id}` |
| `REMOVE_TAG` | Remove tag do contato (busca índice + REMOVE) | GetItem + UpdateItem |
| `CHANGE_LIFECYCLE` | Altera lifecycleStage do contato | UpdateItem |
| `CHANGE_STATUS` | Altera status do contato | UpdateItem |
| `EVALUATE_CONDITION` | Avalia condição contra dados do contato | GetItem → resolve field → evaluate |

### Operadores de Condição

`EQUALS`, `NOT_EQUALS`, `CONTAINS`, `NOT_CONTAINS`, `GREATER_THAN`, `LESS_THAN`, `EXISTS`, `NOT_EXISTS`

### Campos de Condição (field paths)

- `contact.email`, `contact.fullName`, `contact.phone`
- `contact.tags` (array — suporta CONTAINS/NOT_CONTAINS)
- `contact.lifecycleStage`, `contact.status`
- `contact.stats.emailsSent`, `contact.stats.emailOpens`
- `contact.cashbackInfo.currentBalance`
- `contact.ecommerceInfo.paidOrders`

---

## Configuração do Data Source no AppSync

### Data Source: `AutomationsManagerLambda`

- **Tipo:** `AWS_LAMBDA`
- **Lambda ARN:** ARN do `automations-manager`
- **Service Role:** Role com `lambda:InvokeFunction` para o Lambda

### Request Mapping (JS Resolver — APPSYNC_JS 1.0.0)

```javascript
export function request(ctx) {
  return {
    operation: 'Invoke',
    payload: {
      field: ctx.info.fieldName,
      arguments: ctx.args,
      identity: ctx.identity,
    },
  }
}

export function response(ctx) {
  if (ctx.error) {
    return util.error(ctx.error.message, ctx.error.type)
  }
  return ctx.result
}
```

---

## Geração de ASL (Amazon States Language)

O Lambda gera ASL automaticamente a partir dos nós do canvas ao criar/atualizar.

### Mapeamento de Nós → ASL States

| Tipo de Nó | ASL State | Resource |
|---|---|---|
| `ACTION_SEND_EMAIL` | Task | `arn:aws:states:::sqs:sendMessage` (SQS nativo) |
| `ACTION_ADD_TAG` | Task | Lambda ARN (automations-manager) |
| `ACTION_REMOVE_TAG` | Task | Lambda ARN (automations-manager) |
| `ACTION_CHANGE_LIFECYCLE` | Task | Lambda ARN (automations-manager) |
| `WAIT` | Wait | — (Seconds calculado) |
| `CONDITION` | Task + Choice | Lambda ARN (eval) + Choice |
| `END` | Succeed | — |

### Tags nas State Machines

```json
[
  { "key": "BoticaStation", "value": "Automations" },
  { "key": "automationId", "value": "<uuid>" },
  { "key": "automationName", "value": "<nome>" }
]
```

### Nomenclatura

- **State Machine:** `botica-auto-{automationId}`
- **Execution:** `c-{contactId}-{timestamp}`

---

## Fluxo de Execução (startExecution)

```
1. Frontend → startExecution(automationId, contactId)
2. Lambda:
   a. GetItem → busca automação e stateMachineArn
   b. GetItem → busca contato (CONTACT#{id}, METADATA)
   c. Monta executionInput com dados do contato:
      { contactId, email, fullName, phone, lifecycleStage, tags, automationId, automationName }
   d. StartExecutionCommand({ stateMachineArn, input })
   e. Incrementa executionCount
3. Step Functions executa a state machine com dados do contato no input
```

---

## Exemplo de ASL Gerado

Para: "Boas-Vindas" → Enviar Email → Aguardar 3 dias → Condição (tag?) → Adicionar Tag / Fim

```json
{
  "Comment": "BoticaStation Automation: Boas-Vindas",
  "StartAt": "node_abc",
  "States": {
    "node_abc": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sqs:sendMessage",
      "Parameters": {
        "QueueUrl": "https://sqs.sa-east-1.amazonaws.com/176322301236/emails-transactional",
        "MessageBody": {
          "toAddresses.$": "$.email",
          "from": { "email": "contato@botica.com.br" },
          "templateName": "welcome-email",
          "templateData": {
            "nome.$": "$.fullName"
          },
          "configurationSet": "default",
          "tags": [
            { "Name": "campanha", "Value": "Boas-Vindas" },
            { "Name": "automacao", "Value": "true" }
          ]
        }
      },
      "ResultPath": "$.lastAction",
      "Next": "node_def"
    },
    "node_def": {
      "Type": "Wait",
      "Seconds": 259200,
      "Next": "node_ghi_eval"
    },
    "node_ghi_eval": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:sa-east-1:176322301236:function:automations-manager",
      "Parameters": {
        "action": "EVALUATE_CONDITION",
        "field": "contact.tags",
        "operator": "CONTAINS",
        "value": "engajado",
        "contactId.$": "$.contactId"
      },
      "ResultPath": "$.conditionResult",
      "Next": "node_ghi"
    },
    "node_ghi": {
      "Type": "Choice",
      "Choices": [{
        "Variable": "$.conditionResult.result",
        "BooleanEquals": true,
        "Next": "node_end"
      }],
      "Default": "node_jkl"
    },
    "node_jkl": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:sa-east-1:176322301236:function:automations-manager",
      "Parameters": {
        "action": "ADD_TAG",
        "tagId": "engajado",
        "contactId.$": "$.contactId"
      },
      "ResultPath": "$.lastAction",
      "Next": "node_end"
    },
    "node_end": {
      "Type": "Succeed"
    }
  }
}
```

---

## Estrutura do Contato (DynamoDB)

O `startExecution` carrega os dados do contato e os passa como input da execução:

```
PK: CONTACT#{uuid}
SK: METADATA

{
  email: "joao@email.com",
  fullName: "João Paulo",
  phone: "+5541999999999",
  tags: ["Pets", "VIP"],           // List
  lifecycleStage: "customer",       // lead | subscriber | customer
  status: "active",                 // active | inactive | bounced
  emailStatus: "subscribed",
  phoneStatus: "não verificado",
  stats: {
    emailsSent: 5,
    emailOpens: 3,
    emailClicks: 1,
    campaignsReceived: 2
  },
  cashbackInfo: {
    currentBalance: "50.00",
    totalEarned: "150.00"
  },
  ecommerceInfo: {
    paidOrders: 3,
    totalRevenue: "450.00"
  },
  source: "import",
  createdAt: "2025-01-15T...",
  updatedAt: "2025-07-01T..."
}
```

---

## Payload de E-mail (SQS)

O Step Functions envia diretamente para a fila SQS transacional:

```json
{
  "toAddresses": "joao@email.com",
  "from": {
    "email": "contato@botica.com.br"
  },
  "templateName": "welcome-email",
  "templateData": {
    "nome": "João Paulo",
    "saldo": "50.00"
  },
  "configurationSet": "default",
  "tags": [
    { "Name": "campanha", "Value": "Boas-Vindas" },
    { "Name": "automacao", "Value": "true" }
  ]
}
```

### Template Data — Valores Dinâmicos

No editor de automação, o usuário define pares chave/valor para `templateData`.
Valores que começam com `$.` são referências JSONPath ao input da execução (dados do contato):

| Chave | Valor | Resolução |
|---|---|---|
| `nome` | `$.fullName` | JSONPath → `"João Paulo"` |
| `email` | `$.email` | JSONPath → `"joao@email.com"` |
| `saldo` | `$.cashbackInfo.currentBalance` | JSONPath → `"50.00"` |
| `loja` | `Botica Alternativa` | Valor estático |
