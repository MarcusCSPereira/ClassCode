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

### 09/11/2026 · `feat/entrega-3-mvp` · Codex · CC-12

**Itens do backlog:** CC-12 (concluído no modo demo)

**Feito**

- O laboratório visual agora associa cada replay a um tópico e a um desafio do catálogo em [`src/lib/visualLabs.ts`](src/lib/visualLabs.ts): busca binária ↔ `search` / `binary`; bubble sort ↔ `complexity` / `distinct`.
- [`src/components/Visualizer.tsx`](src/components/Visualizer.tsx) passou a consumir a definição da visualização selecionada, mantendo o replay determinístico e expondo o quadro atual para a página registrar reflexão por passo.
- [`src/pages/LabPage.tsx`](src/pages/LabPage.tsx) ganhou contexto pedagógico da experiência selecionada, com campos locais de **previsão** e **explicação** por quadro, salvos em `localStorage`.
- Ao abrir o laboratório a partir de um desafio, o app mantém o contexto e já destaca a visualização correspondente em [`src/App.tsx`](src/App.tsx).
- Novo teste unitário [`src/lib/visualLabs.test.ts`](src/lib/visualLabs.test.ts) garante que as associações existem e que o replay segue determinístico.
- [`src/styles.css`](src/styles.css) foi ajustado para acomodar os novos blocos de associação e reflexão, incluindo tema escuro.

**Estado verificado**

- `npm run typecheck`: passou.
- `npx vitest run src/lib/visualLabs.test.ts src/lib/domain.test.ts`: passou.
- Não executado: `npm run test:e2e` e `npm run check`; a entrega alterou a UI, mas foquei na validação unitária do comportamento novo.

**Decisões tomadas**

- As reflexões do laboratório ficaram locais ao navegador e fora do `Repository`, porque o backlog não pede persistência remota para CC-12.
- O vínculo entre visualização e desafio foi centralizado em `src/lib/visualLabs.ts`, para evitar espalhar regras pela UI e preservar o replay determinístico.

**Ficou de fora / limites conhecidos**

- A previsão/explicação ainda não entra em relatório do professor nem em exportação.
- Só os desafios `binary` e `distinct` possuem visualização associada; os demais continuam abrindo o laboratório no replay padrão de busca binária.
- Não houve teste E2E cobrindo a escrita das reflexões no navegador.

**Próximo passo esperado**

1. **CC-03 ou CC-20:** retomar um item de plataforma pequeno, sem reabrir a tentativa de migrar toda a UI de uma vez.
2. Se a frente pedagógica voltar ao laboratório, adicionar cenário E2E para abrir o laboratório a partir de `binary`, escrever reflexão e confirmar que o texto persiste ao navegar.

**Bloqueios**

- Nenhum para o CC-12 no modo demo.

### 09/11/2026 · `feat/entrega-3-mvp` · Codex · CC-18

**Itens do backlog:** CC-18 (parcialmente concluído no banco local; falta homologar em PostgreSQL/Supabase real)

**Feito**

- Nova migration [`supabase/migrations/202611090001_activity_rpc.sql`](supabase/migrations/202611090001_activity_rpc.sql) com as RPCs `public.my_activity()` e `public.classroom_activity(cid uuid)`.
- As duas RPCs retornam JSON no formato consumido pela camada de atividade: `studentId`, `problemId`, `startedAt`, `hintViews`, `reportedAt`, `verification` e `evidence`; `classroom_activity` também devolve `roster`.
- `my_activity()` exige usuário autenticado e devolve apenas as tentativas do próprio usuário.
- `classroom_activity()` exige que o chamador seja o proprietário da turma; aluno da turma, aluno de fora e outro professor recebem negação.
- Novo arquivo [`src/data/supabaseRepository.ts`](src/data/supabaseRepository.ts) com a base do repositório remoto. Por enquanto, ele já implementa apenas `myActivity()` e `classroomActivity()` sobre RPCs, com parsing e validação do payload.
- Novo teste unitário [`src/data/supabaseRepository.test.ts`](src/data/supabaseRepository.test.ts) cobrindo parsing, nome/argumentos das RPCs, mapeamento de erros conhecidos e falha em payload inválido.
- `tests/database.sql` agora cobre grants das duas RPCs, isolamento de leitura, formato básico do retorno e a garantia de que `my_activity()` não devolve atividade de outro aluno.
- `tests/test-db.sh` passa a aplicar **todas** as migrations de `supabase/migrations/*.sql`, em ordem lexicográfica, em vez de listar só a migration inicial.
- `src/data/repository.ts` foi alinhado para o modo remoto com `authentication_required` e `evidence?: string` em `ActivityRow`.

**Estado verificado**

- `npm run typecheck`: passou.
- `npx vitest run src/data/supabaseRepository.test.ts`: 5 testes passaram.
- `bash tests/test-db.sh`: **não executado por completo** nesta máquina porque `initdb` não está disponível no PATH (`initdb: command not found`).
- Não executado: `npm run test:e2e` e `npm run check`; esta entrega não alterou a UI.

**Decisões tomadas**

- As RPCs retornam `jsonb`, com chaves em camelCase, para reduzir o mapeamento futuro no `supabaseRepository`.
- `evidence` já entra no payload de atividade para permitir reidratar o modal de conclusão no modo remoto sem uma consulta extra.
- O teste de banco foi generalizado para aplicar todas as migrations novas automaticamente.

**Ficou de fora / limites conhecidos**

- O frontend ainda não usa essas RPCs: o `supabaseRepository` existe, mas não está ligado em `src/data/index.ts` nem no `App`.
- No `supabaseRepository`, todos os métodos além de `myActivity()` e `classroomActivity()` ainda lançam `"CC-03 pendente"`.
- A migration não foi homologada em PostgreSQL local nem em um projeto Supabase real por falta de `initdb` e de credenciais/ambiente.
- A UI ainda depende do `demoStore` para nome, papel, turmas, progresso e rascunhos.

**Próximo passo esperado**

1. **Homologar CC-18:** rodar `bash tests/test-db.sh` em uma máquina com PostgreSQL 16+ (`initdb`, `pg_ctl`, `psql`) e aplicar as migrations em um projeto Supabase de desenvolvimento.
2. **CC-03:** completar `src/data/supabaseRepository.ts` com `listClassrooms`, `listProblems`, `startAttempt`, `revealHint`, `reportProgress` e demais escritas/leitura básicas.
3. **CC-02/CC-03:** depois ligar autenticação real e seleção demo/remoto, removendo o seletor público de papel no modo remoto.

**Bloqueios**

- Falta ambiente com PostgreSQL local para executar o teste SQL completo.
- Falta projeto Supabase de desenvolvimento/configuração da D1 para homologação fora do ambiente de teste emulado.

### 02/11/2026 · `feat/entrega-2-mvp` · Franco Borba · CC-21

**Itens do backlog:** CC-21 (concluído). Com ele, a frente Pedagógica da Entrega 2 está completa: CC-00, CC-15, CC-16, CC-17, CC-19 e CC-21.

**Feito**

- `src/data/fictitiousClass.ts`: a turma **"Turma de demonstração · dados fictícios"** (`FICTITIOUS_CLASS`, com `fictitious: true`) e `fictitiousActivity(now)`, uma função pura e determinística que gera 8 alunos. Os horários são relativos a `now`, então as mesmas situações aparecem em qualquer dia. Há um aluno para cada situação:
  - Aline avança com pouca ajuda;
  - Bruno ainda não começou;
  - Camila está inativa há 10 dias;
  - Diego está travado em 2 desafios;
  - Elisa depende de dicas (média de 2,8);
  - Felipe e Gabriela seguem regulares;
  - Heitor concluiu a trilha.
- "Quantos são diferentes?" lidera o ranking de ajuda: todos que a abriram usaram as 3 dicas e metade concluiu.
- `DemoRepository`: para o professor, `listClassrooms` inclui a turma fictícia e `classroomActivity` a devolve. Para o aluno, o acesso é negado.
- O painel recebe a turma fictícia no seletor e, quando ela está selecionada, mostra um aviso fixo: "Dados fictícios. Esta turma e seus alunos foram gerados para demonstrar o painel. Nenhum aluno real está representado."
- A turma fictícia **não** entra no estado salvo nem em "Minhas turmas": não dá para entrar nela por código, e a turma inicial continua só com a identidade real do navegador.
- `belongsToClassroom` passa a tratar o catálogo como a trilha base das duas turmas semeadas.

**Estado verificado**

- `npm run check`: TypeScript, 56 testes de unidade (5 novos) e build passaram. Os testes cobrem determinismo, independência da data, ausência de eventos no futuro, os quatro sinais, o ranking, a distribuição por etapa e o acesso só para o professor.
- `npm run test:e2e`: 20 de 20 (10 cenários × desktop e celular). O novo cenário:
  - a turma real não mostra o aviso;
  - na fictícia aparecem o aviso, 8 alunos, os quatro sinais, o ranking liderado por "Quantos são diferentes?" e "Sem etapa em aberto";
  - não há rolagem horizontal, e a turma não aparece em "Minhas turmas".
- Revisão visual rápida em desktop (tema claro): aviso e resumo (8 matriculados, 6 ativos).
- Não executado: `bash tests/test-db.sh` (sem PostgreSQL local); o SQL não mudou.

**Decisões tomadas**

- A turma fictícia vive só no repositório da demo e no painel, nunca no estado salvo, para não se misturar com dados reais.
- O contador "Turmas na demonstração" passa a incluí-la (mostra 2 na primeira abertura).
- Nomes no formato "Nome + inicial", genéricos e claramente fictícios.

**Ficou de fora / limites conhecidos**

- No modo remoto (CC-03), a turma fictícia não deve existir. Ela só faz sentido no `DemoRepository`; o `App` hoje a acrescenta ao seletor e deve deixar de fazer isso quando `repository.mode === 'remote'`.
- As capturas em `docs/images/` continuam desatualizadas.

**Próximo passo esperado**

1. **Revisão:** a branch foi enviada ao GitHub em 02/11. Revisar o PR `feat/entrega-2-mvp` → `main`; o CI (domínio, build, E2E e banco) roda no PR.
2. **Decisões D1–D5** ([ENTREGA-2.md](ENTREGA-2.md#10-decisões-pendentes-do-time)). D1 (Supabase) destrava a frente Plataforma.
3. **Frente Plataforma:** CC-01 → CC-02 → CC-03 → CC-04 → CC-05/CC-20 → CC-06 → CC-07 e CC-18. As telas da frente Pedagógica já consomem `ClassCodeRepository`; o trabalho é implementar `src/data/supabaseRepository.ts` e mover as leituras.
4. Antes da apresentação: atualizar as capturas (visão geral, trilha e painel com a turma fictícia) e ensaiar o roteiro do [PLANO.md](PLANO.md#roteiro-da-apresentação-68-minutos).

**Bloqueios**

- CC-01 e CC-18 dependem de D1 (alguém do time criar o projeto Supabase).

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
