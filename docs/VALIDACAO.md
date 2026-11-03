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
