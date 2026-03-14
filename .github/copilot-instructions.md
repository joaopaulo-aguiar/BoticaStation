# Contexto do Projeto

## Stack completa
TypeScript, AWS CDK v2, Node.js 20, serverless + containers na AWS.

Serviços ativos:
  AppSync        → API GraphQL
  DynamoDB       → banco de dados (múltiplas tabelas por domínio)
  Lambda         → lógica de negócio serverless
  Step Functions → orquestração de fluxos
  SES            → envio de e-mails transacionais
  Fargate/ECS    → containers para workloads de longa duração
  ECR            → registro de imagens Docker
  CloudWatch     → logs centralizados, métricas e alarmes
  SQS            → filas para desacoplamento e processamento assíncrono
  Cognito        → autenticação e autorização de usuários
  Amplify        → hospedagem e CI/CD do frontend

## REGRA DE OURO: Git é a única fonte da verdade
NUNCA alterar nada pelo console AWS. Toda mudança:
  código → commit → PR → GitHub Actions → CDK deploy

## Segurança
- Autenticação AWS via OIDC (sem chaves no repositório)
- GitHubActionsRole: permissões de escrita para deploy
- DocsSyncRole: somente leitura para sync de documentação
- Localmente: AWS SSO com MFA

## Arquivos gerados automaticamente (não editar manualmente)
Estes arquivos refletem o estado REAL da AWS e são atualizados
a cada deploy na main e toda segunda-feira às 9h:

  /aws-snapshot.json           → snapshot completo de todos os recursos
  /appsync/schema.graphql      → schema GraphQL real do AppSync
  /docs/dynamodb-tables.md     → estrutura de todas as tabelas
  /docs/lambdas.md             → catálogo de funções Lambda
  /docs/step-functions/        → definição de cada máquina de estado
  /docs/ses.md                 → identidades e configuração SES
  /docs/ecs-fargate.md         → clusters, serviços e task definitions
  /docs/sqs-queues.md          → filas e suas configurações
  /docs/cognito.md             → user pools e app clients
  /docs/amplify.md             → apps e branches Amplify
  /docs/cloudwatch.md          → grupos de logs e alarmes ativos

## Mapa de arquivos do projeto
  /appsync/schema.graphql       → schema GraphQL (consultar SEMPRE)
  /appsync/resolvers/           → resolvers JS por operação
  /src/handlers/                → funções Lambda
  /src/workflows/               → Step Functions em CDK
  /src/containers/              → código dos containers Fargate
  /src/config/env.ts            → variáveis de ambiente tipadas
  /src/shared/errors.ts         → AppError padronizado
  /src/shared/logger.ts         → log estruturado JSON
  /infra/stacks/                → toda a infra AWS em CDK
  /migrations/dynamodb/         → migrações numeradas de estrutura
  /migrations/state-machines/   → histórico de versões das máquinas
  /docs/                        → toda a documentação (maioria gerada)
  /docs/adr/                    → decisões de arquitetura
  /docs/como-adicionar-servico.md → guia para novos serviços AWS
  /CHANGELOG.md                 → histórico de mudanças
  /scripts/sync-aws-docs.ts     → orquestrador do sync

## AppSync e GraphQL
- schema.graphql gerado do AppSync real — não editar manualmente
- Consultar SEMPRE antes de criar ou alterar resolver ou tipo
- Resolvers simples (CRUD): JavaScript resolver direto no DynamoDB
- Resolvers com lógica: chamam Lambda via datasource
- Mutations complexas: AppSync → Lambda → Step Function ou SQS
- Resultados assíncronos: AppSync Subscriptions

## DynamoDB
- Múltiplas tabelas por domínio — consultar /docs/dynamodb-tables.md
- Toda mudança estrutural: novo arquivo em /migrations/dynamodb/
- Nomes de tabela injetados pelo CDK como variáveis de ambiente

## Lambda
- Versionadas automaticamente (removalPolicy: RETAIN + alias "live")
- Log via /src/shared/logger.ts (nunca console.log)
- Variáveis via /src/config/env.ts (nunca hardcode)
- Erros via AppError de /src/shared/errors.ts

## SES
- Identidades e templates gerenciados via CDK em /infra/stacks/ses-stack.ts
- Consultar /docs/ses.md antes de criar novos templates ou identidades
- E-mails enviados sempre via wrapper em /src/shared/ (nunca SDK direto)

## Fargate / ECS
- Clusters, serviços e task definitions em /infra/stacks/ecs-stack.ts
- Imagens Docker em /src/containers/ — build e push via GitHub Actions
- ECR gerenciado via CDK — nunca criar repositórios manualmente
- Consultar /docs/ecs-fargate.md para configurações existentes

## SQS
- Filas definidas em /infra/stacks/sqs-stack.ts
- Sempre criar DLQ (Dead Letter Queue) para cada fila principal
- Consultar /docs/sqs-queues.md antes de criar novos consumers
- Consumers Lambda conectados via CDK (SqsEventSource)

## Cognito
- User pools em /infra/stacks/cognito-stack.ts
- App clients e escopos documentados em /docs/cognito.md
- Triggers Lambda conectados via CDK
- Nunca alterar configurações de MFA ou password policy pelo console

## CloudWatch
- Alarmes e dashboards em /infra/stacks/monitoring-stack.ts
- Todo recurso novo deve ter alarme de erro associado
- Consultar /docs/cloudwatch.md para grupos de logs existentes
- Retention policy de 30 dias em dev, 90 dias em produção

## Amplify
- Apps gerenciados via CDK em /infra/stacks/ ou console (híbrido aceitável)
- Branches e domínios documentados em /docs/amplify.md
- Variáveis de ambiente do frontend definidas via CDK

## Como adicionar novo serviço AWS
Consultar /docs/como-adicionar-servico.md para o checklist completo.
Resumo: (1) stack CDK, (2) fetcher em /scripts/fetchers/,
(3) generator em /scripts/generators/, (4) registro no sync,
(5) seção no copilot-instructions.md, (6) ADR em /docs/adr/

## Versionamento e commits (Conventional Commits)
  feat:      nova funcionalidade
  fix:       correção de bug
  infra:     mudança CDK
  schema:    mudança no GraphQL schema
  migration: migração DynamoDB
  container: mudança em imagem Docker/Fargate
  test:      testes
  docs:      documentação

## Testes
- Unit: sem AWS real — usar aws-sdk-client-mock
- Integration: DynamoDB Local + mocks de SES/SQS/Cognito
- E2E: só em staging
- Cobertura mínima: 80% linhas e funções

## Comandos
  npm test               → unit + integration
  npm run test:unit      → só unitários
  npm run test:int       → integração (requer DynamoDB Local)
  npm run test:coverage  → relatório de cobertura
  cdk diff               → ver mudanças antes de deployar
  cdk deploy             → deploy
  npm run migrate        → migrations DynamoDB pendentes
  npm run sync-docs      → sincroniza docs com AWS (todos os serviços)
