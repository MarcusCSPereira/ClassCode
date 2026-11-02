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
