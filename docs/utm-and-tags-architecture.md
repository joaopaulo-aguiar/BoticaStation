# UTM & Tags — Email Tracking Architecture

## Visão Geral

O sistema de UTM funciona em 3 camadas com fallback:

```
Configurações Globais  →  Template UTM Defaults  →  UTM da Campanha
     (Settings)              (Template)              (Campaign)
```

**Prioridade (do mais específico ao menos específico):**
1. **Campanha**: se a campanha define `utmParams`, esses valores prevalecem
2. **Template**: se o template define `utmDefaults`, esses valores são usados como fallback
3. **Settings**: os valores globais `defaultUtmSource` e `defaultUtmMedium` são o último fallback

## Onde cada parte é armazenada

| Dado | Tabela/Serviço | PK / SK |
|------|---------------|---------|
| UTM Defaults Globais | Config_Table | PK=SETTINGS, SK=CAMPAIGN_SETTINGS |
| UTM Defaults do Template | SES Template (campo testData) | Chave `__utmDefaults__` dentro do JSON testData |
| UTM da Campanha | Config_Table | PK=CAMPAIGN, SK=CAMPAIGN#{id} → campo `utmParams` |

## Fluxo de envio com UTM

### 1. Criação da campanha (Frontend)
- O formulário de campanha preenche UTMs com fallback:
  - Se template selecionado tem `utmDefaults` → preenche automaticamente
  - Senão, usa `defaultUtmSource / defaultUtmMedium` das settings
- O usuário pode sobrescrever qualquer valor antes de salvar

### 2. Agendamento (campaign-scheduler Lambda)
- EventBridge dispara o `marketing-worker` Lambda no horário agendado
- O payload contém `{ campaignId, action: 'process' }`

### 3. Construção das mensagens (marketing-worker Lambda)
- A função `buildEmailMessage()` lê `campaign.utmParams` e inclui os valores no `templateData`
- Envia na mensagem SQS:
  - `campaignId`, `campaignName`, `campaignTags` — para rastreamento
  - `tags` — objeto com tags de rastreamento SES (campanha, campaignId, tipo)
  - `templateData` — dados de merge incluindo UTM params

### 4. Envio via Fargate Worker (SQS Consumer)
- Lê mensagens da fila SQS
- Precisa converter `body.tags` para `EmailTags` do SES v2
- As tags aparecem nos eventos SES (opens, clicks, bounces, etc.)

## Tags de rastreamento SES

O campo `tags` na mensagem SQS contém:
```json
{
  "campanha": "Promo_Final_de_Semana_25_02_26",
  "campaignId": "b4f2b628-da3e-4e2c-8b3a-34ba1293f8f3",
  "tipo": "campaign"
}
```

Essas tags são enviadas junto com o e-mail e aparecem em:
- CloudWatch Events
- SNS notifications (bounces, complaints)
- SES Event Publishing (opens, clicks)

---

## ⚠️ ATUALIZAÇÃO NECESSÁRIA NO FARGATE WORKER (SQS Consumer)

O Fargate worker que consome a fila SQS (`emails-transactional`) precisa ser atualizado para
incluir `EmailTags` ao enviar e-mails via SES v2.

### Código atual (SEM tags):
```javascript
const params = {
    FromEmailAddress: fromAddress,
    Destination: { ToAddresses: [toAddress] },
    Content: {
        Template: {
            TemplateName: templateName,
            TemplateData: templateData
        }
    },
    ConfigurationSetName: configSet
};
```

### Código atualizado (COM tags):
```javascript
// Construir EmailTags a partir do payload SQS
const emailTags = [];
if (body.campaignId) {
    emailTags.push({ Name: "campaignId", Value: body.campaignId });
}
if (body.campaignName) {
    emailTags.push({ Name: "campaignName", Value: body.campaignName });
}
if (body.campaignTags && Array.isArray(body.campaignTags)) {
    emailTags.push({ Name: "campaignTags", Value: body.campaignTags.join(",") });
}
// Tags customizadas do payload
if (body.tags && typeof body.tags === "object") {
    for (const [key, val] of Object.entries(body.tags)) {
        if (val && !emailTags.find(t => t.Name === key)) {
            emailTags.push({ Name: key, Value: String(val) });
        }
    }
}

const params = {
    FromEmailAddress: fromAddress,
    Destination: { ToAddresses: [toAddress] },
    Content: {
        Template: {
            TemplateName: templateName,
            TemplateData: templateData
        }
    },
    ConfigurationSetName: configSet,
    EmailTags: emailTags.length > 0 ? emailTags : undefined,
};
```

### Por que as tags não apareciam?
A Lambda `marketing-worker` já envia `tags` e `campaignName` na mensagem SQS,
mas o Fargate worker não estava lendo esses campos e passando-os como `EmailTags`
na chamada `SendEmailCommand` do SES v2.

O `EmailTags` é o mecanismo do SES para associar metadados às mensagens enviadas.
Sem eles, os eventos de rastreamento (opens, clicks, bounces) não identificam
a qual campanha o e-mail pertence.

---

## Atributo data-no-utm

Links no template HTML que NÃO devem receber UTM automático devem ter o atributo `data-no-utm`:

```html
<!-- Este link NÃO receberá UTM -->
<a href="https://example.com" data-no-utm>Link sem UTM</a>

<!-- Este link RECEBERÁ UTM automaticamente -->
<a href="https://example.com">Link com UTM</a>

<!-- Links já com UTM hardcoded são preservados -->
<a href="https://example.com?utm_source=manual&utm_medium=email">Link manual</a>
```

O gerenciador de templates permite configurar isso visualmente na seção "UTM & Links".
