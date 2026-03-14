# ADR 005 — Cognito para autenticação

## Status
Aceita

## Contexto
O projeto precisa de autenticação de usuários para o frontend (Amplify)
e autorização nas APIs (AppSync). Alternativas: Cognito, Auth0, Firebase Auth.

## Decisão
Usar **Amazon Cognito** como provedor de identidade.

## Justificativa
- Integração nativa com AppSync, Amplify e API Gateway
- User pools gerenciados via CDK
- MFA, password policies e triggers Lambda integrados
- Sem custo até 50k MAUs
- Compliance com padrões de segurança AWS

## Consequências
- User pools e app clients definidos em `/infra/stacks/cognito-stack.ts`
- Triggers Lambda para customização de fluxos
- Frontend usa Amplify Auth para integração
- Nunca alterar configurações pelo console (CDK é a fonte)
