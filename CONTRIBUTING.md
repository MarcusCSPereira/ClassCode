# Como contribuir

Leia [o plano](docs/PLANO.md), [a entrega atual](docs/ENTREGA-2.md), [a arquitetura](docs/ARQUITETURA.md) e [o padrão de questão](docs/PADRAO-QUESTAO.md). Antes de começar, leia a entrada mais recente do [registro de passagem](docs/PASSAGEM.md). Escolha uma entrega com critério de aceite e registre a decisão na issue antes de ampliar o escopo.

## Fluxo

1. Atualize `main` e crie uma branch, por exemplo `feat/cc-04-turmas-remotas`.
2. Implemente uma entrega pequena e revisável. Evite mudar o contrato de dados em paralelo sem alinhar a migration e os consumidores.
3. Rode `npm run check`; valide os fluxos afetados e o backend quando houver alteração de autorização.
4. Abra PR com resultado, validação e captura de tela para mudanças visuais.
5. Atualize documentação e critérios de aceite. O CI deve passar antes do merge.
6. Adicione uma entrada no topo de [docs/PASSAGEM.md](docs/PASSAGEM.md) seguindo o modelo: o que foi feito, o que foi verificado, o que ficou de fora e o **próximo passo esperado** para quem continuar.

```bash
npm ci
npm run dev
npm run check
npx playwright install chromium
npm run test:e2e
```

O CI roda E2E em desktop e celular. O banco é testado em PostgreSQL 16 com Auth emulado; o fluxo autenticado real precisa ser homologado no ambiente Supabase de desenvolvimento.

## Regras de implementação

- TypeScript estrito; componentes acessíveis e texto em português.
- Separe dados demonstrativos de dados institucionais. A escolha de perfil da demo nunca deve virar autorização.
- Toda tabela exposta precisa de grants e RLS; teste permitir e negar acesso, inclusive por API direta.
- Não coloque segredos em `VITE_*`, commits, fixtures ou logs.
- Nunca execute código de alunos no frontend ou processo web. Use gateway e sandbox apropriados.
- Dicas reais são liberadas pelo servidor. O catálogo público da demo não pode conter o material protegido da produção.
- Progresso autodeclarado, revisão docente e resultado verificado são categorias diferentes.
- Conteúdo externo é referenciado com origem; código e questões próprias usam a licença do projeto.
- Use o formatter do projeto (`npx prettier --write ...`) e mantenha mudanças focadas.

## Para adicionar conteúdo

Edite o catálogo da demonstração em `src/lib/catalog.ts` e siga o padrão. Para produção, crie conteúdo pelo fluxo autenticado do professor. Cada questão precisa de revisão de exemplos, limites e dicas; mudanças em regras ou geradores de frames devem ter um teste de comportamento correspondente.

## Dados de demonstração

Não publicar nomes, emails, submissões ou dados reais de alunos em issues, capturas, seeds ou relatórios de testes. Os exemplos desta base são fictícios. Conteúdo criado localmente pode ser exportado pelo painel do professor, mas ainda precisa de revisão e adaptação para persistir no backend.
