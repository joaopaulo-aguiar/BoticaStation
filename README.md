# Botica Station

Sistema interno de Automação de Marketing (CRM/Newsletter) e Gestão de Cashback para a farmácia de manipulação **Botica Alternativa**.

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| **Framework** | React 19 + Vite 7 (TypeScript) |
| **Styling** | Tailwind CSS v4 + componentes Shadcn-inspired |
| **State** | Zustand (auth) + TanStack Query (async/server state) |
| **AWS** | SDK v3 — DynamoDB, STS |
| **Router** | React Router v6 |
| **Icons** | Lucide React |

## Pré-requisitos

- **Node.js** ≥ 20.19 ou ≥ 22.12
- **npm** ≥ 10
- Credenciais AWS IAM com permissão para `sts:GetSessionToken` e acesso à tabela DynamoDB `Contact`
- Dispositivo MFA configurado na conta IAM

## Setup

```bash
# 1. Clonar o repositório
git clone https://github.com/joaopaulo-aguiar/BoticaStation.git
cd BoticaStation

# 2. Instalar dependências
npm install

# 3. Rodar em desenvolvimento
npm run dev

# 4. Build de produção
npm run build
npm run preview
```

## Autenticação

O sistema utiliza **AWS STS** para autenticação segura:

1. O usuário insere Access Key ID, Secret Access Key, MFA Device ARN e código MFA
2. O frontend chama `GetSessionToken` via STS para obter credenciais temporárias (12h)
3. Apenas as credenciais temporárias ficam em memória (nunca em localStorage)
4. Quando expiram, o usuário é redirecionado para login

## Estrutura de Pastas (Feature-Sliced Design)

```
src/
├── features/
│   ├── auth/           # Autenticação AWS STS
│   │   ├── store/      # Zustand store
│   │   └── ui/         # Login page, Protected route
│   ├── contacts/       # Gestão de Contatos (CRUD + Import)
│   │   ├── api/        # DynamoDB operations
│   │   ├── hooks/      # React Query hooks
│   │   └── ui/         # Pages, dialogs
│   ├── campaigns/      # (placeholder)
│   ├── cashback/       # (placeholder)
│   ├── reports/        # (placeholder)
│   └── settings/       # (placeholder)
└── shared/
    ├── layout/         # App shell (sidebar + main)
    ├── lib/            # Utilities, DynamoDB client
    ├── types/          # TypeScript interfaces
    └── ui/             # Reusable UI components
```

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build |

## Licença

Projeto privado — Botica Alternativa.
