# Dados Fake para Testes — DynamoDB

> Copie e cole cada bloco JSON diretamente no console DynamoDB via **Actions → Create item → JSON view**.
> Os itens usam o formato nativo DynamoDB com type descriptors (`S`, `N`, `L`, `M`, `NULL`).

---

## Tabela: Contact

### Contato 1 — Maria Silva (Lead, Pets + Mulheres)

```json
{
  "PK": { "S": "CONTACT#c001" },
  "SK": { "S": "METADATA" },
  "GSI1PK": { "S": "CONTACT" },
  "GSI1SK": { "S": "2025-05-10T14:30:00.000Z" },
  "id": { "S": "c001" },
  "email": { "S": "maria.silva@email.com" },
  "phone": { "S": "+5511999990001" },
  "fullName": { "S": "Maria Silva" },
  "lifecycleStage": { "S": "lead" },
  "tags": { "L": [{ "S": "Pets" }, { "S": "Mulheres" }] },
  "status": { "S": "active" },
  "emailStatus": { "S": "valid" },
  "phoneStatus": { "S": "valid" },
  "source": { "S": "import_csv" },
  "cashbackInfo": { "M": {
    "currentBalance": { "N": "25.50" },
    "lifetimeEarned": { "N": "150.00" },
    "expiryDate": { "S": "2025-12-31T23:59:59.000Z" }
  }},
  "stats": { "M": {
    "emailSends": { "N": "2" },
    "emailDeliveries": { "N": "2" },
    "emailOpens": { "N": "1" },
    "emailClicks": { "N": "1" },
    "emailBounces": { "N": "0" },
    "emailComplaints": { "N": "0" },
    "smsSends": { "N": "0" },
    "smsDeliveries": { "N": "0" }
  }},
  "createdAt": { "S": "2025-05-10T14:30:00.000Z" },
  "updatedAt": { "S": "2025-06-01T10:00:00.000Z" },
  "createdBy": { "S": "admin@botica.com.br" },
  "updatedBy": { "S": "admin@botica.com.br" }
}
```

### Contato 2 — João Santos (Customer, Homens)

```json
{
  "PK": { "S": "CONTACT#c002" },
  "SK": { "S": "METADATA" },
  "GSI1PK": { "S": "CONTACT" },
  "GSI1SK": { "S": "2025-04-15T09:15:00.000Z" },
  "id": { "S": "c002" },
  "email": { "S": "joao.santos@gmail.com" },
  "phone": { "S": "+5511999990002" },
  "fullName": { "S": "João Santos" },
  "lifecycleStage": { "S": "customer" },
  "tags": { "L": [{ "S": "Homens" }, { "S": "VIP" }] },
  "status": { "S": "active" },
  "emailStatus": { "S": "valid" },
  "phoneStatus": { "S": "valid" },
  "source": { "S": "manual_input" },
  "cashbackInfo": { "M": {
    "currentBalance": { "N": "80.00" },
    "lifetimeEarned": { "N": "500.00" },
    "expiryDate": { "S": "2025-12-31T23:59:59.000Z" }
  }},
  "stats": { "M": {
    "emailSends": { "N": "1" },
    "emailDeliveries": { "N": "1" },
    "emailOpens": { "N": "1" },
    "emailClicks": { "N": "0" },
    "emailBounces": { "N": "0" },
    "emailComplaints": { "N": "0" },
    "smsSends": { "N": "0" },
    "smsDeliveries": { "N": "0" }
  }},
  "createdAt": { "S": "2025-04-15T09:15:00.000Z" },
  "updatedAt": { "S": "2025-06-10T16:20:00.000Z" },
  "createdBy": { "S": "admin@botica.com.br" },
  "updatedBy": { "S": "admin@botica.com.br" }
}
```

### Contato 3 — Ana Oliveira (Subscriber, Mulheres + Skincare)

```json
{
  "PK": { "S": "CONTACT#c003" },
  "SK": { "S": "METADATA" },
  "GSI1PK": { "S": "CONTACT" },
  "GSI1SK": { "S": "2025-06-01T11:00:00.000Z" },
  "id": { "S": "c003" },
  "email": { "S": "ana.oliveira@hotmail.com" },
  "phone": { "S": "+5521988880003" },
  "fullName": { "S": "Ana Oliveira" },
  "lifecycleStage": { "S": "subscriber" },
  "tags": { "L": [{ "S": "Mulheres" }, { "S": "Skincare" }] },
  "status": { "S": "active" },
  "emailStatus": { "S": "valid" },
  "phoneStatus": { "NULL": true },
  "source": { "S": "import_csv" },
  "cashbackInfo": { "M": {
    "currentBalance": { "N": "0" },
    "lifetimeEarned": { "N": "0" },
    "expiryDate": { "NULL": true }
  }},
  "stats": { "NULL": true },
  "createdAt": { "S": "2025-06-01T11:00:00.000Z" },
  "updatedAt": { "S": "2025-06-01T11:00:00.000Z" },
  "createdBy": { "S": "admin@botica.com.br" },
  "updatedBy": { "S": "admin@botica.com.br" }
}
```

### Contato 4 — Carlos Ferreira (Lead, Pets)

```json
{
  "PK": { "S": "CONTACT#c004" },
  "SK": { "S": "METADATA" },
  "GSI1PK": { "S": "CONTACT" },
  "GSI1SK": { "S": "2025-06-05T08:45:00.000Z" },
  "id": { "S": "c004" },
  "email": { "S": "carlos.ferreira@yahoo.com" },
  "phone": { "NULL": true },
  "fullName": { "S": "Carlos Ferreira" },
  "lifecycleStage": { "S": "lead" },
  "tags": { "L": [{ "S": "Pets" }] },
  "status": { "S": "active" },
  "emailStatus": { "S": "valid" },
  "phoneStatus": { "NULL": true },
  "source": { "S": "manual_input" },
  "cashbackInfo": { "NULL": true },
  "stats": { "NULL": true },
  "createdAt": { "S": "2025-06-05T08:45:00.000Z" },
  "updatedAt": { "S": "2025-06-05T08:45:00.000Z" },
  "createdBy": { "S": "admin@botica.com.br" },
  "updatedBy": { "S": "admin@botica.com.br" }
}
```

### Contato 5 — Beatriz Lima (Customer, Mulheres + VIP + Skincare) — com bounce

```json
{
  "PK": { "S": "CONTACT#c005" },
  "SK": { "S": "METADATA" },
  "GSI1PK": { "S": "CONTACT" },
  "GSI1SK": { "S": "2025-03-20T16:00:00.000Z" },
  "id": { "S": "c005" },
  "email": { "S": "beatriz.lima@empresa.com.br" },
  "phone": { "S": "+5531977770005" },
  "fullName": { "S": "Beatriz Lima" },
  "lifecycleStage": { "S": "customer" },
  "tags": { "L": [{ "S": "Mulheres" }, { "S": "VIP" }, { "S": "Skincare" }] },
  "status": { "S": "active" },
  "emailStatus": { "S": "bounced" },
  "emailFailReason": { "S": "Permanent bounce: mailbox does not exist" },
  "phoneStatus": { "S": "valid" },
  "source": { "S": "import_csv" },
  "cashbackInfo": { "M": {
    "currentBalance": { "N": "200.00" },
    "lifetimeEarned": { "N": "1200.00" },
    "expiryDate": { "S": "2025-12-31T23:59:59.000Z" }
  }},
  "stats": { "M": {
    "emailSends": { "N": "1" },
    "emailDeliveries": { "N": "0" },
    "emailOpens": { "N": "0" },
    "emailClicks": { "N": "0" },
    "emailBounces": { "N": "1" },
    "emailComplaints": { "N": "0" },
    "smsSends": { "N": "0" },
    "smsDeliveries": { "N": "0" }
  }},
  "createdAt": { "S": "2025-03-20T16:00:00.000Z" },
  "updatedAt": { "S": "2025-06-12T09:30:00.000Z" },
  "createdBy": { "S": "admin@botica.com.br" },
  "updatedBy": { "S": "system" }
}
```

### Contato 6 — Rafael Costa (Lead, Homens) — inativo

```json
{
  "PK": { "S": "CONTACT#c006" },
  "SK": { "S": "METADATA" },
  "GSI1PK": { "S": "CONTACT" },
  "GSI1SK": { "S": "2025-02-10T12:00:00.000Z" },
  "id": { "S": "c006" },
  "email": { "S": "rafael.costa@outlook.com" },
  "phone": { "S": "+5541966660006" },
  "fullName": { "S": "Rafael Costa" },
  "lifecycleStage": { "S": "lead" },
  "tags": { "L": [{ "S": "Homens" }] },
  "status": { "S": "inactive" },
  "emailStatus": { "S": "complained" },
  "emailFailReason": { "S": "Complaint received via SES feedback loop" },
  "phoneStatus": { "S": "valid" },
  "source": { "S": "import_csv" },
  "cashbackInfo": { "NULL": true },
  "stats": { "M": {
    "emailSends": { "N": "1" },
    "emailDeliveries": { "N": "1" },
    "emailOpens": { "N": "0" },
    "emailClicks": { "N": "0" },
    "emailBounces": { "N": "0" },
    "emailComplaints": { "N": "1" },
    "smsSends": { "N": "0" },
    "smsDeliveries": { "N": "0" }
  }},
  "createdAt": { "S": "2025-02-10T12:00:00.000Z" },
  "updatedAt": { "S": "2025-05-20T14:00:00.000Z" },
  "createdBy": { "S": "admin@botica.com.br" },
  "updatedBy": { "S": "system" }
}
```

---

## Tabela: ContactEvent

### Eventos para Maria Silva (c001) — campanha "Promoção Dia dos Namorados"

```json
{
  "PK": { "S": "CONTACT#c001" },
  "SK": { "S": "EVENT#2025-06-08T10:00:00.000Z#msg-001-send" },
  "contactId": { "S": "c001" },
  "eventId": { "S": "msg-001-send" },
  "channel": { "S": "email" },
  "eventType": { "S": "Send" },
  "details": { "NULL": true },
  "campaignId": { "S": "camp-001" },
  "campaignName": { "S": "Promoção Dia dos Namorados" },
  "subject": { "S": "❤️ Presente especial para quem você ama!" },
  "createdAt": { "S": "2025-06-08T10:00:00.000Z" }
}
```

```json
{
  "PK": { "S": "CONTACT#c001" },
  "SK": { "S": "EVENT#2025-06-08T10:00:03.000Z#msg-001-delivery" },
  "contactId": { "S": "c001" },
  "eventId": { "S": "msg-001-delivery" },
  "channel": { "S": "email" },
  "eventType": { "S": "Delivery" },
  "details": { "S": "{\"smtpResponse\":\"250 2.0.0 OK\"}" },
  "campaignId": { "S": "camp-001" },
  "campaignName": { "S": "Promoção Dia dos Namorados" },
  "subject": { "S": "❤️ Presente especial para quem você ama!" },
  "createdAt": { "S": "2025-06-08T10:00:03.000Z" }
}
```

```json
{
  "PK": { "S": "CONTACT#c001" },
  "SK": { "S": "EVENT#2025-06-08T14:22:10.000Z#msg-001-open" },
  "contactId": { "S": "c001" },
  "eventId": { "S": "msg-001-open" },
  "channel": { "S": "email" },
  "eventType": { "S": "Open" },
  "details": { "S": "{\"userAgent\":\"Mozilla/5.0\",\"ipAddress\":\"189.40.xx.xx\"}" },
  "campaignId": { "S": "camp-001" },
  "campaignName": { "S": "Promoção Dia dos Namorados" },
  "subject": { "S": "❤️ Presente especial para quem você ama!" },
  "createdAt": { "S": "2025-06-08T14:22:10.000Z" }
}
```

```json
{
  "PK": { "S": "CONTACT#c001" },
  "SK": { "S": "EVENT#2025-06-08T14:23:45.000Z#msg-001-click" },
  "contactId": { "S": "c001" },
  "eventId": { "S": "msg-001-click" },
  "channel": { "S": "email" },
  "eventType": { "S": "Click" },
  "details": { "S": "{\"link\":\"https://botica.com.br/promo-namorados\",\"userAgent\":\"Mozilla/5.0\"}" },
  "campaignId": { "S": "camp-001" },
  "campaignName": { "S": "Promoção Dia dos Namorados" },
  "subject": { "S": "❤️ Presente especial para quem você ama!" },
  "createdAt": { "S": "2025-06-08T14:23:45.000Z" }
}
```

### Eventos para Maria Silva (c001) — campanha "Newsletter Junho"

```json
{
  "PK": { "S": "CONTACT#c001" },
  "SK": { "S": "EVENT#2025-06-15T09:00:00.000Z#msg-002-send" },
  "contactId": { "S": "c001" },
  "eventId": { "S": "msg-002-send" },
  "channel": { "S": "email" },
  "eventType": { "S": "Send" },
  "details": { "NULL": true },
  "campaignId": { "S": "camp-002" },
  "campaignName": { "S": "Newsletter Junho" },
  "subject": { "S": "🌿 Novidades de Junho na Botica!" },
  "createdAt": { "S": "2025-06-15T09:00:00.000Z" }
}
```

```json
{
  "PK": { "S": "CONTACT#c001" },
  "SK": { "S": "EVENT#2025-06-15T09:00:05.000Z#msg-002-delivery" },
  "contactId": { "S": "c001" },
  "eventId": { "S": "msg-002-delivery" },
  "channel": { "S": "email" },
  "eventType": { "S": "Delivery" },
  "details": { "S": "{\"smtpResponse\":\"250 2.0.0 OK\"}" },
  "campaignId": { "S": "camp-002" },
  "campaignName": { "S": "Newsletter Junho" },
  "subject": { "S": "🌿 Novidades de Junho na Botica!" },
  "createdAt": { "S": "2025-06-15T09:00:05.000Z" }
}
```

### Eventos para João Santos (c002) — campanha "Promoção Dia dos Namorados"

```json
{
  "PK": { "S": "CONTACT#c002" },
  "SK": { "S": "EVENT#2025-06-08T10:00:01.000Z#msg-003-send" },
  "contactId": { "S": "c002" },
  "eventId": { "S": "msg-003-send" },
  "channel": { "S": "email" },
  "eventType": { "S": "Send" },
  "details": { "NULL": true },
  "campaignId": { "S": "camp-001" },
  "campaignName": { "S": "Promoção Dia dos Namorados" },
  "subject": { "S": "❤️ Presente especial para quem você ama!" },
  "createdAt": { "S": "2025-06-08T10:00:01.000Z" }
}
```

```json
{
  "PK": { "S": "CONTACT#c002" },
  "SK": { "S": "EVENT#2025-06-08T10:00:04.000Z#msg-003-delivery" },
  "contactId": { "S": "c002" },
  "eventId": { "S": "msg-003-delivery" },
  "channel": { "S": "email" },
  "eventType": { "S": "Delivery" },
  "details": { "S": "{\"smtpResponse\":\"250 2.0.0 OK\"}" },
  "campaignId": { "S": "camp-001" },
  "campaignName": { "S": "Promoção Dia dos Namorados" },
  "subject": { "S": "❤️ Presente especial para quem você ama!" },
  "createdAt": { "S": "2025-06-08T10:00:04.000Z" }
}
```

```json
{
  "PK": { "S": "CONTACT#c002" },
  "SK": { "S": "EVENT#2025-06-08T18:10:30.000Z#msg-003-open" },
  "contactId": { "S": "c002" },
  "eventId": { "S": "msg-003-open" },
  "channel": { "S": "email" },
  "eventType": { "S": "Open" },
  "details": { "S": "{\"userAgent\":\"Gmail/Android\",\"ipAddress\":\"177.80.xx.xx\"}" },
  "campaignId": { "S": "camp-001" },
  "campaignName": { "S": "Promoção Dia dos Namorados" },
  "subject": { "S": "❤️ Presente especial para quem você ama!" },
  "createdAt": { "S": "2025-06-08T18:10:30.000Z" }
}
```

### Eventos para Beatriz Lima (c005) — bounce

```json
{
  "PK": { "S": "CONTACT#c005" },
  "SK": { "S": "EVENT#2025-06-08T10:00:02.000Z#msg-004-send" },
  "contactId": { "S": "c005" },
  "eventId": { "S": "msg-004-send" },
  "channel": { "S": "email" },
  "eventType": { "S": "Send" },
  "details": { "NULL": true },
  "campaignId": { "S": "camp-001" },
  "campaignName": { "S": "Promoção Dia dos Namorados" },
  "subject": { "S": "❤️ Presente especial para quem você ama!" },
  "createdAt": { "S": "2025-06-08T10:00:02.000Z" }
}
```

```json
{
  "PK": { "S": "CONTACT#c005" },
  "SK": { "S": "EVENT#2025-06-08T10:00:08.000Z#msg-004-bounce" },
  "contactId": { "S": "c005" },
  "eventId": { "S": "msg-004-bounce" },
  "channel": { "S": "email" },
  "eventType": { "S": "Bounce" },
  "details": { "S": "{\"bounceType\":\"Permanent\",\"bounceSubType\":\"General\",\"diagnosticCode\":\"smtp;550 5.1.1 user unknown\"}" },
  "campaignId": { "S": "camp-001" },
  "campaignName": { "S": "Promoção Dia dos Namorados" },
  "subject": { "S": "❤️ Presente especial para quem você ama!" },
  "createdAt": { "S": "2025-06-08T10:00:08.000Z" }
}
```

### Eventos para Rafael Costa (c006) — complaint

```json
{
  "PK": { "S": "CONTACT#c006" },
  "SK": { "S": "EVENT#2025-05-15T09:00:00.000Z#msg-005-send" },
  "contactId": { "S": "c006" },
  "eventId": { "S": "msg-005-send" },
  "channel": { "S": "email" },
  "eventType": { "S": "Send" },
  "details": { "NULL": true },
  "campaignId": { "S": "camp-003" },
  "campaignName": { "S": "Promoção Inverno" },
  "subject": { "S": "🧣 Prepare-se para o inverno com descontos!" },
  "createdAt": { "S": "2025-05-15T09:00:00.000Z" }
}
```

```json
{
  "PK": { "S": "CONTACT#c006" },
  "SK": { "S": "EVENT#2025-05-15T09:00:04.000Z#msg-005-delivery" },
  "contactId": { "S": "c006" },
  "eventId": { "S": "msg-005-delivery" },
  "channel": { "S": "email" },
  "eventType": { "S": "Delivery" },
  "details": { "S": "{\"smtpResponse\":\"250 2.0.0 OK\"}" },
  "campaignId": { "S": "camp-003" },
  "campaignName": { "S": "Promoção Inverno" },
  "subject": { "S": "🧣 Prepare-se para o inverno com descontos!" },
  "createdAt": { "S": "2025-05-15T09:00:04.000Z" }
}
```

```json
{
  "PK": { "S": "CONTACT#c006" },
  "SK": { "S": "EVENT#2025-05-15T12:30:00.000Z#msg-005-complaint" },
  "contactId": { "S": "c006" },
  "eventId": { "S": "msg-005-complaint" },
  "channel": { "S": "email" },
  "eventType": { "S": "Complaint" },
  "details": { "S": "{\"complaintFeedbackType\":\"abuse\",\"userAgent\":\"Outlook\"}" },
  "campaignId": { "S": "camp-003" },
  "campaignName": { "S": "Promoção Inverno" },
  "subject": { "S": "🧣 Prepare-se para o inverno com descontos!" },
  "createdAt": { "S": "2025-05-15T12:30:00.000Z" }
}
```

---

## Tabela: Config_Table — Segmentos de Teste

### Segmento 1 — Leads com tag Pets (AND)

```json
{
  "PK": { "S": "SEGMENT" },
  "SK": { "S": "SEGMENT#seg-001" },
  "id": { "S": "seg-001" },
  "name": { "S": "Leads com tag Pets" },
  "description": { "S": "Contatos lead com interesse em produtos para pets" },
  "conditionLogic": { "S": "AND" },
  "conditions": { "L": [
    { "M": { "field": { "S": "lifecycleStage" }, "operator": { "S": "equals" }, "value": { "S": "lead" } } },
    { "M": { "field": { "S": "tags" }, "operator": { "S": "contains" }, "value": { "S": "Pets" } } }
  ]},
  "contactCount": { "NULL": true },
  "lastCountAt": { "NULL": true },
  "createdAt": { "S": "2025-06-10T10:00:00.000Z" },
  "updatedAt": { "S": "2025-06-10T10:00:00.000Z" },
  "createdBy": { "S": "admin@botica.com.br" }
}
```

### Segmento 2 — Mulheres ou Skincare (OR)

```json
{
  "PK": { "S": "SEGMENT" },
  "SK": { "S": "SEGMENT#seg-002" },
  "id": { "S": "seg-002" },
  "name": { "S": "Mulheres ou Skincare" },
  "description": { "S": "Contatos com tag Mulheres ou Skincare — com deduplicação automática" },
  "conditionLogic": { "S": "OR" },
  "conditions": { "L": [
    { "M": { "field": { "S": "tags" }, "operator": { "S": "contains" }, "value": { "S": "Mulheres" } } },
    { "M": { "field": { "S": "tags" }, "operator": { "S": "contains" }, "value": { "S": "Skincare" } } }
  ]},
  "contactCount": { "NULL": true },
  "lastCountAt": { "NULL": true },
  "createdAt": { "S": "2025-06-12T14:30:00.000Z" },
  "updatedAt": { "S": "2025-06-12T14:30:00.000Z" },
  "createdBy": { "S": "admin@botica.com.br" }
}
```

### Segmento 3 — Clientes VIP ativos (AND)

```json
{
  "PK": { "S": "SEGMENT" },
  "SK": { "S": "SEGMENT#seg-003" },
  "id": { "S": "seg-003" },
  "name": { "S": "Clientes VIP ativos" },
  "description": { "S": "Customers com tag VIP e status ativo" },
  "conditionLogic": { "S": "AND" },
  "conditions": { "L": [
    { "M": { "field": { "S": "lifecycleStage" }, "operator": { "S": "equals" }, "value": { "S": "customer" } } },
    { "M": { "field": { "S": "tags" }, "operator": { "S": "contains" }, "value": { "S": "VIP" } } },
    { "M": { "field": { "S": "status" }, "operator": { "S": "equals" }, "value": { "S": "active" } } }
  ]},
  "contactCount": { "NULL": true },
  "lastCountAt": { "NULL": true },
  "createdAt": { "S": "2025-06-14T08:00:00.000Z" },
  "updatedAt": { "S": "2025-06-14T08:00:00.000Z" },
  "createdBy": { "S": "admin@botica.com.br" }
}
```
