# Migrações DynamoDB

Cada arquivo é uma migração numerada (`NNN-descricao.ts`) com funções `up()` e `down()`.

## Como criar uma nova migração

1. Copie o template: `NNN-descricao.ts`
2. Implemente `up()` com as alterações
3. Implemente `down()` para rollback
4. Execute: `npm run migrate`

## Convenções

- Numeração sequencial: 001, 002, 003...
- Nome descritivo em kebab-case
- Nunca editar migrações já aplicadas em produção
- Estado das migrações rastreado na tabela `_migrations`

## Comandos

```bash
npm run migrate          # aplica migrações pendentes
npm run migrate:status   # mostra status das migrações
```
