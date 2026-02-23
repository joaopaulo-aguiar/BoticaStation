# PRD — Botica Station

## Visão Geral

**Botica Station** é um sistema interno de CRM, Automação de Marketing (Newsletter) e Gestão de Cashback para a farmácia de manipulação **Botica Alternativa**.

**Versão atual:** 0.1.0 (MVP)  
**Data:** 2026-02-23

---

## 1. Escopo do MVP

### 1.1 Autenticação AWS (MFA)

- Login via credenciais IAM + código MFA de 6 dígitos
- Geração de sessão temporária via AWS STS `GetSessionToken` (12h)
- Credenciais temporárias mantidas apenas em memória (Zustand store)
- Proteção de rotas: redirecionamento automático para login se sessão expirar

### 1.2 Gestão de Contatos

**Operações CRUD** sobre tabela `Contact` no DynamoDB:

| Operação | Método DynamoDB | Descrição |
|---|---|---|
| Listar | `Scan` (filter SK=METADATA) | Listagem com busca e filtros |
| Criar | `PutItem` | Formulário com validação |
| Editar | `UpdateItem` | Atualização parcial |
| Excluir | `DeleteItem` | Com confirmação |
| Importar | `BatchWriteItem` (lotes de 25) | Upload CSV com preview |

### 1.3 Visualização

- Tabela de alta densidade inspirada no padrão "Clean & Condensed"
- Badges coloridos para Lifecycle Stage e Status
- Formatação automática: telefone (E.164 → visual), moeda (BRL)
- Busca por nome, email ou telefone

---

## 2. Schema de Dados (DynamoDB)

### Tabela: `Contact`

```json
{
  "PK": "CONTACT#<uuid>",
  "SK": "METADATA",
  "email": "user@email.com",
  "phone": "+5511999999999",
  "full_name": "Nome Completo",
  "lifecycle_stage": "customer | subscriber | lead",
  "cashback_info": {
    "current_balance": 0.00,
    "lifetime_earned": 0.00,
    "expiry_date": "YYYY-MM-DD"
  },
  "tags": ["tag1", "tag2"],
  "created_at": "ISOString",
  "source": "manual_input | import_csv",
  "status": "active | inactive"
}
```

### Regras de Negócio

1. **PK**: Sempre no formato `CONTACT#<uuid-v4>`
2. **SK**: Sempre `METADATA` para o registro principal do contato
3. **phone**: Armazenado no formato E.164 (`+5511999999999`), exibido formatado
4. **lifecycle_stage**: Valores permitidos: `customer`, `subscriber`, `lead`
5. **source**: `manual_input` para criação via formulário, `import_csv` para importação em lote
6. **created_at**: ISO 8601 gerado automaticamente na criação
7. **cashback_info.expiry_date**: Padrão = 1 ano a partir da criação

---

## 3. Importação CSV

### Mapeamento de Colunas

| Coluna CSV (aceita) | Campo DynamoDB |
|---|---|
| `name`, `full_name`, `nome` | `full_name` |
| `email` | `email` |
| `phone`, `telefone` | `phone` |
| `lifecycle_stage`, `estagio` | `lifecycle_stage` |
| `tags` (separadas por `;`) | `tags` |

### Processamento

1. Upload via drag-and-drop ou seleção de arquivo
2. Parse client-side com PapaParse
3. Preview dos primeiros 10 registros antes de confirmar
4. Envio em batches de 25 via `BatchWriteItem`
5. Telefones automaticamente normalizados para formato `+55...`
6. UUID v4 gerado para cada novo contato

---

## 4. Módulos Futuros (Roadmap)

| Módulo | Status |
|---|---|
| Campanhas (Newsletter) | 🔲 Planejado |
| Cashback (Regras/Resgate) | 🔲 Planejado |
| Relatórios / Analytics | 🔲 Planejado |
| Configurações | 🔲 Planejado |

---

## 5. Requisitos Não-Funcionais

- **Segurança**: Credenciais de longo prazo nunca persistidas (nem localStorage, nem cookies)
- **Performance**: Tabela suporta renderização de centenas de contatos sem virtualização (MVP)
- **UX**: Interface responsiva, feedback visual em operações assíncronas (loading spinners, toasts)
- **Branding**: Paleta verde/terrosa da Botica Alternativa, tipografia Inter
