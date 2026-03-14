# ADR 004 — Fargate vs Lambda para workloads de longa duração

## Status
Aceita

## Contexto
Algumas tarefas do projeto (envio em massa, processamento de campanhas)
excedem o limite de 15 minutos do Lambda. Precisamos de um runtime alternativo.

## Decisão
Usar **Fargate (ECS)** para workloads de longa duração, mantendo Lambda
para lógica de negócio rápida.

## Justificativa
- Sem limite de tempo de execução
- Suporte a containers Docker com dependências complexas
- Escala automática baseada em métricas
- Custo previsível para workloads constantes
- Lambda continua ideal para handlers de API e eventos

## Consequências
- Duas estratégias de deploy: Lambda (CDK direto) e Fargate (Docker build + push)
- Imagens Docker gerenciadas no ECR via CDK
- Pipeline inclui build de containers no GitHub Actions
- Código dos containers em `/src/containers/`
