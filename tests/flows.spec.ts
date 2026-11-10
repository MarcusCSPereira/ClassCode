import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
async function nav(page: Page, name: string | RegExp) {
  const menu = page.getByRole('button', { name: 'Abrir navegação' });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('button', { name, exact: true }).click();
}
test('aluno salva rascunhos por linguagem e declara conclusão com reflexão', async ({ page }) => {
  await page.goto('/#problem/sum');
  await expect(page.getByRole('heading', { name: 'O primeiro de muitos' })).toBeVisible();
  const code = page.getByLabel('Editor de código');
  await code.fill('print(sum(map(int, input().split())))');
  await page.getByLabel('Linguagem', { exact: true }).selectOption('java');
  await expect(code).toContainText(/public class Main/);
  await page.getByLabel('Linguagem', { exact: true }).selectOption('python');
  await expect(code).toContainText('print(sum(map(int, input().split())))');
  await page.reload();
  await expect(code).toContainText('print(sum(map(int, input().split())))');
  await page.getByRole('button', { name: 'Dicas progressivas' }).click();
  await expect(page.getByRole('button', { name: 'Libera após 3 min' })).toBeDisabled();
  await page.getByRole('button', { name: 'Registrar conclusão', exact: true }).click();
  await page
    .getByLabel('Link da submissão ou reflexão sobre a solução')
    .fill('Li os dois números e somei. Testei também o caso 0 0.');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Salvar conclusão declarada' }).click();
  await expect(
    page.getByRole('button', { name: 'Conclusão declarada · ver registro' }),
  ).toBeVisible();
});
test('professor cria turma e questão no padrão e aluno entra pelo código', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Alterar perfil da demonstração' }).click();
  await page.getByLabel('Como podemos chamar você?').fill('Prof. Ana');
  await page.getByRole('combobox', { name: 'Perspectiva', exact: true }).selectOption('teacher');
  await page.getByRole('button', { name: 'Acessar demonstração' }).click();
  await page.getByRole('button', { name: 'Criar uma turma', exact: false }).click();
  await page.getByLabel('Nome da turma').fill('Algoritmos · Turma B');
  await page.getByRole('button', { name: 'Criar turma', exact: true }).last().click();
  const card = page.locator('.classroom-card').filter({ hasText: 'Algoritmos · Turma B' });
  const inviteCode = await card.locator('.class-code strong').innerText();
  await nav(page, 'Painel do professor');
  await page.getByRole('button', { name: 'Criar desafio', exact: true }).click();
  await page.getByLabel('Título', { exact: true }).fill('Soma da turma B');
  await page
    .getByRole('combobox', { name: 'Turma', exact: true })
    .selectOption({ label: 'Algoritmos · Turma B' });
  for (const label of [
    'Objetivo de aprendizagem',
    'Enunciado',
    'Entrada',
    'Saída',
    'Restrições',
    'Exemplo de entrada',
    'Exemplo de saída',
  ])
    await page.getByLabel(label, { exact: true }).fill('Conteúdo de teste');
  for (const text of ['Dica 1:', 'Dica 2:', 'Dica 3:'])
    await page.getByLabel(text, { exact: false }).fill('Pense em somar os valores.');
  await page.getByRole('button', { name: 'Publicar desafio na demonstração' }).click();
  await expect(page.getByRole('button', { name: /Soma da turma B/ })).toBeVisible();
  await page.getByRole('button', { name: /Soma da turma B/ }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Soma da turma B', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Alterar perfil da demonstração' }).click();
  await page.getByRole('combobox', { name: 'Perspectiva', exact: true }).selectOption('student');
  await page.getByRole('button', { name: 'Acessar demonstração' }).click();
  await nav(page, /^Desafios/);
  await expect(page.getByRole('button', { name: /Soma da turma B/ })).toHaveCount(0);
  await nav(page, 'Minhas turmas');
  await page.getByRole('button', { name: 'Entrar em uma turma', exact: true }).click();
  await page.getByLabel('Código da turma', { exact: true }).fill(inviteCode.toLowerCase());
  await page.getByRole('button', { name: 'Entrar na turma', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Algoritmos · Turma B' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Soma da turma B', exact: true })).toBeVisible();
});
test('laboratório mostra os passos e páginas cabem na tela', async ({ page }) => {
  await page.goto('/');
  await nav(page, 'Laboratório visual');
  await page.getByRole('button', { name: 'Próximo passo', exact: true }).click();
  await expect(
    page.getByText('Intervalo [0, 6]. Meio = 3; valor = 13.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Bubble sort', exact: true }).click();
  await page.getByRole('button', { name: 'Próximo passo', exact: true }).click();
  await expect(page.getByText('Compare 24 e 8.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
test('laboratório associado preserva previsão e explicação ao navegar', async ({ page }) => {
  await page.goto('/#problem/binary');
  await expect(page.getByRole('heading', { name: 'Encontre o alvo' })).toBeVisible();
  await page.getByRole('button', { name: 'Abrir laboratório visual' }).click();
  await expect(page.getByText('Desafio: Encontre o alvo', { exact: true })).toBeVisible();
  await page.getByLabel(/Previsão do passo/).fill('O meio será comparado com o alvo.');
  await page.getByLabel(/Explicação do quadro/).fill('O intervalo ainda contém todos os valores.');
  await nav(page, /^Desafios/);
  await nav(page, 'Laboratório visual');
  await expect(page.getByLabel(/Previsão do passo/)).toHaveValue(
    'O meio será comparado com o alvo.',
  );
  await expect(page.getByLabel(/Explicação do quadro/)).toHaveValue(
    'O intervalo ainda contém todos os valores.',
  );
  await page.reload();
  await expect(page.getByLabel(/Previsão do passo/)).toHaveValue(
    'O meio será comparado com o alvo.',
  );
});
test('dica libera por tempo decorrido e permanece ao recarregar', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-02T15:00:00Z') });
  await page.goto('/');
  await page.getByRole('button', { name: 'Começar minha jornada' }).click();
  await page.getByRole('button', { name: 'Dicas progressivas' }).click();
  await expect(page.getByRole('button', { name: 'Libera após 3 min' })).toBeDisabled();
  await page.clock.fastForward(181000);
  await page.getByRole('button', { name: 'Revelar dica', exact: true }).click();
  await expect(
    page.getByText('Quais informações entram e qual resultado deve sair?', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Dicas progressivas' }).click();
  await expect(
    page.getByText('Quais informações entram e qual resultado deve sair?', { exact: true }),
  ).toBeVisible();
});

test('tema persiste e as três linguagens destacam tokens sem perder rascunhos', async ({
  page,
}) => {
  await page.goto('/#problem/sum');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const snippets = {
    python: 'def soma(a, b):\n    texto = "Olá"\n    return 42',
    java: 'public class Main {\n  public static void main(String[] args) {\n    String texto = "Olá";\n    int n = 42;\n  }\n}',
    cpp: '#include <iostream>\nint main() {\n  std::cout << "Olá";\n  return 42;\n}',
  };
  for (const [language, snippet] of Object.entries(snippets)) {
    await page.getByLabel('Linguagem', { exact: true }).selectOption(language);
    await page.getByLabel('Editor de código').fill(snippet);
    await expect(page.locator('.code-editor .tok-keyword').first()).toBeVisible();
    await expect(page.locator('.code-editor .tok-string').first()).toBeVisible();
    await expect(page.locator('.code-editor .tok-number').first()).toBeVisible();
  }
  await page.getByRole('button', { name: 'Ativar modo claro', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByLabel('Editor de código')).toContainText('return 42;');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByLabel('Linguagem', { exact: true }).selectOption('cpp');
  await expect(page.getByLabel('Editor de código')).toContainText('return 42;');
  await page.getByRole('button', { name: 'Ativar modo escuro', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('dados salvos pela primeira versão da demo continuam disponíveis', async ({ page }) => {
  await page.addInitScript(() => {
    const started = Date.now() - 3_600_000;
    localStorage.setItem(
      'classcode.demo.v1',
      JSON.stringify({
        version: 1,
        role: 'student',
        name: 'Bia',
        joinedClassIds: ['demo-class'],
        classes: [
          {
            id: 'demo-class',
            name: 'Algoritmos e programação I',
            code: 'CLASS26',
            teacher: 'Prof. Marina',
            term: '2026.2',
          },
        ],
        customProblems: [],
        solved: ['sum'],
        startedAt: { sum: started },
        drafts: { 'sum:python': 'print("rascunho antigo")' },
        revealedHints: { sum: [0] },
        evidence: { sum: 'Somei os dois números.' },
      }),
    );
  });
  await page.goto('/#problem/sum');
  await expect(page.getByLabel('Editor de código')).toContainText('print("rascunho antigo")');
  await page.getByRole('button', { name: 'Dicas progressivas' }).click();
  await expect(
    page.getByText('Quais informações entram e qual resultado deve sair?', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Conclusão declarada · ver registro' }).click();
  await expect(page.getByLabel('Link da submissão ou reflexão sobre a solução')).toHaveValue(
    'Somei os dois números.',
  );
});

test('trilha recomenda o próximo passo e avança para Laços após dois desafios', async ({
  page,
}) => {
  const card = (title: string) =>
    page.locator('.topic-card').filter({ has: page.getByRole('heading', { name: title }) });
  await page.goto('/');
  const nextStep = page.getByRole('region', { name: /Seu próximo passo/ });
  await expect(nextStep).toContainText('Você está pronto para começar Primeiros algoritmos.');
  await expect(nextStep.getByRole('button', { name: /O primeiro de muitos/ })).toBeVisible();
  await expect(card('Primeiros algoritmos')).toContainText('Etapa atual');
  for (const id of ['sum', 'parity']) {
    await page.goto(`/#problem/${id}`);
    await page.getByRole('button', { name: 'Registrar conclusão', exact: true }).click();
    await page
      .getByLabel('Link da submissão ou reflexão sobre a solução')
      .fill('Resolvi e testei os exemplos.');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Salvar conclusão declarada' }).click();
    await expect(
      page.getByRole('button', { name: 'Conclusão declarada · ver registro' }),
    ).toBeVisible();
  }
  await page.goto('/');
  await expect(nextStep).toContainText('Você resolveu os últimos desafios quase sem dicas.');
  await expect(nextStep.getByRole('button', { name: /Uma sequência curiosa/ })).toBeVisible();
  await expect(card('Laços & simulação')).toContainText('Etapa atual');
  await expect(
    page.getByText('Conclua o desafio de Laços & simulação · 0/1', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Ver trilha completa' }).click();
  await expect(card('Primeiros algoritmos')).toContainText('Dominado');
  await expect(card('Vetores & strings')).toContainText('Recomendado após Laços & simulação');
});

test('dica liberada só conta como lida depois do clique', async ({ page }) => {
  const views = () =>
    page.evaluate(
      () => JSON.parse(localStorage.getItem('classcode.demo.v1') ?? '{}').hintViews?.sum ?? [],
    );
  await page.clock.install({ time: new Date('2026-11-02T15:00:00Z') });
  await page.goto('/#problem/sum');
  await page.getByRole('button', { name: 'Dicas progressivas' }).click();
  await page.clock.fastForward(181000);
  await expect(page.getByRole('button', { name: 'Revelar dica', exact: true })).toBeVisible();
  expect(await views()).toEqual([]);
  await page.getByRole('button', { name: 'Revelar dica', exact: true }).click();
  await expect(
    page.getByText('Quais informações entram e qual resultado deve sair?', { exact: true }),
  ).toBeVisible();
  expect((await views()).map((v: { ordinal: number }) => v.ordinal)).toEqual([1]);
});

test('professor acompanha a turma e exporta o CSV', async ({ page }) => {
  // The single demo identity practices as a student first.
  await page.goto('/#problem/sum');
  await page.getByRole('button', { name: 'Registrar conclusão', exact: true }).click();
  await page.getByLabel('Link da submissão ou reflexão sobre a solução').fill('Somei e testei.');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Salvar conclusão declarada' }).click();
  await page.goto('/#problem/parity');
  await expect(page.getByRole('heading', { name: 'Par ou ímpar?' })).toBeVisible();
  await page.getByRole('button', { name: 'Alterar perfil da demonstração' }).click();
  await page.getByRole('combobox', { name: 'Perspectiva', exact: true }).selectOption('teacher');
  await page.getByRole('button', { name: 'Acessar demonstração' }).click();

  const panel = page.getByRole('region', { name: 'Acompanhamento da turma' });
  await expect(panel).toContainText('Conclusões são autodeclaradas');
  const student = panel
    .getByRole('region', { name: 'Tabela de alunos' })
    .getByRole('row', { name: /Alex/ });
  await expect(student).toContainText('100%');
  await expect(student).toContainText('Primeiros algoritmos');
  const map = panel
    .getByRole('region', { name: 'Mapa aluno × questão' })
    .getByRole('row', { name: /Alex/ });
  await expect(map).toContainText('Concluiu sem dica');
  await expect(map).toContainText('Em andamento');

  const downloading = page.waitForEvent('download');
  await panel.getByRole('button', { name: 'Exportar CSV' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe(
    'classcode-algoritmos-e-programacao-i-acompanhamento.csv',
  );
  const csv = await readFile(await download.path(), 'utf8');
  expect(csv).toContain('Conclusões autodeclaradas');
  expect(csv).toMatch(/\r\nAlex;/);

  await page.getByRole('button', { name: 'Criar uma turma', exact: false }).click();
  await page.getByLabel('Nome da turma').fill('Turma vazia');
  await page.getByRole('button', { name: 'Criar turma', exact: true }).last().click();
  await nav(page, 'Painel do professor');
  await panel.getByLabel('Turma acompanhada').selectOption({ label: 'Turma vazia' });
  await expect(panel).toContainText('Nenhum aluno matriculado ainda.');
  await expect(panel.getByRole('button', { name: 'Exportar CSV' })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('turma fictícia demonstra o painel e se identifica como fictícia', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Alterar perfil da demonstração' }).click();
  await page.getByRole('combobox', { name: 'Perspectiva', exact: true }).selectOption('teacher');
  await page.getByRole('button', { name: 'Acessar demonstração' }).click();
  const panel = page.getByRole('region', { name: 'Acompanhamento da turma' });
  await expect(panel).toContainText('Conclusões são autodeclaradas');
  await expect(panel.getByRole('note')).toHaveCount(0);

  await panel
    .getByLabel('Turma acompanhada')
    .selectOption({ label: 'Turma de demonstração · dados fictícios' });
  await expect(panel.getByRole('note')).toContainText('Dados fictícios.');
  const table = panel.getByRole('region', { name: 'Tabela de alunos' });
  await expect(table.getByRole('row')).toHaveCount(9);
  for (const signal of ['Ainda não começou.', 'Inativo.', 'Travado.', 'Muito dependente de dicas.'])
    await expect(table).toContainText(signal);
  await expect(
    panel
      .getByRole('region', { name: 'Questões que mais exigiram ajuda' })
      .getByRole('listitem')
      .first(),
  ).toContainText('Quantos são diferentes?');
  await expect(panel.getByRole('region', { name: 'Alunos por etapa' })).toContainText(
    'Sem etapa em aberto',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );

  await nav(page, 'Minhas turmas');
  await expect(page.getByText('dados fictícios')).toHaveCount(0);
});
