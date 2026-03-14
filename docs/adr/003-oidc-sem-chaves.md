# ADR 003 — OIDC sem chaves no repositório

## Status
Aceita

## Contexto
GitHub Actions precisa de credenciais AWS para deploy. Existem duas opções
principais: chaves de acesso (access keys) ou OIDC federation.

## Decisão
Usar **OIDC (OpenID Connect)** para autenticação AWS no GitHub Actions.
Zero chaves armazenadas no repositório.

## Justificativa
- Sem secrets de longa duração expostos
- Credenciais temporárias (15min–1h) geradas por request
- Rotação automática — nada para gerenciar
- Princípio de menor privilégio com roles dedicadas:
  - `GitHubActionsRole`: permissões de escrita para deploy
  - `DocsSyncRole`: somente leitura para sync de documentação

## Consequências
- Requer configuração inicial do Identity Provider no IAM
- Cada workflow usa a role apropriada via `role-to-assume`
- Localmente: AWS SSO com MFA para desenvolvimento
