# Padrão de questão ClassCode

Cada questão deve ensinar algo identificável e permitir que o aluno tente antes de receber ajuda. Este é o padrão autoral adotado pelo projeto; não é uma especificação oficial do TLE Eliminators.

## Campos obrigatórios

1. **Título** claro, com até 100 caracteres.
2. **Turma e módulo**: quem recebe e onde a questão entra na trilha.
3. **Dificuldade**: básico, intermediário ou avançado; não é uma equivalência automática a rating Codeforces.
4. **Tempo sugerido**: 5–180 minutos; orientativo, sem bloquear a tentativa.
5. **Objetivo de aprendizagem**: uma habilidade observável.
6. **Enunciado**: contexto, tarefa e condições sem ambiguidades.
7. **Entrada e saída**: formato exato, tipos e separadores relevantes.
8. **Restrições**: limites suficientes para justificar a complexidade esperada.
9. **Exemplo de entrada e saída**: com interpretação durante a revisão de conteúdo.
10. **Três dicas progressivas**, com ordem e tempos definidos abaixo.

Questões externas também têm esse registro pedagógico, com URL e atribuição de origem. Os campos de I/O podem direcionar ao original quando o enunciado completo permanece no judge. Não copiar catálogo de terceiros sem permissão.

## Ajuda progressiva

| Liberação | Nível | Papel da dica |
| --- | --- | --- |
| 3 min | Direção | Pergunta ou observação sobre o problema; não entregar a implementação |
| 7 min | Estratégia | Estrutura/técnica, invariante ou redução relevante |
| 12 min | Pseudocódigo | Passos concretos e armadilhas, evitando simplesmente colar uma solução |

O relógio começa quando a tentativa é criada. Sair e voltar não reinicia; o tempo de parede continua. Na demonstração o relógio e as dicas são locais; na versão institucional, a autoridade é o banco e a dica bloqueada não deve sair do servidor.

As três linguagens têm o mesmo objetivo, entrada/saída e critérios de correção. Em uma integração com judge, validar limites por runtime e usar soluções de referência para cada linguagem. Não penalizar Java/Python por configuração de tempo baseada somente em C++.

## Exemplo autoral

**Título:** O primeiro de muitos. **Módulo:** Primeiros algoritmos. **Objetivo:** ler dois inteiros e produzir uma saída correta.

**Enunciado:** O laboratório recebeu duas caixas de componentes. Dados os números de componentes em cada caixa, calcule o total disponível.

**Entrada:** dois inteiros `a b`. **Saída:** `a + b`. **Restrições:** `0 ≤ a,b ≤ 10⁶`.

```text
Entrada: 12 8
Saída:   20
```

**Dica 1:** Quais informações entram e qual resultado deve sair?

**Dica 2:** Você precisa de uma única operação aritmética entre a e b.

**Dica 3:** Leia os dois inteiros, calcule a + b e imprima o resultado.

## Revisão antes de publicar

- Objetivo e dificuldade correspondem aos pré-requisitos?
- Exemplo e solução de referência concordam?
- Casos mínimos, limites, repetidos e ausência de resposta foram considerados quando aplicáveis?
- As dicas ajudam em estágios diferentes, sem contradições?
- A fonte está atribuída e o link abre o problema correto?
- Para judge interno: testes privados, comparador e complexidade esperada foram revisados por outra pessoa?

No backend inicial, a questão é criada como rascunho. Configurar as três dicas e só então publicar. Uma questão publicada não deve ter seu significado alterado sem considerar o progresso e as tentativas existentes; versionamento é uma evolução necessária.
