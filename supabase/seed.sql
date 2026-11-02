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
