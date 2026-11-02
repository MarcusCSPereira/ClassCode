# Design inicial

Direção: um ambiente de aprendizagem calmo e universitário, com verde profundo, papel claro, tons de sálvia e ilustrações geométricas de código. A linguagem incentiva tentativa e compreensão, sem transformar a disciplina em um ranking competitivo.

## Telas entregues

| Tela/fluxo | Função |
| --- | --- |
| Visão geral | Próximo desafio, progresso, etapas iniciais e acesso às turmas |
| Minha trilha | 12 etapas, filtro por nível, pré-requisitos sugeridos e desafios por tópico |
| Desafios | Busca por título/tópico, dificuldade, duração e estado de conclusão |
| Espaço de prática | Objetivo, enunciado, entrada/saída, restrições, exemplos, dicas e rascunho |
| Laboratório visual | Busca binária e bubble sort, passo anterior/próximo, reprodução, velocidade e pseudocódigo |
| Minhas turmas | Nome, professor, semestre, código e desafios associados |
| Perfil demonstrativo | Nome e escolha explícita da perspectiva de aluno/professor |
| Painel do professor | Criação de turmas/questões, números locais e exportação JSON |
| Nova questão | Formulário completo no padrão pedagógico |
| Registro de conclusão | Reflexão ou evidência e declaração explícita de validação |

![Dashboard](images/dashboard.jpg)
![Espaço de prática](images/desafio.jpg)
![Laboratório visual](images/laboratorio.jpg)
![Painel do professor](images/professor.jpg)

## Tokens e componentes

| Token | Valor/base | Aplicação |
| --- | --- | --- |
| Verde profundo | `#183d2e` | Títulos e identidade |
| Verde de ação | `#295b43` | Ações principais |
| Fundo | `#f8f9f5` | Área de estudo |
| Superfície | `#fdfefa` | Cartões e formulários |
| Sálvia | `#e8f1df` | Destaques pedagógicos |
| Texto secundário | `#66745c` / `#667461` | Descrições e ajuda |
| Borda | `#e5e9e1` | Divisões leves |
| Tipografia | Manrope + DM Sans | Títulos e texto; fallbacks de sistema |
| Código | SFMono / Consolas / Liberation Mono | Editor e pseudocódigo |

Componentes reutilizáveis: botão primário/secundário/texto, card de tópico, linha de desafio, badge, barra/anel de progresso, modal nativo, formulário e player de algoritmos. Ícones Lucide. A ilustração do hero usa CSS, sem dependência de imagem externa ou geração de marca.

As fontes são carregadas do Google Fonts; os fallbacks mantêm a aplicação utilizável sem esse serviço. Para implantação institucional com restrição de rede, hospedar os arquivos das fontes conforme suas licenças.

## Responsividade e acessibilidade

- Sidebar fixa em desktop; menu lateral acionável em celular.
- Cards e workspace passam a uma coluna conforme a largura.
- Formulários usam labels e campos nativos; modal usa `dialog` e devolve o foco ao controle de abertura.
- Controles de animação têm rótulos; alterações de frame usam `aria-live`.
- Progresso também aparece em texto; status não depende somente de cor.
- Foco visível e suporte a `prefers-reduced-motion`.
- Em modo institucional, revisar com auditoria automatizada e teclado antes de declarar conformidade WCAG; esta entrega não reivindica certificação.

## Estados e contratos visuais

- Tópico sem questões: “Em preparação”, com currículo e pré-requisitos disponíveis.
- Dica bloqueada: tempo restante e botão desabilitado.
- Busca sem resultado: estado vazio com orientação.
- Código de turma inválido: validação no campo.
- Armazenamento indisponível: aviso de que os dados duram somente na sessão.
- Conclusão: explicitamente autodeclarada; sem mensagem de Accepted.
- Interface institucional futura: adicionar carregamento, indisponibilidade, erro de autorização e sessão expirada ao conectar o backend.
