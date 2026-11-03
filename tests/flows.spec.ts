import { test, expect, type Page } from '@playwright/test';
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
