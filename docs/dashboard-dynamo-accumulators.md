# Dashboard — Registros Acumuladores no DynamoDB

> Estrutura dos registros pré-computados que alimentam o dashboard sem necessidade de Scan.
> O frontend usará dados fake para desenvolvimento; os registros abaixo descrevem
> o contrato final com o backend.

---

## 1. Visão Geral

O dashboard exibe KPIs financeiros e operacionais em tempo real.
Cada métrica é armazenada como um **registro acumulador** em tabelas do DynamoDB
já existentes, atualizado atomicamente (ADD) por Lambdas/resolvers.

O frontend recebe os dados por meio de uma query GraphQL única:
```graphql
getDashboardMetrics(period: DashboardPeriod!): DashboardMetrics!
```

### Períodos Suportados

| Enum         | Descrição           |
|---|---|
| `TODAY`      | Hoje (desde 00:00)  |
| `THIS_MONTH` | Mês atual           |
| `LAST_MONTH` | Mês anterior        |
| `LAST_30_DAYS` | Últimos 30 dias   |
| `THIS_YEAR`  | Ano corrente        |

---

## 2. Registros Acumuladores — Config_Table

Todos os acumuladores de dashboard vivem na tabela `Config_Table` com prefixo `METRICS`.

### 2.1 Métricas de E-mail (por período)

| PK | SK | Campos |
|---|---|---|
| `METRICS` | `EMAIL#2026-03-13` | `sent`, `delivered`, `opened`, `clicked`, `bounced`, `complained`, `unsubscribed` |
| `METRICS` | `EMAIL#2026-03` | mesmos campos (acumulado mensal) |
| `METRICS` | `EMAIL#2026` | mesmos campos (acumulado anual) |

**Exemplo — dia 2026-03-13:**
```json
{
  "PK": "METRICS",
  "SK": "EMAIL#2026-03-13",
  "sent": 1250,
  "delivered": 1230,
  "opened": 615,
  "clicked": 185,
  "bounced": 15,
  "complained": 5,
  "unsubscribed": 8
}
```

### 2.2 Métricas de Campanha (por período)

| PK | SK | Campos |
|---|---|---|
| `METRICS` | `CAMPAIGNS#2026-03-13` | `totalSent`, `totalScheduled`, `totalDraft`, `revenue` |
| `METRICS` | `CAMPAIGNS#2026-03` | mesmos campos |
| `METRICS` | `CAMPAIGNS#2026` | mesmos campos |

**Exemplo:**
```json
{
  "PK": "METRICS",
  "SK": "CAMPAIGNS#2026-03-13",
  "totalSent": 3,
  "totalScheduled": 2,
  "totalDraft": 5,
  "revenue": 4580.00
}
```

### 2.3 Métricas de Cashback (por período)

| PK | SK | Campos |
|---|---|---|
| `METRICS` | `CASHBACK#2026-03-13` | `totalIssued`, `totalRedeemed`, `totalExpired`, `amountIssued`, `amountRedeemed`, `amountExpired`, `activeBalance` |
| `METRICS` | `CASHBACK#2026-03` | mesmos campos |
| `METRICS` | `CASHBACK#2026` | mesmos campos |

**Exemplo:**
```json
{
  "PK": "METRICS",
  "SK": "CASHBACK#2026-03-13",
  "totalIssued": 48,
  "totalRedeemed": 22,
  "totalExpired": 3,
  "amountIssued": 1440.00,
  "amountRedeemed": 660.00,
  "amountExpired": 90.00,
  "activeBalance": 12350.50
}
```

### 2.4 Métricas de Ecommerce (por período)

| PK | SK | Campos |
|---|---|---|
| `METRICS` | `ECOMMERCE#2026-03-13` | `orders`, `revenue`, `avgTicket`, `abandonedCarts`, `abandonedValue`, `conversionRate` |
| `METRICS` | `ECOMMERCE#2026-03` | mesmos campos |
| `METRICS` | `ECOMMERCE#2026` | mesmos campos |

**Exemplo:**
```json
{
  "PK": "METRICS",
  "SK": "ECOMMERCE#2026-03-13",
  "orders": 35,
  "revenue": 8750.00,
  "avgTicket": 250.00,
  "abandonedCarts": 12,
  "abandonedValue": 3600.00,
  "conversionRate": 3.2
}
```

### 2.5 Métricas de Automação (por período)

| PK | SK | Campos |
|---|---|---|
| `METRICS` | `AUTOMATIONS#2026-03-13` | `totalActive`, `totalExecutions`, `emailsSentByAutomation`, `conversions` |
| `METRICS` | `AUTOMATIONS#2026-03` | mesmos campos |
| `METRICS` | `AUTOMATIONS#2026` | mesmos campos |

**Exemplo:**
```json
{
  "PK": "METRICS",
  "SK": "AUTOMATIONS#2026-03-13",
  "totalActive": 5,
  "totalExecutions": 340,
  "emailsSentByAutomation": 680,
  "conversions": 28
}
```

### 2.6 Série temporal — Últimos 30 dias (para gráficos)

Os gráficos do dashboard são montados com os registros diários (`EMAIL#YYYY-MM-DD`, etc.).
A query `getDashboardMetrics` retorna um array `dailySeries` com os últimos 30 dias resumidos.

---

## 3. Registro de Contadores de Contato (já existente)

Já implementado na tabela `Contact`:

| PK | SK | Campos |
|---|---|---|
| `COUNTER` | `TOTAL` | `total`, `byLifecycle: { lead, subscriber, customer }`, `updatedAt` |

Acessado via query `getContactCounters` existente.

---

## 4. Schema GraphQL — Novas Adições

```graphql
enum DashboardPeriod {
  TODAY
  THIS_MONTH
  LAST_MONTH
  LAST_30_DAYS
  THIS_YEAR
}

type EmailMetrics {
  sent: Int!
  delivered: Int!
  opened: Int!
  clicked: Int!
  bounced: Int!
  complained: Int!
  unsubscribed: Int!
}

type CampaignMetricsSummary {
  totalSent: Int!
  totalScheduled: Int!
  totalDraft: Int!
  revenue: Float!
}

type CashbackMetrics {
  totalIssued: Int!
  totalRedeemed: Int!
  totalExpired: Int!
  amountIssued: Float!
  amountRedeemed: Float!
  amountExpired: Float!
  activeBalance: Float!
}

type EcommerceMetrics {
  orders: Int!
  revenue: Float!
  avgTicket: Float!
  abandonedCarts: Int!
  abandonedValue: Float!
  conversionRate: Float!
}

type AutomationMetrics {
  totalActive: Int!
  totalExecutions: Int!
  emailsSentByAutomation: Int!
  conversions: Int!
}

type DailyDataPoint {
  date: String!
  emailsSent: Int!
  emailsOpened: Int!
  emailsClicked: Int!
  revenue: Float!
  orders: Int!
  cashbackIssued: Float!
}

type DashboardMetrics {
  email: EmailMetrics!
  campaigns: CampaignMetricsSummary!
  cashback: CashbackMetrics!
  ecommerce: EcommerceMetrics!
  automations: AutomationMetrics!
  dailySeries: [DailyDataPoint!]!
}

type Query {
  getDashboardMetrics(period: DashboardPeriod!): DashboardMetrics!
}
```

---

## 5. Dados Fake para Desenvolvimento

Use os dados abaixo diretamente no frontend enquanto o backend não implementa os resolvers.

### Período: THIS_MONTH (Março 2026)

```json
{
  "email": {
    "sent": 12480,
    "delivered": 12231,
    "opened": 5870,
    "clicked": 1620,
    "bounced": 187,
    "complained": 62,
    "unsubscribed": 94
  },
  "campaigns": {
    "totalSent": 18,
    "totalScheduled": 4,
    "totalDraft": 7,
    "revenue": 47850.00
  },
  "cashback": {
    "totalIssued": 580,
    "totalRedeemed": 312,
    "totalExpired": 45,
    "amountIssued": 17400.00,
    "amountRedeemed": 9360.00,
    "amountExpired": 1350.00,
    "activeBalance": 89450.50
  },
  "ecommerce": {
    "orders": 423,
    "revenue": 105750.00,
    "avgTicket": 250.00,
    "abandonedCarts": 156,
    "abandonedValue": 39000.00,
    "conversionRate": 3.8
  },
  "automations": {
    "totalActive": 5,
    "totalExecutions": 2840,
    "emailsSentByAutomation": 5680,
    "conversions": 284
  }
}
```

---

## 6. Quem Atualiza os Acumuladores

| Acumulador | Lambda/Resolver responsável | Evento |
|---|---|---|
| EMAIL metrics | marketing-worker (Fargate) | SES events via SNS |
| CAMPAIGNS metrics | campaign-scheduler Lambda | Ao agendar/enviar campanha |
| CASHBACK metrics | cashback Lambda (futuro) | Ao creditar/resgatar/expirar |
| ECOMMERCE metrics | webhook ecommerce (futuro) | Webhook da plataforma de ecommerce |
| AUTOMATIONS metrics | Step Functions callback | Ao executar steps de automação |
| CONTACT counters | AppSync resolvers (já implementado) | create/delete/import/update |

---

## 7. Tabelas Envolvidas — Resumo

| Tabela | Registro | Dashboard KPI |
|---|---|---|
| `Config_Table` | `METRICS#EMAIL#{period}` | E-mails enviados, aberturas, cliques, etc. |
| `Config_Table` | `METRICS#CAMPAIGNS#{period}` | Campanhas enviadas, receita |
| `Config_Table` | `METRICS#CASHBACK#{period}` | Cashback emitido, resgatado, saldo ativo |
| `Config_Table` | `METRICS#ECOMMERCE#{period}` | Pedidos, receita, ticket médio |
| `Config_Table` | `METRICS#AUTOMATIONS#{period}` | Execuções, conversões |
| `Contact` | `COUNTER#TOTAL` | Total de contatos, por lifecycle |
