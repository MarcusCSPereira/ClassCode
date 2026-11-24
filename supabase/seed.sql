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

-- Judge cases of the base trail templates. Ordinal 1 is the public example; the others are
-- hidden. Keep in sync with src/server/demoJudgeCases.ts (a unit test compares both).
insert into private.base_problem_template_tests(template_key,ordinal,stdin,expected_output,is_example) values
('sum',1,E'12 8\n',E'20\n',true),
('sum',2,E'0 0\n',E'0\n',false),
('sum',3,E'1000000 1000000\n',E'2000000\n',false),
('sum',4,E'42 58\n',E'100\n',false),
('parity',1,E'7\n',E'IMPAR\n',true),
('parity',2,E'0\n',E'PAR\n',false),
('parity',3,E'2\n',E'PAR\n',false),
('parity',4,E'1000000000\n',E'PAR\n',false),
('parity',5,E'999999999\n',E'IMPAR\n',false),
('maximum',1,E'4 9 6\n',E'9\n',true),
('maximum',2,E'10 2 5\n',E'10\n',false),
('maximum',3,E'1 2 3\n',E'3\n',false),
('maximum',4,E'0 0 0\n',E'0\n',false),
('maximum',5,E'1000 999 1000\n',E'1000\n',false),
('weird',1,E'3\n',E'3 10 5 16 8 4 2 1\n',true),
('weird',2,E'1\n',E'1\n',false),
('weird',3,E'6\n',E'6 3 10 5 16 8 4 2 1\n',false),
('weird',4,E'7\n',E'7 22 11 34 17 52 26 13 40 20 10 5 16 8 4 2 1\n',false),
('missing',1,E'5\n2 3 1 5\n',E'4\n',true),
('missing',2,E'2\n1\n',E'2\n',false),
('missing',3,E'2\n2\n',E'1\n',false),
('missing',4,E'6\n1 2 3 4 5\n',E'6\n',false),
('distinct',1,E'5\n2 3 2 2 3\n',E'2\n',true),
('distinct',2,E'1\n42\n',E'1\n',false),
('distinct',3,E'4\n10 10 10 10\n',E'1\n',false),
('distinct',4,E'6\n1 2 3 4 5 6\n',E'6\n',false),
('binary',1,E'7 13\n2 5 8 13 19 24 31\n',E'3\n',true),
('binary',2,E'7 2\n2 5 8 13 19 24 31\n',E'0\n',false),
('binary',3,E'7 31\n2 5 8 13 19 24 31\n',E'6\n',false),
('binary',4,E'7 10\n2 5 8 13 19 24 31\n',E'-1\n',false),
('binary',5,E'1 5\n5\n',E'0\n',false)
on conflict(template_key,ordinal) do update set
  stdin=excluded.stdin,expected_output=excluded.expected_output,is_example=excluded.is_example;

-- Trails imported before the judge cases existed receive them too. Safe to run again.
insert into private.problem_tests(problem_id,ordinal,stdin,expected_output,is_example)
select i.problem_id,t.ordinal,t.stdin,t.expected_output,t.is_example
  from private.classroom_base_imports i
  join private.base_problem_template_tests t on t.template_key = i.template_key
on conflict (problem_id,ordinal) do nothing;
