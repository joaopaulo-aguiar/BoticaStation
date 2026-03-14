# ADR 001 — Múltiplas tabelas DynamoDB por domínio

## Status
Aceita

## Contexto
O projeto precisa armazenar dados de múltiplos domínios (contatos, campanhas,
automações, eventos, etc.). A escolha entre single-table design e multi-table
afeta diretamente a complexidade do código e a flexibilidade de evolução.

## Decisão
Usar **múltiplas tabelas DynamoDB**, uma por domínio de negócio.

## Justificativa
- Isolamento de custos e throughput por domínio
- Facilidade de migração e backup independente
- Menor complexidade de GSIs compartilhados
- Cada tabela pode ter sua própria política de retenção

## Consequências
- Mais tabelas para gerenciar no CDK
- Cross-table queries requerem múltiplas chamadas
- Nomes de tabela injetados via variáveis de ambiente
