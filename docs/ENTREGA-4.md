# Entrega 4: fluxo do professor de ponta a ponta

Branch: `feat/entrega-4-professor` · Análise e plano em 24/11/2026 · Responsável pela sessão: Franco Borba (com Claude Code).

Parte da `main` no commit `db61880`: Entregas 2 e 3, modo remoto com Supabase (PR #3) e Judge0 (16/11). O objetivo é que um professor consiga, sem truques, criar turma e questões confiáveis, acompanhar os alunos e intervir. O que cada fatia entregou fica em [PASSAGEM.md](PASSAGEM.md).

## 1. Situação encontrada

- Tipos, 79 testes de unidade, build e 22 E2E passavam; a suíte de banco passava em PostgreSQL 18 local.
- O modo remoto está completo no código, mas **nunca rodou num projeto Supabase real** (passagem de 10/11).
- O Judge0 entrou direto na `main`, sem entrada no registro de passagem e sem atualizar README/ARQUITETURA.

## 2. Diagnóstico

| #   | Problema                                                                                                                                                                                                           | Evidência                                                                                                    | Situação                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| 1   | "Executar código" quebrava fora do `npm run dev`: a rota `/api/judge/submit` só existia no servidor do Vite. No GitHub Pages o pedido ia para `marcuscspereira.github.io/api/judge/submit` (fora de `/ClassCode/`) | Testado no site publicado: "Falha ao submeter código (HTTP 405)"; em outras hospedagens ou consultas, 404    | **Corrigido na fatia 1**                               |
| 2   | A Edge Function existia, mas o site nunca a chamava; ela não exigia login e importava arquivos de fora de `supabase/functions`                                                                                     | Leitura do código                                                                                            | **Corrigido na fatia 1**                               |
| 3   | No modo remoto, questões da trilha eram reconhecidas pelo **título**; questões do professor tinham só o exemplo como caso                                                                                          | Leitura do código                                                                                            | **Corrigido na fatia 1** (casos no banco por questão)  |
| 4   | Os casos ocultos moravam num módulo importado pela tela                                                                                                                                                            | No build publicado o minificador os removia, então não vazavam; um único uso na tela os levaria ao navegador | **Corrigido na fatia 1** + checagem no `npm run check` |
| 5   | O resultado do judge não é salvo: "Aceito" não conclui nem chega ao professor                                                                                                                                      | Leitura do código                                                                                            | Fatia 2 (fora do escopo desta rodada)                  |
| 6   | O modo remoto daria 404 se faltasse aplicar uma migration (o Supabase responde "Could not find the function")                                                                                                      | As 13 RPCs batem com o banco em nome e argumentos; não há projeto para conferir                              | Homologação pendente (CC-09)                           |
| 7   | Questão publicada na hora, sem rascunho, edição ou arquivamento                                                                                                                                                    | Leitura do código                                                                                            | Fatia 3                                                |
| 8   | O professor não vê a evidência do aluno nem pode revisar; convite não pode ser trocado; promoção de professor só por SQL solto                                                                                     | Leitura do código                                                                                            | Fatia 4                                                |

## 3. O que já existia para o professor

| Etapa                                                    | Antes desta entrega                                              |
| -------------------------------------------------------- | ---------------------------------------------------------------- |
| Entrar com conta                                         | Funciona no remoto; papel de professor só por SQL                |
| Criar turma, importar a trilha e receber o código        | Pronto (falta homologar no Supabase real)                        |
| Criar questão com 3 dicas                                | Parcial: publica direto, sem rascunho, edição nem casos de teste |
| Aluno praticar com dicas pelo servidor                   | Pronto (falta homologar)                                         |
| Executar código                                          | Só no `npm run dev`                                              |
| Acompanhar a turma (métricas, sinais, mapa, CSV)         | Pronto                                                           |
| Ver evidência e revisar; editar/arquivar; trocar convite | Faltava                                                          |

## 4. Fluxo de ponta a ponta do professor

0. **Preparação (operador, uma vez):** projeto Supabase, migrations e seed, deploy da função `judge-submit` com os segredos do Judge0, `.env.local` e promoção da conta do professor.
1. **Entrar** e cair no painel.
2. **Criar a turma**, com a trilha-base (7 questões já com casos de teste), e receber o código de convite.
3. **Criar uma questão** no padrão: enunciado, 3 dicas e casos de teste (exemplo público + ocultos). Ela nasce como **rascunho**.
4. **Validar** rodando a própria solução de referência no Judge0 contra os casos do rascunho.
5. **Publicar** e compartilhar o código. O aluno entra, pratica com dicas liberadas pelo servidor e executa o código.
6. **Acompanhar** pelo painel: sinais de atenção, questões que mais exigiram ajuda e mapa aluno × questão.
7. **Intervir:** abrir o aluno, ler a evidência e marcar como revisado ou pedir ajuste com um comentário, que o aluno vê.
8. **Manter:** editar ou arquivar questões, trocar o código de convite, exportar o CSV.

Passos 0–2 e 5–6 já existiam (falta homologar). Esta entrega cobre 3, 4, 7 e 8 e deixa a execução de código confiável. O registro do veredito (conclusão "verificada pelo judge") é a fatia 2.

## 5. Fatias

| Fatia | Item  | Escopo                                                                                                                                                                                                                                                                                            | Situação                                         |
| ----- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 1     | CC-22 | Endereço do judge configurável, botão desabilitado com explicação quando não há judge, casos de teste no banco lidos só pela função (dono ou aluno matriculado), executor e tratamento compartilhados entre servidor local e função, checagem de casos ocultos no bundle, `test-db.sh` no Windows | **Concluída em 24/11**                           |
| 2     | CC-23 | Função exige limite de frequência; tabela de submissões; "Aceito" vira conclusão verificada no painel e no CSV                                                                                                                                                                                    | **Fora desta rodada** (precisa de Supabase real) |
| 3     | CC-24 | Rascunho → validar com solução de referência → publicar; editar e arquivar; casos ocultos no editor                                                                                                                                                                                               | Pendente                                         |
| 4     | CC-25 | Detalhe do aluno com evidência; revisar ou pedir ajuste com comentário visível ao aluno; trocar código de convite; script de promoção de professor                                                                                                                                                | Pendente                                         |

### Critérios de aceite

- **Fatia 1:** no site estático, o botão aparece desabilitado com explicação (nunca 404/405); no `npm run dev`, o envio não leva casos nem saídas esperadas das questões do catálogo; erros HTTP viram mensagens claras; `judge_cases` nega aluno de outra turma, outro professor, requisitante anônimo e aluno em rascunho; o seed e o arquivo da demo têm os mesmos 31 casos; `npm run check` falha se um caso oculto entrar no bundle.
- **Fatia 3:** questão nova nasce como rascunho e só aparece para alunos depois de publicada; o professor roda a solução de referência no rascunho; editar mantém o vínculo com as tentativas; questão arquivada some para os alunos e pode ser restaurada; regras iguais no demo e no remoto, com testes SQL de negação.
- **Fatia 4:** o professor lê a evidência e marca "revisado" ou "ajuste pedido" com comentário; o aluno vê o retorno na tela do desafio; nova evidência do aluno zera a revisão; trocar o convite invalida o código antigo; nada disso é possível para outro professor ou aluno (testes SQL).

## 6. Decisões pendentes do time

| #   | Decisão                                                                         | Por que importa                                             |
| --- | ------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| E1  | Quem cria o projeto Supabase de desenvolvimento                                 | Sem ele, nada do remoto é homologado e a fatia 2 não começa |
| E2  | Qual Judge0: público (`ce.judge0.com`), RapidAPI com chave ou instância própria | Limites, disponibilidade e custo na apresentação            |
| E3  | Novo prazo                                                                      | O [PLANO.md](PLANO.md) ainda aponta 15/11                   |
