# ADR 002 — Resolvers JavaScript no AppSync

## Status
Aceita

## Contexto
O AppSync suporta VTL (Velocity Template Language) e JavaScript para resolvers.
Precisamos escolher a linguagem padrão para os resolvers do projeto.

## Decisão
Usar **JavaScript resolvers** no AppSync para todas as operações.

## Justificativa
- Mesma linguagem do restante do projeto (TypeScript/JavaScript)
- Mais fácil de testar e debugar
- Suporte a pipeline resolvers
- VTL está sendo descontinuado pela AWS em favor de JS

## Consequências
- Resolvers simples (CRUD) acessam DynamoDB diretamente
- Resolvers complexos delegam para Lambda via datasource
- Mutations complexas: AppSync → Lambda → Step Function ou SQS
