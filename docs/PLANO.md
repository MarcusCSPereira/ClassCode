# Plano de desenvolvimento até 15/11/2026

Data de partida: **02/11/2026**. Meta de planejamento: **15/11/2026**, adotada como referência para “meio de novembro”, sem depender de um número de integrantes.

## Resultado esperado para a apresentação

Um professor autenticado cria uma turma e uma questão. Um aluno em outro navegador entra pelo código, acessa a questão, recebe dicas no tempo correto, resolve no judge externo e registra evidência. A trilha recomenda automaticamente o próximo passo conforme o aluno conclui módulos e usa dicas. O professor vê métricas de uso da própria turma. Uma visualização permite explicar o algoritmo durante a apresentação.

**Escopo comprometido proposto:** autenticação, isolamento entre turmas, publicação padronizada, dicas pelo relógio do servidor, progresso persistente e judge externo. **Extensão condicionada:** execução interna com Judge0. As datas abaixo são metas, não confirmação de trabalho já concluído.

## Entregue na base inicial

- Design responsivo de aluno e professor, dashboard, currículo, desafios, laboratório e turmas.
- 12 tópicos mapeados; 7 desafios, sendo 4 autorais e 3 referências externas.
- Turmas, matrícula por código e criação de questões na demonstração local.
- Rascunhos em Python, Java e C++17; dicas em 3/7/12 min; registro autodeclarado.
- Busca binária e bubble sort interativos.
- Migração de banco com RLS, RPCs de turma/tentativa/dicas e testes SQL.
- Documentação, testes automatizados, CI e workflow de publicação.

## Cronograma por entrega

O detalhamento de 03/11 a 12/11, dividido nas frentes Plataforma e Pedagógica, está em [ENTREGA-2.md](ENTREGA-2.md#9-cronograma-da-entrega).

| Período | Entrega | Critério para avançar |
| --- | --- | --- |
| 02–03/11 | Base inicial, revisão dos fluxos e definição do recorte | Time roda o projeto e completa o roteiro de demonstração |
| 04–06/11 | Login, perfis, backend e turmas reais | Professor e aluno em dispositivos diferentes; usuário de outra turma recebe acesso negado |
| 07–09/11 | Publicação de questões e tentativas | Professor publica questão com três dicas; aluno só acessa questões publicadas da turma |
| 10–11/11 | Dicas no servidor, evidências e visão do professor | Alterar relógio local não libera dicas; progresso reaparece após login em outro dispositivo |
| 12/11 | Integração completa e decisão de escopo | Se o núcleo falhar, congelar extensões e corrigir o fluxo obrigatório |
| 13/11 | Usabilidade e acessibilidade | Um professor e alunos convidados completam o roteiro; bloqueios corrigidos |
| 14/11 | Congelamento, seed e ensaio | CI verde, backup, roteiro e dados de demonstração preparados |
| 15/11 | Apresentação | Demonstrar o fluxo completo e explicar claramente limites e próximos passos |

### Regra de corte

Até 09/11, se autenticação, matrícula e publicação ainda não estiverem integradas, **eliminar o Judge0 desta entrega**. Se o núcleo estiver pronto e houver capacidade disponível, experimentar uma questão autoral com uma linguagem; ampliar a três linguagens somente após testes de execução e limites. Não adiar o fluxo obrigatório para terminar o judge.

## Backlog executável

| ID | Prioridade | Entrega e critério de aceite | Dependências |
| --- | --- | --- | --- |
| CC-01 | P0 | Criar projeto Supabase de desenvolvimento, aplicar migration/seed, validar Auth real; nenhum segredo administrativo no bundle | Nenhuma |
| CC-02 | P0 | Login/logout com email e senha, recuperação, erros e sessão expirada; provisionar professor por operador, sem seletor público de papel | CC-01 |
| CC-03 | P0 | Adaptador de repositório e estado remoto; manter modo demo separado; mapear snake_case e UUIDs do banco para os tipos da UI | CC-02 |
| CC-04 | P0 | Criar turma, ler código do convite para o proprietário, entrar por código, tratar repetição/inválido; validar entre dois navegadores | CC-03 |
| CC-05 | P0 | Criar rascunho de questão, configurar três dicas via RPC, publicar depois de validar; editar e arquivar com confirmação | CC-04 |
| CC-06 | P0 | Iniciar tentativa de forma idempotente; buscar dicas por RPC; nenhum conteúdo de dica bloqueada no payload/JS de produção | CC-05 |
| CC-07 | P0 | Persistir evidência/reflexão autodeclarada; diferenciar pendência de revisão e Accepted; reabrir desafio | CC-06 |
| CC-08 | P0 | Relatório da turma com nomes, tentativas, conclusões declaradas e ajuda utilizada; RLS para leitura do proprietário; exportação CSV. **Desdobrado em CC-17, CC-18 e CC-19** | CC-07 |
| CC-09 | P0 | Testar dois professores, dois alunos e um intruso; testar REST direto, hints antes/depois e publicação incompleta no Supabase real | CC-04 a CC-08 |
| CC-10 | P0 | Homologar fluxo em celular/teclado, revisar contraste, erros, carregamento e estado vazio; apresentação reproduzível | CC-09 |
| CC-11 | P1 | Ampliar fundamentos com questões autorais revisadas e soluções de referência em três linguagens; conferir limites e exemplos | CC-05 |
| CC-12 | P1 | Associar visualização a um tópico/questão e permitir previsão/explicação do aluno; manter replay determinístico | CC-06 |
| CC-13 | P2 | Implementar gateway de submissão e worker Judge0 para uma questão e linguagem; idempotência, quotas e polling | CC-09 |
| CC-14 | P2 | Adicionar Python/Java/C++, casos privados e agregação de vereditos; testes de timeout, erro de compilação e memória | CC-13 |

Itens adicionados na Entrega 2. Regras, contratos e critérios completos em [ENTREGA-2.md](ENTREGA-2.md#8-backlog-da-entrega-2).

| ID | Prioridade | Entrega e critério de aceite | Dependências |
| --- | --- | --- | --- |
| CC-00 | P0 | Dividir `App.tsx` em páginas e criar a interface de repositório com `DemoRepository`, sem mudança visível. **Concluído em 02/11** | Nenhuma |
| CC-15 | P0 | Motor de progressão: autonomia, estados de módulo e próximo passo recomendado, com testes. **Concluído em 02/11** | Nenhuma |
| CC-16 | P0 | Trilha adaptativa na UI do aluno: estados, recomendação com motivo e meta derivada. **Concluído em 02/11 no modo demo** | CC-00, CC-15 |
| CC-17 | P0 | Cálculo das métricas e sinais de atenção, com testes. **Concluído em 02/11** | Nenhuma |
| CC-18 | P0 | RPCs `classroom_activity` e `my_activity` em migration nova, com testes de negação | CC-01 |
| CC-19 | P0 | Painel de métricas do professor com mapa aluno × questão e CSV. **Concluído em 02/11 no modo demo** | CC-00, CC-17, CC-18 |
| CC-20 | P0 | Trilha base no servidor e importação idempotente para a turma | CC-05 |
| CC-21 | P1 | Turma fictícia no modo demo para demonstrar o painel, identificada como tal | CC-19 |

P0 é o MVP; P1 melhora a experiência quando o fluxo estiver estável; P2 não bloqueia a apresentação. Cada integrante assume uma entrega ou grupo coerente conforme disponibilidade, sem pressupor uma equipe específica.

## Frentes e coordenação

| Frente | Responsabilidade | Interface com as demais |
| --- | --- | --- |
| Plataforma | Auth, migration, RLS, RPCs e persistência | Entregar contratos e ambiente de desenvolvimento antes da UI remota |
| Experiência do aluno | Trilha, questão, rascunhos, dicas e evidência | Consumir tentativa e hint por RPC, sem reproduzir autorização no cliente |
| Experiência do professor | Turmas, autoria e progresso | Publicar em etapas e consultar somente turmas próprias |
| Conteúdo e validação | Enunciados, dicas, soluções, cenários e ensaio | Revisar cada questão contra o padrão e os critérios de aceite |

Com poucos integrantes, trabalhar primeiro no fluxo vertical de uma turma e uma questão, depois ampliar. Evitar construir páginas isoladas que não conversem com o mesmo contrato.

## Fora do MVP

- Engine/sandbox própria, execução arbitrária no servidor web e correção por regex.
- Currículo avançado completo, 31 questões por rating e editor de grafo curricular.
- Ranking público, detecção de plágio, chat, IA tutora, videoconferência e gamificação extensa.
- SSO universitário, múltiplas instituições no mesmo banco e painel administrativo completo.
- Importação automática e scraping de submissões de terceiros.

A primeira implantação institucional é para uma instituição por projeto/deployment. Várias turmas e vários professores são previstos. Multi-instituição exige adicionar `institution_id`, vínculo institucional e políticas próprias.

## Critérios de conclusão do MVP

- [ ] Usuários reais separados; não depender de um seletor visual de papel.
- [ ] Professor A não lê/edita a turma B; aluno não altera vereditos ou seu papel.
- [ ] Matrícula por convite funciona em dispositivos separados.
- [ ] Questão publicada tem objetivo, I/O, restrições, exemplos e três dicas.
- [ ] Dicas bloqueadas não são enviadas ao navegador e usam tempo do servidor.
- [ ] Progresso e evidências persistem após logout/login.
- [ ] “Autodeclarado”, “revisado” e “Accepted” não são confundidos.
- [ ] Interface de professor mostra progresso apenas dos seus alunos.
- [ ] A trilha recomenda o próximo passo com motivo e se atualiza quando o aluno conclui um módulo.
- [ ] O professor vê métricas por aluno e por questão, com sinais de atenção, sem tratá-las como nota.
- [ ] Testes do backend real e do frontend passam.
- [ ] Roteiro da apresentação roda com dados preparados, sem credenciais no repositório.

## Riscos e resposta

| Risco | Resposta prática |
| --- | --- |
| Judge integrado consumir o prazo | Entregar judge externo com evidência; integrar o motor depois |
| UI pronta sem autorização real | Tornar o teste com usuário intruso condição de aceite de CC-04/09 |
| Conteúdo avançado superficial | Mapear o currículo e revisar profundamente o núcleo inicial |
| Divergência entre estado local e remoto | Usar adaptador com tipos e testes; não misturar os modos de dados |
| Dependência de rede na apresentação | Preparar dados e roteiro; ter vídeo/capturas e demo local como contingência, identificada como tal |
| Progresso autodeclarado virar nota automática | Exigir revisão do professor ou verificação pelo judge antes de avaliação formal |

## Roteiro da apresentação (6–8 minutos)

1. Problema pedagógico e trilha: do básico ao avançado (1 min).
2. Professor cria turma e publica questão com objetivo e dicas (2 min).
3. Aluno entra, escreve rascunho e consulta ajuda já liberada em uma tentativa preparada (2 min).
4. Visualização de busca binária com previsão do próximo passo (1 min).
5. Evidência e relatório do professor; o que já funciona e próxima extensão (1–2 min).

Não manipular relógio ou esconder limites durante a demonstração. Para apresentar dicas sem esperar 12 minutos, preparar uma tentativa antes ou usar um ambiente de teste explicitamente identificado.
