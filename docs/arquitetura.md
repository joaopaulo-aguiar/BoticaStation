# Arquitetura — BoticaStation

> Documento de visão geral da arquitetura do sistema.

## Visão Geral

BoticaStation é uma plataforma de marketing serverless construída na AWS,
usando TypeScript e AWS CDK v2 para infraestrutura como código.

## Serviços AWS

| Serviço        | Função                                          |
|----------------|------------------------------------------------|
| AppSync        | API GraphQL                                     |
| DynamoDB       | Banco de dados NoSQL (múltiplas tabelas)        |
| Lambda         | Lógica de negócio serverless                    |
| Step Functions | Orquestração de fluxos complexos                |
| SES            | Envio de e-mails transacionais e campanhas      |
| Fargate/ECS    | Containers para workloads de longa duração      |
| ECR            | Registro de imagens Docker                      |
| CloudWatch     | Logs, métricas e alarmes                        |
| SQS            | Filas para desacoplamento assíncrono            |
| Cognito        | Autenticação e autorização de usuários          |
| Amplify        | Hospedagem e CI/CD do frontend                  |

## Diagramas

TODO: Adicionar diagramas de arquitetura

## Decisões de Arquitetura

Consulte [docs/adr/](adr/) para ADRs detalhados.
