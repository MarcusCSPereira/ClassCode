## ⚙️ Integração com Judge0 & Execução de Código

### O que foi implementado

#### 1. Casos de Teste e Motor do Judge0 (`src/lib/judge.ts`)
* **`PROBLEM_TEST_CASES`:** Mapeamento completo de casos de teste (incluindo o exemplo público `exampleInput`/`exampleOutput` de cada questão em `src/lib/catalog.ts` + casos de borda privados) para todos os **7 exercícios** da trilha-base:
  * `sum` (*O primeiro de muitos*)
  * `parity` (*Par ou ímpar?*)
  * `maximum` (*Quem é o maior?*)
  * `weird` (*Uma sequência curiosa*)
  * `missing` (*O número que falta*)
  * `distinct` (*Quantos são diferentes?*)
  * `binary` (*Encontre o alvo*)
* **`resolveProblemTestCases`:** Resolve os casos de teste pelo `id` do exercício, pelo `title` (quando a trilha-base é importada para uma turma remota com UUID) ou automaticamente a partir do `exampleInput` e `exampleOutput` de qualquer questão nova criada pelo professor.
* **`executeJudge0Submission`:** Envia `source_code`, `language_id` (`71` para Python 3, `62` para Java, `54` para C++17), `stdin` e `expected_output` para a API do Judge0 (`/submissions?base64_encoded=false&wait=true`), faz polling automático por token caso a submissão entre em fila, agrega `passedCases`/`totalCases`, tempo (`timeMs`) e memória (`memoryKb`), e oculta o `stdout` de casos de teste privados.
* **`createHttpJudgeGateway`:** Implementação de `JudgeGateway` consumida pelo frontend via `/api/judge/submit`.

---

#### 2. Endpoints de Backend (Local + Supabase)
* **Servidor Vite (`vite.config.ts`):** Middleware em `POST /api/judge/submit` e `GET /api/judge/submit/:id` com suporte a chave de idempotência, mantendo `JUDGE0_URL`, `JUDGE0_API_KEY` e `JUDGE0_AUTH_TOKEN` exclusivamente no servidor.
* **Supabase Edge Function (`supabase/functions/judge-submit/index.ts`):** Função pronta para deploy remoto com o mesmo contrato.
* **Variáveis de ambiente (`.env.example`):** Documentadas `JUDGE0_URL` (padrão `https://ce.judge0.com`), `JUDGE0_API_KEY` e `JUDGE0_AUTH_TOKEN`.

---

#### 3. Interface de Execução na Questão (`src/pages/ProblemPage.tsx` e `src/styles.css`)
* Botão **"Executar código"** integrado ao editor.
* Painel de resultado exibindo:
  * Veredito traduzido (*Aceito (Accepted)*, *Resposta incorreta*, *Erro de compilação*, *Limite de tempo excedido*, etc.)
  * Quantidade de casos aprovados (`Casos: X/Y`)
  * Tempo de execução em `ms` e memória em `KB`
  * Saídas `stdout` / `stderr` / `compileOutput`

---

#### 4. Testes Automatizados (`src/lib/judge.test.ts`)
* **7 suítes de teste** validando a consistência de todos os 7 exercícios com o catálogo, resolução de casos customizados, mapeamento de status, execução multipasso no Judge0, proteção de casos privados, polling por token e o gateway HTTP (`npm run check` com **79/79 testes passando**).