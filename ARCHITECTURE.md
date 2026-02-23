# ARCHITECTURE — Botica Station

## 1. Decisão Arquitetural: Conexão Direta AWS

### Por que não usar backend/API proprietário?

O Botica Station é um sistema **interno** com poucos usuários (equipe da Botica Alternativa). A decisão de conectar diretamente ao DynamoDB via AWS SDK no frontend foi baseada em:

1. **Simplicidade Operacional**: Sem servidor para manter, escalar ou monitorar
2. **Custo Zero de Infra**: Sem EC2, Lambda ou API Gateway — paga-se apenas pelo uso do DynamoDB
3. **Segurança Adequada**: O acesso é protegido por credenciais IAM + MFA obrigatório
4. **Time-to-Market**: MVP funcional sem a complexidade de um backend

### Modelo de Segurança

```
┌────────────────────────────────────────────────────────┐
│  Frontend (Browser)                                     │
│                                                         │
│  1. Usuário insere: Access Key + Secret Key + MFA Code │
│  2. Frontend chama STS.GetSessionToken()                │
│  3. Recebe credenciais temporárias (12h)                │
│  4. Credenciais ficam SOMENTE em memória (Zustand)     │
│  5. Todas as chamadas DynamoDB usam o session token    │
│                                                         │
│  ⚠ Credenciais de longo prazo NUNCA são armazenadas    │
│  ⚠ Ao fechar o browser, sessão é perdida               │
└────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────┐     ┌──────────────────┐
│  AWS STS             │────▶│  DynamoDB         │
│  GetSessionToken     │     │  Tabela: Contact  │
│  (MFA obrigatório)   │     │                   │
└─────────────────────┘     └──────────────────┘
```

### Limitações Conhecidas

- **Sem controle de acesso granular**: Todos os usuários autenticados têm o mesmo nível de acesso
- **Scan completo**: A listagem usa `Scan` com filtro, não há índices secundários otimizados (aceitável para < 10k registros)
- **Sem backend para validação**: Validações são feitas apenas no frontend

---

## 2. Estrutura de Pastas — Feature-Sliced Design (FSD)

```
src/
├── features/              # Módulos de funcionalidades isoladas
│   ├── auth/
│   │   ├── store/         # Zustand store (auth state + STS logic)
│   │   ├── ui/            # LoginPage, ProtectedRoute
│   │   └── index.ts       # Public API do módulo
│   ├── contacts/
│   │   ├── api/           # DynamoDB CRUD operations
│   │   ├── hooks/         # React Query hooks (useContacts, etc.)
│   │   ├── ui/            # ContactsPage, ContactFormDialog, ImportCSVDialog
│   │   └── index.ts
│   ├── campaigns/         # (placeholder)
│   ├── cashback/          # (placeholder)
│   ├── reports/           # (placeholder)
│   └── settings/          # (placeholder)
│
├── shared/                # Código compartilhado entre features
│   ├── layout/            # AppLayout (sidebar + main content)
│   ├── lib/               # Utilitários (cn, formatters, DynamoDB client factory)
│   ├── types/             # Interfaces TypeScript globais
│   └── ui/                # Componentes reutilizáveis (Button, Input, Badge, etc.)
│
├── App.tsx                # Router + providers
├── main.tsx               # Entry point
└── index.css              # Tailwind config + design tokens
```

### Princípios FSD Aplicados

1. **Isolamento de features**: Cada feature pode importar de `shared/`, mas features não importam entre si
2. **Public API via index.ts**: Cada feature expõe apenas o necessário
3. **Colocation**: API, hooks e UI de uma feature ficam juntos

---

## 3. Gerenciamento de Estado

| Tipo | Tecnologia | Uso |
|---|---|---|
| **Auth (client state)** | Zustand | Credenciais STS, flag `isAuthenticated` |
| **Server state** | TanStack Query | Cache de contatos, mutations (CRUD), invalidação automática |

### Fluxo de Dados

```
User Action → React Query Mutation → DynamoDB SDK → Response
                    ↓
            Cache Invalidation → Automatic Refetch → UI Update
```

---

## 4. Design System

### Tokens (Tailwind v4 @theme)

- **Cores primárias**: Paleta verde Botica (`botica-50` → `botica-950`)
- **Cores earth**: Tons terrosos complementares (`earth-50` → `earth-950`)
- **Semânticas**: `primary`, `surface`, `background`, `border`, `muted`, `text`
- **Status**: `success`, `warning`, `error`, `info`

### Componentes Base (Shadcn-inspired)

| Componente | Variants | Uso |
|---|---|---|
| `Button` | default, destructive, outline, secondary, ghost, link | Ações |
| `Input` | — | Campos de formulário |
| `Badge` | customer, lead, subscriber, active, inactive, etc. | Status/tags |
| `Label` | — | Labels de formulário |
| `Dialog` | — | Modais (create/edit/import) |
| `Table` | — | Tabela de dados densa |

### Referência Visual

Layout inspirado no padrão "Clean & Condensed" (referência: MeuFinanceiro):
- Sidebar fixa lateral com ícones e labels
- Cards brancos sobre fundo `slate-50`
- Tabelas com padding reduzido e hover states
- Badges/pills para categorização visual

---

## 5. Dependências Externas

| Pacote | Versão | Propósito |
|---|---|---|
| `@aws-sdk/client-dynamodb` | ^3.x | DynamoDB data plane |
| `@aws-sdk/lib-dynamodb` | ^3.x | Document client (marshalling) |
| `@aws-sdk/client-sts` | ^3.x | Session token via MFA |
| `@tanstack/react-query` | ^5.x | Async state management |
| `zustand` | ^5.x | Client state (auth) |
| `react-router-dom` | ^7.x | Routing |
| `papaparse` | ^5.x | CSV parsing |
| `lucide-react` | ^0.5x | Icons |
| `class-variance-authority` | ^0.7 | Component variants |
| `clsx` + `tailwind-merge` | latest | Class composition utility |
| `uuid` | ^13.x | UUID v4 generation |
