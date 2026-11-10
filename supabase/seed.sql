-- Curriculum only; real users and classroom content must be created through authenticated flows.
insert into public.modules(id,title,position,prerequisites) values
('foundations','Primeiros algoritmos',1,'{}'),
('loops','Laços & simulação',2,'{foundations}'),
('arrays','Vetores & strings',3,'{loops}'),
('complexity','Complexidade & ordenação',4,'{arrays}'),
('search','Busca binária',5,'{complexity}'),
('pointers','Dois ponteiros & prefixos',6,'{complexity}'),
('structures','Estruturas de dados',7,'{arrays}'),
('recursion','Recursão & backtracking',8,'{complexity}'),
('greedy','Algoritmos gulosos',9,'{pointers}'),
('graphs','Grafos & árvores',10,'{structures,recursion}'),
('dp','Programação dinâmica',11,'{recursion,greedy}'),
('advanced','Além do essencial',12,'{graphs,dp}')
on conflict(id) do nothing;

-- Private templates used by import_base_trail(); hint text is never exposed by list_problems().
insert into private.base_problem_templates(
  key,module_id,title,difficulty,minutes,objective,statement,input_spec,output_spec,
  constraints_spec,example_input,example_output,external_url,hints
) values
('sum','foundations','O primeiro de muitos','basic',10,
 'Ler dois inteiros e produzir uma saída correta.',
 'O laboratório recebeu duas caixas de componentes. Dados os números de componentes em cada caixa, calcule o total disponível.',
 'Uma linha com dois inteiros a e b, separados por espaço.','Um inteiro: o total de componentes.','0 ≤ a, b ≤ 10⁶','12 8','20',null,
 array['Quais informações entram e qual resultado deve sair?','Você precisa de uma única operação aritmética entre a e b.','Leia os dois inteiros, calcule a + b e imprima o resultado.']),
('parity','foundations','Par ou ímpar?','basic',10,
 'Usar o operador de resto e uma condição.','Dado um número inteiro n, determine se ele é par ou ímpar. Imprima PAR ou IMPAR, sem acento.',
 'Um inteiro n.','PAR se n for par; IMPAR caso contrário.','0 ≤ n ≤ 10⁹','7','IMPAR',null,
 array['Como reconhecer um múltiplo de dois?','Observe o resto da divisão de n por 2.','Se n % 2 == 0, imprima PAR; senão, IMPAR.']),
('maximum','foundations','Quem é o maior?','basic',15,
 'Comparar valores e manter uma resposta parcial.','Três equipes resolveram a, b e c questões. Informe a maior quantidade de questões resolvidas entre as equipes.',
 'Uma linha com os inteiros a, b e c.','O maior dos três valores.','0 ≤ a, b, c ≤ 1000','4 9 6','9',null,
 array['Comece supondo que o primeiro valor é o maior.','Compare sua resposta parcial com cada um dos outros valores.','Atualize o maior quando encontrar um valor maior; ao final, imprima-o.']),
('weird','loops','Uma sequência curiosa','basic',20,
 'Simular uma sequência com repetição e condições.','Pratique simulação com o problema Weird Algorithm do CSES. O enunciado e a avaliação estão disponíveis no judge de origem.',
 'Consulte o enunciado original no CSES.','Consulte o enunciado original no CSES.','Consulte os limites no judge de origem.','3','3 10 5 16 8 4 2 1','https://cses.fi/problemset/task/1068',
 array['Em cada passo, a próxima operação depende da paridade do valor atual.','Repita o processo até chegar a 1; inclua o valor inicial na saída.','Para n par, divida por 2. Para n ímpar, use 3n + 1. Use inteiros de 64 bits.']),
('missing','arrays','O número que falta','basic',20,
 'Raciocinar sobre uma sequência de inteiros.','Pratique sequências com Missing Number do CSES. Consulte o enunciado e envie sua solução no judge de origem.',
 'Consulte o enunciado original no CSES.','Consulte o enunciado original no CSES.','Consulte os limites no judge de origem.',E'5\n2 3 1 5','4','https://cses.fi/problemset/task/1083',
 array['Compare os números presentes com os números esperados.','A soma dos inteiros de 1 até n pode ser calculada sem percorrer a sequência.','Calcule n(n + 1)/2 e subtraia a soma dos valores recebidos. Use 64 bits.']),
('distinct','complexity','Quantos são diferentes?','intermediate',25,
 'Relacionar ordenação e contagem de elementos distintos.','Explore o problema Distinct Numbers no CSES e compare uma solução com ordenação a uma solução com conjunto.',
 'Consulte o enunciado original no CSES.','Consulte o enunciado original no CSES.','Consulte os limites no judge de origem.',E'5\n2 3 2 2 3','2','https://cses.fi/problemset/task/1621',
 array['Valores iguais ficam próximos depois de ordenar.','Conte o primeiro valor e cada mudança de valor entre posições consecutivas.','Ordene em O(n log n) e percorra contando mudanças; alternativamente, use um conjunto.']),
('binary','search','Encontre o alvo','intermediate',25,
 'Implementar busca binária e entender seu invariante.','Dado um vetor ordenado de n inteiros distintos e um alvo x, imprima o índice do alvo, começando em zero. Se ele não existir, imprima -1.',
 'n e x na primeira linha. Na segunda, n inteiros ordenados.','O índice de x ou -1.','1 ≤ n ≤ 2 × 10⁵; |valores|, |x| ≤ 10⁹',E'7 13\n2 5 8 13 19 24 31','3',null,
 array['O que a ordenação permite descartar após uma comparação?','Mantenha os limites esquerdo e direito. Compare x com o valor central.','Enquanto l ≤ r, use m = l + (r-l)/2. Ajuste l = m+1 ou r = m-1; retorne m se encontrar x.'])
on conflict(key) do update set
  module_id=excluded.module_id,title=excluded.title,difficulty=excluded.difficulty,minutes=excluded.minutes,
  objective=excluded.objective,statement=excluded.statement,input_spec=excluded.input_spec,
  output_spec=excluded.output_spec,constraints_spec=excluded.constraints_spec,
  example_input=excluded.example_input,example_output=excluded.example_output,
  external_url=excluded.external_url,hints=excluded.hints;
