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

### 02/11/2026 · `feat/entrega-2-mvp` · Franco Borba · CC-00

**Itens do backlog:** CC-00 (concluído)

**Feito**

- `App.tsx` caiu de 1.464 para 442 linhas. Cada tela está em `src/pages/`, cada modal em `src/modals/`, e `ModuleCard`, `ProblemList`, `Progress` e `TopicIcon` viraram componentes em `src/components/`. A navegação por hash está em `src/lib/navigation.ts`.
- Contrato `ClassCodeRepository` em `src/data/repository.ts`, com `ProblemSummary` (sem texto de dica), `NewProblem`, `ActivityRow`, `RosterEntry` e `RepositoryError` (códigos iguais aos do SQL).
- `DemoRepository` (`src/data/demoRepository.ts`) sobre uma store externa (`src/data/demoStore.ts`, lida com `useSyncExternalStore`). Criar turma, entrar por código, publicar questão, iniciar tentativa, revelar dica, registrar e reabrir conclusão passam pelo repositório. Troca de perfil e rascunhos continuam locais.
- Estado local na **versão 2**: `joinedAt`, `hintViews` com horário de leitura e `reports` com horário de conclusão. Dados da v1 são migrados na leitura, na mesma chave `classcode.demo.v1`.
- A tela de prática não lê mais o texto da dica do objeto do problema: pede ao repositório com `revealHint`, inclusive para dicas já vistas ao reabrir a página.
- `myActivity()` e `classroomActivity()` já devolvem `ActivityRow` no modo demo. É a entrada de CC-15, CC-16, CC-17 e CC-19.

**Estado verificado**

- `npm run check`: TypeScript, 21 testes de unidade (11 novos) e build passaram.
- `npm run test:e2e`: 12 de 12 (6 cenários × desktop e celular). Os 5 cenários antigos passaram sem alterar asserts; o novo abre dados salvos na v1.
- Não executado: `bash tests/test-db.sh`, por falta de PostgreSQL nesta máquina. O SQL não foi alterado.
- Commits: `f22a9b2` (divisão das telas) e `ed79d30` (repositório e estado v2). Resultados detalhados em [VALIDACAO.md](VALIDACAO.md#entrega-2--cc-00-02112026).

**Decisões tomadas**

- Uma interface única (`ClassCodeRepository`) em vez de quatro repositórios por entidade, como previa a [ARQUITETURA.md](ARQUITETURA.md) (atualizada). Motivo: um único ponto para trocar demo por remoto e menos código para a frente Plataforma implementar.
- A chave de armazenamento foi mantida; o campo `version` conduz a migração.
- Rascunhos ficam locais em qualquer modo; persistência remota de rascunho está fora do MVP.
- D1 a D5 continuam abertas.

**Ficou de fora / limites conhecidos**

- As telas ainda **leem** a store local; só as **escritas** passam pelo repositório. Mover as leituras, com carregamento e erro, é parte do CC-03.
- `lib/catalog.ts`, com os textos das dicas, continua no bundle. Separar currículo de questões da demo é parte do CC-03 (sugestão em [ENTREGA-2.md](ENTREGA-2.md#7-contrato-de-repositório)).
- Diferenças pequenas de comportamento: o filtro de nível da trilha e a busca de desafios voltam ao padrão ao trocar de tela; "Reabrir desafio" apaga a evidência registrada, como o banco fará (antes ela ficava pré-preenchida); erros do repositório aparecem no aviso flutuante, que ainda usa o ícone de sucesso.

**Próximo passo esperado**

1. O time responde D1 a D5 ([ENTREGA-2.md](ENTREGA-2.md#10-decisões-pendentes-do-time)), principalmente D1, que destrava o Supabase.
2. Revisar e mesclar o CC-00 na `main` antes de abrir as frentes, para que as duas partam da mesma estrutura.
3. **Frente Pedagógica:** CC-15. Criar `src/lib/progression.ts` com os casos da seção 5.4, recebendo `ProblemSummary[]` e `ActivityRow[]` (os mesmos tipos que `repository.listProblems()` e `repository.myActivity()` devolvem). Em paralelo, CC-17 em `src/lib/metrics.ts`, sobre `ClassroomActivity`. Nenhum dos dois precisa de rede.
4. **Frente Plataforma:** CC-01 e, em seguida, CC-02/CC-03. Criar `src/data/supabaseRepository.ts` implementando a mesma interface, escolher a implementação em `src/data/index.ts` e mover as leituras das telas para o repositório.

**Bloqueios**

- CC-01 depende de alguém do time criar o projeto Supabase de desenvolvimento (D1).
- Para outra pessoa continuar desta branch, ela precisa estar no GitHub: `git push -u origin feat/entrega-2-mvp`.

### 02/11/2026 · `feat/entrega-2-mvp` · Franco Borba · planejamento

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
