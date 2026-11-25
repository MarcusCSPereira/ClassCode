# Validação da base inicial

Data: 02/11/2026. Este relatório cobre a demonstração e a fundação de banco, não uma implantação institucional concluída.

**Resultado da primeira execução no GitHub:** [Quality aprovado](https://github.com/MarcusCSPereira/ClassCode/actions/runs/41504696808), com build, 10 testes de domínio, 8 cenários E2E (quatro em cada viewport) e verificações de banco. Todos passaram sem retries.

## Verificações locais

- TypeScript estrito, testes de domínio e build de produção: `npm run check`.
- **10 testes de domínio**: limites temporais de dicas, relógio retrocedido, questão incompleta, links de judge, grafo curricular sem ciclos, filtro de conteúdo local e frames de busca/ordenação.
- **PostgreSQL 16 temporário**: criação de turma pelo professor, matrícula idempotente, leitura restrita por turma, negação a outro professor/aluno, bloqueio de autopromoção de papel e de timestamp de tentativa, dicas antes/depois do prazo, registro de leitura e distinção de conclusão autodeclarada.
- Revisão visual e funcional no navegador: desktop e celular, navegação, rascunhos, perfil, turmas, registro de conclusão e laboratório.
- Largura conferida em 390 px: dashboard e laboratório com `scrollWidth = innerWidth`, sem rolagem horizontal.

## Testes de navegação no CI

`tests/flows.spec.ts` define quatro cenários executados em dois perfis (desktop 1440×1000 e celular 390×664):

1. Rascunhos por linguagem, recarregamento, bloqueio de dica e registro de conclusão.
2. Professor cria turma/questão; aluno não a vê antes da matrícula e entra pelo código.
3. Frames de busca/ordenação e ausência de rolagem horizontal indevida no laboratório.
4. Liberação de dica por tempo simulado e persistência após recarregamento.

Resultados das execuções estão no [GitHub Actions](https://github.com/MarcusCSPereira/ClassCode/actions/workflows/ci.yml). Falhas preservam traces para diagnóstico.

## Limites conhecidos

- Auth do banco é emulado nos testes PostgreSQL. Grants e funções precisam ser homologados no Supabase com JWT real e via PostgREST antes do uso institucional.
- Não há execução de código ou teste real de runtimes Python/Java/C++. A seleção de linguagem muda o rascunho; não produz veredito.
- Dicas da demonstração estão no bundle e o relógio é manipulável; o controle real fornecido no SQL ainda não foi conectado à UI.
- Dados locais não sincronizam dispositivos e não separam pessoas que compartilham o navegador.
- Somente as primeiras cinco etapas têm questões; os tópicos avançados estão mapeados, com conteúdo em preparação.
- Acessibilidade foi considerada no design e na implementação, mas não há declaração de conformidade ou auditoria assistiva completa.

## Tema e realce de sintaxe

A suíte E2E foi ampliada para cinco cenários em cada viewport (10 execuções): além dos fluxos existentes, verifica alternância e persistência de tema, tokens de palavras-chave/strings/números em Python/Java/C++, preservação dos rascunhos e largura móvel. O editor passou a usar um campo editável CodeMirror; os testes verificam o conteúdo renderizado, em vez de depender de uma implementação com textarea.

## Entrega 2 · CC-00 (02/11/2026)

Refatoração sem mudança de fluxo: telas divididas em `src/pages/` e `src/modals/`, escritas pelo `ClassCodeRepository` e estado local na versão 2.

- `npm run check`: TypeScript, **21 testes de unidade** (10 anteriores e 11 novos da store e do `DemoRepository`) e build.
- `npm run test:e2e`: **6 cenários em cada viewport (12 execuções)**. Os cinco anteriores passaram sem alterar asserts; o novo abre dados salvos pela versão 1 e confere rascunho, dica revelada e conclusão.
- Os testes novos cobrem migração v1 → v2, armazenamento bloqueado, tentativa idempotente, dica antes e depois do prazo com leitura registrada uma vez, conclusão sem tentativa, edição que preserva o horário, reabertura, entrada por código, ações exclusivas do professor e atividade restrita aos desafios da turma.
- Não executado: `bash tests/test-db.sh` (sem PostgreSQL local nesta máquina). O SQL não foi alterado.

## Entrega 2 · CC-15 (02/11/2026)

Motor de progressão em `src/lib/progression.ts`, sem alteração de interface.

- `npm run check`: TypeScript, **38 testes de unidade** (17 novos em `progression.test.ts`) e build.
- `npm run test:e2e`: 12 execuções, sem mudança em relação ao CC-00.
- Os testes novos cobrem os sete casos mínimos da seção 5.4 de [ENTREGA-2.md](ENTREGA-2.md) e também: valores de autonomia, módulo com uma única conclusão, tentativa em módulo aguardando, reforço com a trilha concluída, atividade de desafio não publicado, pré-requisito sem questões, as três faixas de dificuldade adaptativa e o uso das duas conclusões mais recentes.
- Não executado: `bash tests/test-db.sh` (sem PostgreSQL local). O SQL não foi alterado.

## Entrega 2 · CC-16 (02/11/2026)

Trilha adaptativa na interface do aluno (modo demo).

- `npm run check`: TypeScript, 38 testes de unidade e build.
- `npm run test:e2e`: **8 cenários em cada viewport (16 execuções)**. Novos: concluir dois desafios de Fundamentos muda o próximo passo para Laços, marca Fundamentos como Dominado e mostra "Recomendado após Laços & simulação" em Vetores; liberar uma dica não registra leitura, só o clique registra.
- Revisão visual: desktop 1440 px (claro e escuro), celular 375 px (sem rolagem horizontal), modal da etapa e estado de trilha concluída. Corrigida a sobreposição do selo de estado no cartão compacto do celular.
- Não executado: `bash tests/test-db.sh` (sem PostgreSQL local). O SQL não foi alterado.

## Entrega 2 · CC-17 (02/11/2026)

Cálculo das métricas do professor em `src/lib/metrics.ts`, sem alteração de interface.

- `npm run check`: TypeScript, **49 testes de unidade** (11 novos em `metrics.test.ts`) e build.
- `npm run test:e2e`: 16 execuções, sem mudança em relação ao CC-16.
- Os testes usam uma turma fictícia com um aluno por situação da seção 6 de [ENTREGA-2.md](ENTREGA-2.md): ativo, sem tentativas, inativo há 9 dias, travado e dependente de dicas. Eles cobrem métricas por aluno e por questão, funil de dicas, ranking de ajuda, distribuição por etapa, mapa aluno × questão, dica aberta depois da conclusão, atividade fora da turma, turma vazia e o CSV (formato pt-BR, escape de `;` e aspas, proteção contra fórmulas).
- Não executado: `bash tests/test-db.sh` (sem PostgreSQL local). O SQL não foi alterado.

## Entrega 2 · CC-19 (02/11/2026)

Painel de acompanhamento da turma (modo demo).

- `npm run check`: TypeScript, **51 testes de unidade** (2 novos para `slug` e `belongsToClassroom`) e build.
- `npm run test:e2e`: **9 cenários em cada viewport (18 execuções)**. O novo cobre a tabela de alunos, o mapa aluno × questão, o download do CSV (nome e conteúdo), o estado de turma sem alunos com exportação desabilitada e a ausência de rolagem horizontal.
- Revisão visual com dados semeados: desktop 1440 px (claro) e celular 375 px (escuro). As tabelas rolam dentro do quadro; a página não rola na horizontal.
- Sem teste automatizado: o estado de erro, porque o `DemoRepository` não falha nesse caminho.
- Não executado: `bash tests/test-db.sh` (sem PostgreSQL local). O SQL não foi alterado.

## Entrega 2 · CC-21 (02/11/2026)

Turma fictícia para demonstrar o painel do professor.

- `npm run check`: TypeScript, **56 testes de unidade** (5 novos em `fictitiousClass.test.ts`) e build.
- `npm run test:e2e`: **10 cenários em cada viewport (20 execuções)**. O novo cobre o aviso de dados fictícios (ausente na turma real), os 8 alunos, os quatro sinais, o ranking, "Sem etapa em aberto", a ausência de rolagem horizontal e que a turma não aparece em "Minhas turmas".
- Os testes de unidade garantem geração determinística, resultado igual em qualquer data, nenhum evento no futuro, uso só do catálogo e acesso só para o professor.
- Não executado: `bash tests/test-db.sh` (sem PostgreSQL local). O SQL não foi alterado.

## Continuidade remota · CC-02/03/04/05/06/07/18/20 (10/11/2026)

- `tsc --noEmit`: passou com Supabase Auth, estado remoto e contrato completo do repositório.
- Vitest: **72 testes em 7 arquivos**; os testes do adaptador verificam nomes/argumentos das RPCs, conversão de perfil, turmas, questões e atividade, escritas, erros conhecidos e payloads inválidos.
- `vite build`: passou; o cliente oficial `@supabase/supabase-js` é dependência de produção.
- PostgreSQL 16.13 temporário: migrations, seed e testes cobrem Auth emulado, negações, listagens isoladas, publicação, evidência/reabertura, atividade e importação idempotente dos sete modelos privados.
- Playwright: **22 de 22** fluxos passaram em desktop e celular, preservando o modo demo. O novo cenário abre o laboratório a partir de `binary` e confirma a persistência da previsão/explicação ao navegar e recarregar. O loop de atualização observado anteriormente foi corrigido e o aviso não reapareceu na execução final.
- Não executado: aplicação das migrations em Supabase real e testes via JWT/PostgREST em dois navegadores. Este ambiente não possui `.env` nem acesso configurado a um projeto Supabase; isso continua sendo condição de aceite de CC-01/09, não deve ser substituído pelo Auth emulado.

## Entrega 4 · fatia 1 / CC-22 (24/11/2026)

Judge confiável: endereço configurável, casos de teste no servidor e checagem do bundle.

- `npm run check`: TypeScript, **87 testes de unidade em 10 arquivos**, build e a nova checagem `scripts/check-bundle.mjs`. Os testes novos cobrem a escolha do endereço, o envio só do código com cabeçalhos de sessão, a tradução de erros HTTP e de rede, o executor do Judge0 (todos os casos, parada no primeiro erro sem devolver saída oculta, polling), a validação do corpo, os códigos 401/403/422/502 do tratador e a igualdade entre os casos do seed e os da demo.
- A checagem do bundle acusou amostras sintéticas de vazamento nos dois formatos (`\n` escapado e quebra de linha real) e passou no build atual. O primeiro filtro dava falso positivo com `999999999`, presente numa tabela numérica de biblioteca; agora só valores com mais de uma palavra contam.
- `npm run test:e2e`: **24 de 24** (12 cenários × desktop e celular). O novo cenário intercepta `/api/judge/submit`: confere que o envio leva só `problemId`, `language`, `sourceCode` e `idempotencyKey`, que o veredito aparece e que um 404 vira a mensagem "judge-submit foi publicada".
- Servidor local de verdade (`npm run dev`, sem interceptação): corpo inválido → 400, desafio sem casos → 422, `GET` → 405. Nenhuma chamada ao Judge0 público foi feita.
- `bash tests/test-db.sh` em PostgreSQL 18.1 no Windows (o script agora usa `127.0.0.1:54329` no Git Bash): passou com as verificações novas de `judge_cases`. Só a chave de serviço executa a função; o aluno matriculado recebe os 4 casos de `sum` com o exemplo primeiro; o dono roda rascunho; aluno de outra turma, outro professor, aluno em rascunho e requisitante nulo recebem negação; a trilha importada recebe os 31 casos.
- Site publicado (antes desta fatia): o botão respondia "Falha ao submeter código (HTTP 405)"; o bundle publicado não continha casos ocultos.
- Não verificado: deploy da Edge Function e chamadas reais ao Judge0 e ao Supabase (sem projeto configurado).

## Entrega 4 · fatia 3 / CC-24 (24/11/2026)

Ciclo da questão do professor: rascunho, casos ocultos, validação, publicação, edição e arquivo.

- `npm run check`: TypeScript, **93 testes de unidade**, build e checagem do bundle. Novos:
  - demo: rascunho oculto do aluno, edição que mantém id e estado, recusa de mudar de turma, de caso sem saída e de editar o catálogo, contagem de quem abriu, arquivar e restaurar, e questões antigas sem estado que continuam publicadas;
  - remoto: nomes e argumentos de `save_problem`, `get_problem_for_edit` e `set_problem_status`, e recusa de estado desconhecido ou edição sem casos;
  - domínio: visibilidade por estado e limites dos casos ocultos.
- `npm run test:e2e`: **26 de 26** (13 cenários × desktop e celular).
  - O cenário antigo "professor cria turma e questão" foi **ajustado** ao fluxo novo: rascunho → "Publicar sem validar" → "Abrir".
  - O novo cenário faz o ciclo completo: cria rascunho com caso oculto; confere que o aluno não o vê; valida com solução de referência (judge interceptado), conferindo que a questão local envia o exemplo e o caso oculto; publica; edita com os casos preenchidos; o aluno vê; arquiva com confirmação; o aluno deixa de ver; restaura como rascunho.
- `bash tests/test-db.sh` (PostgreSQL 18.1, Windows): passou com as verificações novas:
  - o rascunho nasce oculto e o dono lê dicas e casos;
  - o caso 1 é o exemplo;
  - aluno e outro professor recebem negação para ler, editar, publicar, arquivar e criar;
  - mudar de turma, 20 casos ocultos, saída vazia, minutos não numéricos e estado desconhecido são recusados;
  - publicar, abrir, contar tentativas, arquivar, negar acesso e restaurar funcionam.
- Revisão visual: lista "Suas questões" (desktop claro e celular escuro, sem rolagem horizontal), editor com casos ocultos e janela "Validar e publicar".
- Não verificado: Supabase real e Judge0 real.

## Entrega 4 · fatia 4 / CC-25 (24/11/2026)

Revisão das conclusões pelo professor, retorno ao aluno e troca do código de convite.

- `npm run check`: TypeScript, **99 testes de unidade**, build e checagem do bundle. Novos:
  - demo:
    - revisar exige perspectiva de professor e conclusão;
    - aluno da turma fictícia é recusado;
    - "ajuste pedido" sem comentário e comentário com mais de 1000 caracteres são recusados;
    - a mesma evidência mantém a revisão, e evidência nova, "Desfazer" e reabrir a apagam;
    - trocar o convite nega a turma fictícia e o aluno, o código antigo deixa de entrar e o novo entra;
  - remoto: argumentos de `review_progress` (incluindo `clear` com comentário nulo) e de `rotate_invite`, conversão de `review` na atividade e recusa de estado ou comentário inválidos;
  - métricas: `reviewed` / `changesRequested` por aluno e os sufixos "· revisada" e "· ajuste pedido" no mapa;
  - turma fictícia: evidência em toda conclusão, um exemplo de cada revisão, revisão depois da conclusão e nunca no futuro.
- `npm run test:e2e`: **32 de 32** (16 cenários × desktop e celular). Três cenários novos:
  - **Ida e volta da revisão:** o aluno conclui; o professor abre "Ver detalhes de Alex", lê a evidência e pede ajuste com comentário; o mapa mostra "ajuste pedido"; o aluno vê "Retorno do professor" com o comentário; o aluno atualiza a evidência e o pedido some; o professor marca como revisada; o aluno vê "Seu professor revisou esta conclusão."
  - **Turma fictícia:** o detalhe de Elisa T. mostra o exemplo de ajuste pedido, o aviso de somente leitura e nenhum botão de revisão, sem rolagem horizontal.
  - **Troca do convite:** o botão não aparece na turma fictícia; depois de confirmar, o código muda; o código antigo é recusado na entrada e o novo funciona.
- `bash tests/test-db.sh` (PostgreSQL 18.1, Windows): passou com as verificações de revisão e convite:
  - sem conclusão não há revisão, e o ajuste exige comentário;
  - o aluno lê o retorno;
  - evidência nova zera, reabrir apaga e o dono pode desfazer;
  - aluno e outro professor recebem negação;
  - o código antigo falha e o novo funciona.
- Revisão visual do detalhe do aluno (desktop e celular escuros, celular claro, sem rolagem horizontal) e do retorno na tela do desafio. Ela encontrou e corrigiu três problemas:
  - campos de formulário ilegíveis no tema escuro (fundo branco com texto claro; o problema já existia em todos os formulários);
  - o comentário da revisão quebrava a linha antes dos dois-pontos;
  - "0 revisada(s)" virou "0 revisadas".
- Não verificado: Supabase real (migration `202611240003`, script de promoção) e Judge0 real.
