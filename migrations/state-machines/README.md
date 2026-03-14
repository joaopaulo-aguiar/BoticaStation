# Histórico de State Machines

Versões das máquinas de estado (Step Functions) são gerenciadas via CDK.
Este diretório serve para manter referência de versões importantes.

## Convenção

Ao fazer mudanças significativas numa máquina de estado, documente aqui:

```
v1-nome-da-maquina.json  → definição ASL da versão N
```

As definições reais são geradas pelo CDK em `/src/workflows/`.
