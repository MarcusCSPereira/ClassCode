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

### 02/11/2026 · `feat/entrega-2-mvp` · Franco Borba · CC-19

**Itens do backlog:** CC-19 (concluído no modo demo)

**Feito**

- Nova seção **"Acompanhamento da turma"** no Painel do professor, em `src/components/ClassMetrics.tsx`:
  - seletor "Turma acompanhada";
  - resumo: matriculados, ativos em 7 dias, conclusões autodeclaradas e alunos com sinais;
  - **tabela de alunos**, com os sinais de atenção e o motivo de cada um;
  - **questões que mais exigiram ajuda** (top 5, com funil das dicas e taxa de conclusão);
  - **alunos por etapa**;
  - **mapa aluno × questão**;
  - botão **Exportar CSV**.
- Estados de carregamento, turma sem alunos (mostra o código de convite), erro com "Tentar novamente" e professor sem turma. Ao recarregar a mesma turma, os dados anteriores continuam visíveis.
- Texto fixo sob o título: "Conclusões são autodeclaradas. As métricas apoiam o acompanhamento pedagógico e não são nota."
- O `App` passa `loadActivity` com `useCallback`. A função muda quando tentativas, dicas, conclusões, nome ou matrículas mudam, e isso recarrega o painel.
- `domain.ts`:
  - `belongsToClassroom`: uma única regra de "questões da turma", agora usada pela tela de turmas, pelo `DemoRepository` e pelo painel;
  - `downloadFile`: download genérico; o `downloadJson` passou a usá-lo;
  - `slug`: nome do arquivo CSV.
- O cartão "Próximo marco" do painel deixou de dizer que o acompanhamento de alunos não existe.

**Estado verificado**

- `npm run check`: TypeScript, 51 testes de unidade (2 novos, para `slug` e `belongsToClassroom`) e build passaram.
- `npm run test:e2e`: 18 de 18 (9 cenários × desktop e celular). O novo cenário:
  - o aluno conclui um desafio e abre outro;
  - a mesma identidade passa a professor e vê a tabela (100% de autonomia, etapa Primeiros algoritmos) e o mapa ("Concluiu sem dica", "Em andamento");
  - baixa o CSV e confere o nome do arquivo e o conteúdo;
  - cria uma turma vazia e vê o estado vazio, com o CSV desabilitado, sem rolagem horizontal.
- Revisão visual com dados semeados (um sinal "Travado"): desktop 1440 px no tema claro, celular 375 px no tema escuro. As tabelas rolam dentro do próprio quadro, sem rolagem horizontal na página.
- Não executado: `bash tests/test-db.sh` (sem PostgreSQL local); o SQL não mudou.

**Decisões tomadas**

- O seletor se chama "Turma acompanhada" porque o formulário de questão já tem um seletor "Turma". Com dois rótulos iguais, o E2E antigo quebrou; renomear evitou mexer nele.
- O ranking mostra as 5 primeiras questões.
- O CSV exporta só a tabela por aluno, como pede a seção 8.

**Ficou de fora / limites conhecidos**

- No modo demo, a turma tem no máximo um aluno: a própria identidade local, mostrada com o nome do perfil. O painel fica demonstrável com o CC-21 ou com usuários reais (CC-02 a CC-04 e CC-18).
- O estado de erro não tem teste automatizado: o `DemoRepository` não falha nesse caminho. Ele será exercitado com o repositório remoto.
- O mapa mostra os títulos completos das questões; com muitas questões, a tabela rola na horizontal.

**Próximo passo esperado**

1. **CC-21 (frente Pedagógica):** turma fictícia no modo demo, com 6–8 alunos e atividade gerada de forma determinística. Precisa estar identificada na interface como dados fictícios.
   - Sugestão: outra turma semeada ("Turma de demonstração · dados fictícios") cujo `classroomActivity` devolve alunos gerados por uma função pura e testada em `src/data/`. Assim, a turma inicial continua só com a identidade real do navegador.
   - Cobrir os quatro sinais e uma questão com muita ajuda, para a apresentação.
2. **Frente Plataforma:** com D1 decidido, CC-01 → CC-02 → CC-03 → CC-04, e CC-18 (`classroom_activity` no banco). O painel já consome `ClassroomActivity`, então não precisa mudar.
3. Atualizar as capturas em `docs/images/` (visão geral e painel) antes da apresentação.
4. Enviar a branch ao GitHub para revisão: CC-00, CC-15, CC-16, CC-17 e CC-19 ainda são commits locais.

**Bloqueios**

- Nenhum para CC-21. CC-01 e CC-18 seguem dependendo de D1.

### 02/11/2026 · `feat/entrega-2-mvp` · Franco Borba · CC-17

**Itens do backlog:** CC-17 (concluído)

**Feito**

- `src/lib/metrics.ts`, só funções puras. `classroomMetrics(modules, problems, activity, now)` recebe o que `repository.classroomActivity()` devolve e calcula:
  - por aluno: desafios abertos, conclusões, taxa de conclusão, dicas por conclusão, autonomia (% sem dica), tempo mediano até registrar, última atividade, etapa atual e sinais de atenção com o motivo;
  - por questão: abertos, conclusões, taxa, funil das 3 dicas e tempo mediano;
  - por turma: matriculados, ativos nos últimos 7 dias, ranking das "questões que mais exigiram ajuda", distribuição por etapa e mapa aluno × questão.
- `describeCell` escreve as células do mapa ("Viu 2 dicas", "Concluiu sem dica").
- `studentsCsv` gera a tabela por aluno pronta para Excel/Sheets em português.
- Limiares em `METRIC_RULES` (7 dias, 48 h, 2 desafios, 3 conclusões, 2,5 dicas).
- Nenhuma tela foi alterada; o painel é o CC-19.

**Estado verificado**

- `npm run check`: TypeScript, 49 testes de unidade (11 novos) e build passaram.
- `npm run test:e2e`: 16 de 16, como no CC-16.
- Não executado: `bash tests/test-db.sh` (sem PostgreSQL local); o SQL não mudou.

**Decisões tomadas**

Registradas na seção 6.4 de [ENTREGA-2.md](ENTREGA-2.md#64-implementação-cc-17). As principais:

- "Travado" conta o tempo desde que o desafio foi aberto.
- O funil conta por número da dica; dica aberta depois da conclusão não conta como ajuda.
- Quem nunca abriu um desafio recebe só "Ainda não começou", e não "Inativo".
- O CSV usa `;`, vírgula decimal e BOM, e neutraliza fórmulas em nomes digitados por alunos.

**Ficou de fora / limites conhecidos**

- Os limiares ainda não foram calibrados com o professor (D4).
- No modo demo a turma tem no máximo um aluno, a identidade local. Por isso o painel só fica demonstrável com o CC-21 (turma fictícia) ou com usuários reais.

**Próximo passo esperado**

1. **CC-19 (frente Pedagógica):** painel do professor em `src/pages/TeacherPage.tsx`.
   - Primeira ação: um seletor da turma; para a escolhida, chamar `repository.classroomActivity(id)` e `classroomMetrics(modules, questõesDaTurma, atividade, Date.now())`.
   - Questões da turma: no demo são as do catálogo para `demo-class` e as com `authorClassId` igual ao id da turma, a mesma regra da `ClassesPage`. Vale incluir um filtro por turma em `listProblems` antes do CC-03.
   - Mostrar o resumo, a tabela por aluno com os sinais, as questões que mais exigiram ajuda e o mapa aluno × questão.
   - Botão de CSV: `studentsCsv` + download como `text/csv;charset=utf-8`. Hoje `domain.ts` só tem `downloadJson`; generalizar.
   - Estados de carregamento, vazio e erro.
   - Texto fixo: "Conclusões são autodeclaradas; métricas não são nota".
2. **CC-21**, logo depois ou junto: turma fictícia identificada como tal, para o painel ter conteúdo na apresentação.
3. Continua valendo: decidir D1–D5 e enviar a branch ao GitHub para revisão (CC-00, CC-15, CC-16 e CC-17 ainda são commits locais).

**Bloqueios**

- Nenhum para CC-19 e CC-21. CC-01 e CC-18 seguem dependendo de D1.

### 02/11/2026 · `feat/entrega-2-mvp` · Franco Borba · CC-16

**Itens do backlog:** CC-16 (concluído no modo demo)

**Feito**

- O `App.tsx` carrega a atividade do aluno por `repository.myActivity()` e recarrega quando tentativas, dicas ou conclusões mudam. Com ela calcula `moduleStatuses`, `currentModule` e `recommendNext`.
- **Visão geral:**
  - A seção "Um novo desafio espera por você" virou **"Seu próximo passo"**: o desafio recomendado, o motivo em texto e um selo (Continuar, Avançar ou Reforçar).
  - O botão principal e o "Vamos praticar" da barra lateral abrem a recomendação; com a trilha completa, levam à trilha.
  - A meta fixa "3 desafios de fundamentos" virou **"Seu objetivo atual"**, derivado da etapa atual ("Conclua o desafio de Laços & simulação · 0/1").
  - Os três cartões da trilha começam na etapa atual.
- **Cartões de etapa** (`ModuleCard`): selo de estado (Etapa atual, Disponível, Em andamento, Aguardando, Concluído, Dominado) e o estado em texto ("Recomendado após Laços & simulação", "1 de 2 para concluir"). A barra mostra o avanço até concluir. Os rótulos ficam em `src/components/moduleStatus.ts`.
- **Minha trilha:** mesmos cartões, com a etapa atual destacada e citada no banner.
- **Modal da etapa:** "Sua situação: Dominado · 2/3 desafios concluídos · autonomia média de 88%".
- Enquanto a atividade carrega, os botões de praticar ficam desabilitados e a seção mostra "Calculando o próximo passo…". No demo isso dura um instante; no modo remoto será o estado de carregamento.

**Estado verificado**

- `npm run check`: TypeScript, 38 testes de unidade e build passaram.
- `npm run test:e2e`: 16 de 16 (8 cenários × desktop e celular). Dois cenários novos:
  - critério de aceite: concluir 2 desafios de Fundamentos muda a recomendação para "Uma sequência curiosa", em Laços;
  - liberar uma dica não registra leitura; só o clique registra.
- Revisão visual no navegador: desktop 1440 px nos temas claro e escuro, celular 375 px, modal da etapa e trilha concluída. Achado e corrigido: no cartão compacto do celular (≤ 430 px) o selo cobria a descrição. Agora ele fica oculto ali, como o número da etapa, e o estado continua em texto.
- Não executado: `bash tests/test-db.sh` (sem PostgreSQL local); o SQL não mudou.

**Decisões tomadas**

- O selo do tipo de recomendação usa o estilo `subtle-badge`, que o design já esconde abaixo de 1190 px; o motivo em texto aparece sempre.
- A meta usa o singular quando a etapa tem um desafio ("Conclua o desafio de…").

**Ficou de fora / limites conhecidos**

- Funciona só no modo demo, com a identidade local única. O critério da seção 11 ("recomendação muda sozinha") só fecha com usuários reais (CC-02 a CC-04).
- A página "Desafios" não destaca o desafio recomendado.
- As capturas em `docs/images/` ainda mostram a visão geral anterior. Atualizar antes da apresentação.
- Falha ao carregar a atividade aparece só no aviso flutuante; um estado de erro na seção fica para o CC-03.

**Próximo passo esperado**

1. **CC-17 (frente Pedagógica):** criar `src/lib/metrics.ts` com o catálogo da seção 6 de [ENTREGA-2.md](ENTREGA-2.md#6-métricas-do-professor-catálogo-v1), sobre `ClassroomActivity`. Reaproveitar `hintsBeforeCompletion`, `autonomy` e `currentModule`. Testar com uma turma fictícia em que haja um aluno sem tentativas, um inativo, um travado e um dependente de dicas.
2. **CC-19:** painel do professor sobre `repository.classroomActivity()`, depois do CC-17.
3. Continua valendo: decidir D1–D5 e enviar a branch ao GitHub para revisão (CC-00, CC-15 e CC-16 ainda são commits locais).

**Bloqueios**

- Nenhum para CC-17. CC-01 segue dependendo de D1.

### 02/11/2026 · `feat/entrega-2-mvp` · Franco Borba · CC-15

**Itens do backlog:** CC-15 (concluído)

**Feito**

- Motor de evolução em `src/lib/progression.ts`, só funções puras: `autonomy`, `hintsBeforeCompletion`, `moduleStatuses`, `currentModule` e `recommendNext`, com parâmetros em `PROGRESSION_RULES` (2 conclusões por módulo, Dominado com autonomia média ≥ 0,75, ajuda alta com autonomia ≤ 0,50).
- Cada recomendação traz `kind` (`continue`, `advance` ou `reinforce`), o desafio, o módulo e o `reason` em português para mostrar ao aluno.
- Nenhuma tela foi alterada: a interface continua com "próximo desafio = primeiro não concluído" e a meta fixa até o CC-16.

**Estado verificado**

- `npm run check`: TypeScript, 38 testes de unidade (17 novos) e build passaram.
- `npm run test:e2e`: 12 de 12, como no CC-00.
- Não executado: `bash tests/test-db.sh` (sem PostgreSQL local); o SQL não mudou.

**Decisões tomadas**

Registradas na seção 5 de [ENTREGA-2.md](ENTREGA-2.md#5-evolução-automática-e-gradual-modelo-v1), onde a proposta deixava margem:

- Pré-requisito sem questões é transparente: valem os pré-requisitos dele.
- Quem atinge o critério antes dos pré-requisitos (bloqueio suave) tem o módulo Concluído; tentativa em módulo Aguardando não o torna Em andamento.
- A tendência de ajuda usa as duas conclusões mais recentes da trilha inteira.
- O reforço só considera módulos Concluídos e não Dominados; sem candidata, `recommendNext` devolve `null` (trilha completa).
- Atividade de desafios não publicados é ignorada.

**Ficou de fora / limites conhecidos**

- Os parâmetros ainda não foram validados com o professor da disciplina (D3).
- "Continuar" escolhe qualquer desafio aberto e não concluído, mesmo aberto só para olhar. Como abrir já inicia a tentativa, se isso incomodar no teste de usabilidade, considerar exigir uma dica revelada, como no sinal "Travado" das métricas.

**Próximo passo esperado**

1. **CC-16 (frente Pedagógica):** levar o motor para a interface.
   - Primeira ação: no `App.tsx`, carregar `repository.myActivity()` em um estado e recarregar sempre que a store mudar (no modo demo, o efeito pode depender de `state`).
   - Passar `recommendNext(modules, all, activity)` para a visão geral e para o botão "Vamos praticar", no lugar de `next`.
   - Na `ModuleCard`, mostrar o `status` e o `blockedBy` ("Recomendado após X").
   - Trocar a meta fixa por `currentModule` com `required`/`completed`.
   - E2E de aceite: concluir 2 desafios de Fundamentos muda a recomendação para Laços.
2. **CC-17 (pode correr em paralelo):** `src/lib/metrics.ts` reaproveitando `hintsBeforeCompletion`, `autonomy` e `currentModule`. Para cada aluno, filtrar `activity` por `studentId` e chamar `moduleStatuses`.
3. Continua valendo: decidir D1–D5 e enviar a branch ao GitHub para revisão (CC-00 e CC-15 ainda são commits locais).

**Bloqueios**

- Nenhum para CC-16 e CC-17. CC-01 segue dependendo de D1.

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
