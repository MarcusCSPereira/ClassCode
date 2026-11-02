# Pesquisa e decisões de produto

Consulta: **02/11/2026**. Fontes primárias; propostas do ClassCode são decisões de projeto, não funcionalidades atribuídas às referências.

## Referências

| Referência | O que aproveitamos | Adaptação para a disciplina |
| --- | --- | --- |
| [TLE Eliminators CP-31](https://www.tle-eliminators.com/cp-sheet) e [anúncio no Codeforces](https://codeforces.com/blog/entry/139079) | Curadoria e progressão por dificuldade; o anúncio descreve faixas de rating 800–1900 | Começar antes da competição: entrada/saída, condições e laços; progressão por objetivo pedagógico, sem impor 31 questões por faixa no MVP |
| [NeetCode Roadmap](https://neetcode.io/roadmap) | Organização de estruturas e algoritmos em tópicos e pré-requisitos | Trilha em português, visível ao aluno e editável pelo professor em uma etapa futura |
| [VisuAlgo](https://visualgo.net/en) | Observar estruturas e algoritmos em animação | Duas visualizações próprias com comparação, pausa, avanço, índices e pseudocódigo; sem incorporar ou copiar o software do VisuAlgo |
| [CSES Problem Set](https://cses.fi/problemset/) | Catálogo com problemas introdutórios, busca, programação dinâmica e grafos | Links para o original e dicas próprias. Não dependemos de scraping nem de importar enunciados completos |
| [Judge0 CE](https://ce.judge0.com/) e [repositório oficial](https://github.com/judge0/judge0) | API de execução isolada, linguagens, limites e resultados assíncronos | Motor de execução futuro; o ClassCode continua responsável por casos de teste, autorização, fila, agregação de vereditos e feedback |
| [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) | Políticas no PostgreSQL associadas ao usuário autenticado | Separar proprietário da turma, matrícula e autoria; proteger dados mesmo quando o cliente é manipulado |

Não assumimos que CP-31 define um formulário universal de questão ou a mesma política de dicas. O padrão de enunciado, os três níveis de ajuda e os tempos 3/7/12 são uma **proposta pedagógica própria**, inspirada no pedido.

## Judge: três caminhos

| Caminho | Benefício | Trabalho e limite | Decisão |
| --- | --- | --- | --- |
| Judge externo (CSES, Codeforces, beecrowd etc.) | Avaliação existente, sem manter sandbox | Aluno usa outra conta; sem integração verificável, conclusão é autodeclarada ou revisada pelo professor | MVP recomendado para 15/11 |
| Judge0 por API | Experiência dentro da plataforma; suporta múltiplas linguagens e limites | Exige servidor intermediário, casos privados, fila, quotas, monitoramento e validação dos runtimes da instância | Primeira extensão, se o núcleo estiver concluído |
| Sandbox/compilador construído do zero | Controle total | Alto esforço de segurança, operação e execução multilíngue; ocupa o prazo da experiência educativa | Fora do MVP |

O Judge0 é um motor de execução, não todo o judge educacional. Seu uso não elimina a necessidade de limitar submissões e proteger os testes. Os IDs de linguagens dependem da instância e devem ser descobertos em `/languages`; não são fixados na interface.

## Hipóteses pedagógicas a validar

1. Alunos iniciantes precisam de pequenos passos antes de listas de competição.
2. Dicas progressivas podem ajudar a recuperar o raciocínio sem revelar a solução imediatamente.
3. Prever o próximo passo antes de avançar uma visualização favorece discussão do algoritmo.
4. Professores precisam enxergar dúvidas e tentativas, além da quantidade de acertos.

Essas hipóteses não são resultados comprovados desta entrega. Testar com alunos e um professor, observando navegação, compreensão das dicas e explicação de uma busca binária.

## Viabilidade

O prazo permite um recorte vertical: **professor cria turma → publica uma questão padronizada → aluno entra → pratica → recebe dicas → registra evidência → professor acompanha**. A trilha avançada pode ficar mapeada sem ter dezenas de exercícios prontos. Um judge próprio, currículo avançado completo e autorização institucional pronta não cabem como premissas simultâneas de um MVP de duas semanas.

Não há contratação ou consumo de API nesta entrega. Custos do backend e da execução precisam ser medidos segundo usuários, retenção e volume de submissões; não prometemos que uma camada gratuita suporte uso institucional.
