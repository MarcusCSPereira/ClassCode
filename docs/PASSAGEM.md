# Registro de passagem

Diário de continuidade do time. **Toda contribuição termina com uma entrada aqui**, para que a próxima pessoa saiba o que foi feito, o que foi verificado e qual é o próximo passo, sem depender de conversa paralela. A entrada mais recente fica no topo.

## Modelo de entrada

Copie o bloco abaixo para o topo da seção [Entradas](#entradas) e preencha.

```markdown
### DD/MM/AAAA · `nome-da-branch` · Responsável

**Itens do backlog:** CC-xx, CC-yy

**Feito**

- O que mudou, do ponto de vista de quem usa ou mantém.

**Estado verificado**

- Comandos executados e resultado (`npm run check`, `npm run test:e2e`, `bash tests/test-db.sh`).
- O que não foi verificado e por quê.

**Decisões tomadas**

- Decisão, motivo e onde foi registrada.

**Ficou de fora / limites conhecidos**

- O que não foi feito ou funciona só em parte.

**Próximo passo esperado**

1. Item do backlog e a primeira ação concreta para quem continuar.

**Bloqueios**

- O que depende de outra pessoa, de uma decisão ou de um serviço externo.
```

## Entradas

### 02/11/2026 · `feat/entrega-2-mvp` · Franco Borba

**Itens do backlog:** planejamento da Entrega 2 (CC-00 e CC-15 a CC-21)

**Feito**

- Leitura da documentação e do código da `main` no commit `2de1556`.
- Diagnóstico dos três pilares do produto (dicas graduais, métricas do professor e evolução automática) contra o estado atual.
- Proposta da próxima entrega em [ENTREGA-2.md](ENTREGA-2.md): três opções de escopo com recomendação, modelo de evolução v1, catálogo de métricas v1, contrato de repositório, novos itens de backlog, cronograma por frente, decisões pendentes, critérios de aceite e riscos.
- [PLANO.md](PLANO.md) atualizado com os novos itens e critérios do MVP; [CONTRIBUTING.md](../CONTRIBUTING.md) e o modelo de PR passam a exigir uma entrada neste registro.
- Nenhum código de produto foi alterado.

**Estado verificado**

- `npm ci` e `npm run check`: passaram (TypeScript, 10 testes de domínio, build de produção).
- Não executados nesta sessão: `npm run test:e2e` e `bash tests/test-db.sh`. O último resultado registrado está em [VALIDACAO.md](VALIDACAO.md).

**Decisões tomadas**

- Nenhuma decisão de produto foi fechada. As decisões D1 a D5 estão abertas na seção 10 de [ENTREGA-2.md](ENTREGA-2.md).

**Ficou de fora / limites conhecidos**

- As regras de evolução e os limiares das métricas são uma proposta v1 e ainda não foram validados com o professor da disciplina.

**Próximo passo esperado**

1. O time responde D1 a D5 e define quem assume cada frente.
2. **CC-00**, antes de qualquer outro item: criar `src/pages/` e mover uma página por commit, rodando `npm run test:e2e` a cada passo. Começar pela página mais isolada (`visuals`) e terminar pela mais acoplada (`problem`). Depois criar `src/data/repository.ts` e um `DemoRepository` que preserve exatamente o comportamento atual.
3. Com o CC-00 mesclado, iniciar em paralelo **CC-01** (frente Plataforma) e **CC-15/CC-17** (frente Pedagógica).

**Bloqueios**

- CC-01 depende de alguém do time criar o projeto Supabase de desenvolvimento (D1). Nenhuma credencial deve ir para o repositório, issues ou capturas.
