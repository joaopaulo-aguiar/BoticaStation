# Análise: UTM vs Tags de Campanha — Redundância e Necessidade

> Documento de análise técnica e estratégica sobre a coexistência de parâmetros UTM
> e tags de rastreamento SES no BoticaStation.

---

## 1. Resumo Executivo

**Conclusão**: As duas funcionalidades **NÃO são redundantes** — elas rastreiam dimensões
diferentes do funil e são complementares. No entanto, existem pontos de sobreposição
que podem ser simplificados na experiência do usuário. Recomenda-se **manter ambas**,
mas com ajustes de UX para evitar confusão.

---

## 2. O Que Cada Sistema Rastreia

### 2.1 Tags de Rastreamento SES (`EmailTags`)

| Aspecto | Detalhe |
|---|---|
| **O que rastreia** | Eventos internos do ciclo de vida do e-mail |
| **Onde opera** | Dentro da infraestrutura AWS (SES → SNS → Lambda) |
| **Eventos capturados** | Send, Delivery, Open, Click, Bounce, Complaint, Reject |
| **Granularidade** | Por e-mail individual (cada envio tem suas tags) |
| **Visibilidade** | Apenas no backend / dashboard interno do BoticaStation |
| **Quem consome** | Lambdas de processamento de eventos, resolvers AppSync |
| **Dados gerados** | `campaignId`, `campaignName` (base64), `tipo` |

**Exemplo de uso**: "Quantos e-mails da campanha X bouncearam?" → Resposta direta via tags SES.

### 2.2 Parâmetros UTM

| Aspecto | Detalhe |
|---|---|
| **O que rastreia** | Comportamento pós-clique no site/loja |
| **Onde opera** | No navegador do destinatário → Analytics do site (GA4, etc.) |
| **Eventos capturados** | Visitas, páginas vistas, conversões, vendas no site |
| **Granularidade** | Por sessão de navegação (não por e-mail) |
| **Visibilidade** | Google Analytics, Mixpanel, ou qualquer ferramenta de analytics web |
| **Quem consome** | Equipe de marketing, ferramentas externas de analytics |
| **Dados gerados** | `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` |

**Exemplo de uso**: "Quantas vendas vieram da campanha X no Google Analytics?" → Resposta via UTM no GA4.

---

## 3. Comparação Direta — Onde Cada Um É Insubstituível

| Cenário | Tags SES | UTM |
|---|---|---|
| E-mail foi entregue? | ✅ Tag identifica a campanha | ❌ UTM não rastreia isso |
| E-mail foi aberto? | ✅ Evento Open com tag | ❌ UTM não rastreia isso |
| Link foi clicado no e-mail? | ✅ Evento Click com tag | ⚠️ UTM mostra visita, mas não o clique em si |
| Usuário navegou no site? | ❌ Não rastreia pós-clique | ✅ GA4 mostra toda a jornada |
| Usuário comprou? | ❌ Não tem acesso ao ecommerce | ✅ GA4 atribui receita ao UTM |
| Bounce/Complaint? | ✅ Eventos nativos do SES | ❌ UTM não rastreia |
| Qual campanha trouxe mais receita? | ⚠️ Precisa integrar com ecommerce | ✅ GA4 faz isso nativamente |
| ROI por canal (email vs social vs ads)? | ❌ Não compara canais | ✅ UTM é o padrão para isso |

---

## 4. Por Que o Mercado Usa Ambos

### 4.1 Referências de Mercado

| Plataforma | Tags internas | UTM | Ambos? |
|---|---|---|---|
| **RD Station** | ✅ Tags de conversão | ✅ UTM automático | Sim |
| **ActiveCampaign** | ✅ Event tracking | ✅ UTM em links | Sim |
| **Mailchimp** | ✅ Campaign ID tracking | ✅ UTM automático (Google Analytics) | Sim |
| **HubSpot** | ✅ HubSpot tracking ID | ✅ UTM em todos os links | Sim |
| **Brevo (ex-Sendinblue)** | ✅ Email event tags | ✅ UTM parameters | Sim |

**100% das plataformas de referência usam ambos os sistemas.**

### 4.2 Motivo Técnico

Os dois sistemas operam em **camadas diferentes** da stack:

```
┌─────────────────────────────────────────────┐
│        GOOGLE ANALYTICS / ANALYTICS WEB     │  ← UTM opera aqui
│  (Comportamento no site, conversões, ROI)   │
├─────────────────────────────────────────────┤
│           NAVEGADOR DO USUÁRIO              │  ← URL com UTM
├─────────────────────────────────────────────┤
│          REDE / INTERNET                    │
├─────────────────────────────────────────────┤
│        AMAZON SES (Envio de E-mail)         │  ← Tags SES operam aqui
│  (Delivery, Open, Click, Bounce, Complaint) │
├─────────────────────────────────────────────┤
│        BOTICASTATION (Backend AWS)          │  ← Processa eventos SES
│  (Contagem, timeline, métricas de campaign) │
└─────────────────────────────────────────────┘
```

---

## 5. Cenários Onde UTM É Essencial (Tags SES Não Resolvem)

### 5.1 Atribuição de Receita Multi-Canal
Quando a empresa usa e-mail, Google Ads, Instagram e parcerias, o UTM é o **padrão universal**
para comparar performance entre canais no GA4. Sem UTM, o GA4 classifica como "Direct" ou "(not set)".

### 5.2 Relatórios para Stakeholders Externos
Agências e parceiros usam GA4/UTM como linguagem comum. Tags SES são internas.

### 5.3 Testes A/B de Conteúdo
`utm_content=header-cta` vs `utm_content=footer-cta` permite medir qual posição
gera mais conversões **no site**, não apenas cliques no e-mail.

### 5.4 Segmentação de Audiência no Google Ads
Audiências no Google Ads podem ser criadas a partir de visitantes que chegaram
com `utm_source=botica&utm_medium=email`, permitindo remarketing cruzado.

### 5.5 Modelos de Atribuição
GA4 usa UTM para modelos de atribuição (último clique, linear, baseado em dados).
Sem UTM, o e-mail marketing "desaparece" da análise de atribuição.

---

## 6. Cenários Onde Tags SES São Essenciais (UTM Não Resolve)

### 6.1 Saúde do Canal de E-mail
Taxa de bounce, complaints e rejects são métricas críticas para manter
a reputação do domínio no SES. UTM não rastreia isso.

### 6.2 Diagnóstico de Problemas de Entrega
"Por que a campanha X teve 8% de bounce?" → Só com tags SES.

### 6.3 Timeline de Eventos do Contato
A timeline do ContactDetailDialog mostra cada evento (Send, Open, Click)
com data/hora e campanha associada. Isso só funciona com tags SES.

### 6.4 Automação de Ações Internas
"Se o contato abriu o e-mail X, adicionar tag Y" → Depende de eventos SES com tags.

### 6.5 Compliance e Auditoria
Registrar quais e-mails foram enviados, quando, e para quem — com prova de entrega ou bounce.

---

## 7. Ponto de Sobreposição

O único ponto de **real sobreposição** é o **rastreamento de cliques**:

- **Tags SES**: Registram que o contato X clicou no e-mail da campanha Y (evento `Click`)
- **UTM**: Registram que alguém chegou ao site vindo da campanha Y (sessão no GA4)

Mas mesmo aqui:
- O clique SES é **por contato** (sabe quem clicou)
- O UTM no GA4 é **por sessão** (pode ser anônimo, mas mostra o que fez no site)

Portanto, não é realmente redundante — são visões complementares do mesmo clique.

---

## 8. Recomendação

### ✅ Manter ambos os sistemas

### Melhorias sugeridas na UX (opcionais, não urgentes):

1. **UTM automático por padrão**: Já implementado com a hierarquia Settings → Template → Campanha. ✅
2. **Esconder complexidade**: O painel de UTM na campanha pode ser colapsado por padrão, mostrando apenas
   "UTM automático ativado" e expandindo se o usuário quiser customizar.
3. **Relatório integrado**: No futuro, cruzar dados do SES (aberturas/cliques internos)
   com dados do GA4 (via Measurement Protocol ou importação) para um relatório unificado
   de "E-mail → Clique → Visita → Conversão".
4. **Documentação para o usuário**: Adicionar um tooltip ou link de ajuda na seção de UTM
   explicando: "UTM rastreia o que acontece NO SEU SITE. Tags rastreiam o que acontece NO E-MAIL."

---

## 9. Perguntas Respondidas

### "Não está redundante?"
**Não.** UTM e tags SES rastreiam dimensões completamente diferentes.
Remover UTM significaria perder toda a visibilidade de atribuição de receita
e comparação entre canais no Google Analytics.

### "Teria outras necessidades para continuar usando UTM?"
**Sim, várias** (seções 5.1 a 5.5 acima). As mais críticas:
- Atribuição de receita no GA4
- Comparação entre canais (email vs ads vs social)
- Remarketing cruzado via Google Ads
- Compliance de reporting para stakeholders

### "O modelo de mercado usa UTM?"
**Sim, 100% das plataformas de referência usam ambos os sistemas** (RD Station, ActiveCampaign,
Mailchimp, HubSpot, Brevo). É o padrão da indústria.

---

## 10. Resumo Visual

```
┌──────────────────────┐     ┌──────────────────────┐
│   TAGS SES           │     │   UTM PARAMETERS     │
│                      │     │                      │
│  ✅ Entrega          │     │  ✅ Navegação no site │
│  ✅ Abertura         │     │  ✅ Conversão/Receita │
│  ✅ Clique (quem)    │     │  ✅ Clique (o que fez)│
│  ✅ Bounce           │     │  ✅ Multi-canal       │
│  ✅ Complaint        │     │  ✅ GA4 / Analytics   │
│  ✅ Timeline         │     │  ✅ Remarketing       │
│                      │     │                      │
│  MUNDO DO E-MAIL     │     │  MUNDO DO SITE       │
└──────────────────────┘     └──────────────────────┘
         ↕ Complementares — Não redundantes ↕
```
