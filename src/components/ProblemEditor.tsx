import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { modules } from '../lib/catalog';
import { MAX_HIDDEN_TESTS, validateProblem } from '../lib/domain';
import type { Classroom, Problem, ProblemTest } from '../lib/types';
import type { EditableProblem, ProblemInput } from '../data/repository';

/** What happens after saving: close the editor, or go on to validate and publish. */
export type AfterSave = 'close' | 'validate';

export default function ProblemEditor({
  classes,
  initial,
  onSave,
  remote = false,
}: {
  classes: Classroom[];
  /** Present when editing; the class of an existing problem cannot change. */
  initial?: EditableProblem;
  /** Resolves to an error message, or null after saving. */
  onSave: (problem: ProblemInput, next: AfterSave) => Promise<string | null>;
  remote?: boolean;
}) {
  const [error, setError] = useState('');
  const [tests, setTests] = useState<ProblemTest[]>(initial?.tests ?? []);
  const draft = !initial || initial.status === 'draft';
  const updateTest = (index: number, change: Partial<ProblemTest>) =>
    setTests((all) => all.map((t, i) => (i === index ? { ...t, ...change } : t)));
  return (
    <form
      className="form-stack"
      onSubmit={async (e) => {
        e.preventDefault();
        const d = new FormData(e.currentTarget);
        const get = (key: string) => String(d.get(key) ?? '').trim();
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        const problem: ProblemInput = {
          ...(initial && { id: initial.id }),
          title: get('title'),
          objective: get('objective'),
          statement: get('statement'),
          moduleId: get('module'),
          difficulty: get('difficulty') as Problem['difficulty'],
          minutes: Number(get('minutes')),
          input: get('input'),
          output: get('output'),
          constraints: get('constraints'),
          exampleInput: get('exampleInput'),
          exampleOutput: get('exampleOutput'),
          externalUrl: get('externalUrl') || undefined,
          authorClassId: initial?.authorClassId ?? get('class'),
          hints: [180, 420, 720].map((afterSeconds, i) => ({
            afterSeconds,
            text: get(`hint${i}`),
          })),
          tests,
        };
        const validation = validateProblem(problem);
        if (validation) {
          setError(validation);
          return;
        }
        const failure = await onSave(
          problem,
          submitter?.value === 'validate' ? 'validate' : 'close',
        );
        if (failure) setError(failure);
      }}
    >
      <p className="helper">
        Um padrão para todos os desafios: objetivo, enunciado, exemplos, três dicas progressivas e
        casos de teste.{' '}
        {draft
          ? 'A questão fica como rascunho, visível só para você, até ser publicada.'
          : 'As alterações valem imediatamente para a turma.'}{' '}
        {!remote && 'Na demonstração, tudo fica salvo neste navegador.'}
      </p>
      {initial && initial.attempts > 0 && (
        <p className="helper warning-note" role="note">
          {initial.attempts === 1
            ? '1 aluno já abriu esta questão.'
            : `${initial.attempts} alunos já abriram esta questão.`}{' '}
          Mudar o enunciado ou os casos muda a questão para todos, inclusive para quem já concluiu.
        </p>
      )}
      <label>
        Título
        <input
          name="title"
          required
          maxLength={100}
          defaultValue={initial?.title}
          placeholder="Ex.: O caminho mais curto"
        />
      </label>
      <div className="form-grid">
        <label>
          Turma
          <select
            name="class"
            defaultValue={initial?.authorClassId}
            disabled={Boolean(initial)}
            title={initial ? 'A turma de uma questão existente não muda.' : undefined}
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tópico
          <select name="module" defaultValue={initial?.moduleId}>
            {modules.map((m) => (
              <option value={m.id} key={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-grid">
        <label>
          Dificuldade
          <select name="difficulty" defaultValue={initial?.difficulty}>
            <option>Básico</option>
            <option>Intermediário</option>
            <option>Avançado</option>
          </select>
        </label>
        <label>
          Tempo sugerido (min)
          <input
            name="minutes"
            type="number"
            min={5}
            max={180}
            defaultValue={initial?.minutes ?? 20}
            required
          />
        </label>
      </div>
      <label>
        Objetivo de aprendizagem
        <input
          name="objective"
          required
          defaultValue={initial?.objective}
          placeholder="O que o aluno vai aprender?"
        />
      </label>
      <label>
        Enunciado
        <textarea name="statement" rows={3} required defaultValue={initial?.statement} />
      </label>
      <div className="form-grid">
        <label>
          Entrada
          <textarea name="input" rows={2} required defaultValue={initial?.input} />
        </label>
        <label>
          Saída
          <textarea name="output" rows={2} required defaultValue={initial?.output} />
        </label>
      </div>
      <label>
        Restrições
        <input
          name="constraints"
          required
          defaultValue={initial?.constraints}
          placeholder="Ex.: 1 ≤ n ≤ 10⁵"
        />
      </label>
      <div className="form-grid">
        <label>
          Exemplo de entrada
          <textarea name="exampleInput" rows={2} required defaultValue={initial?.exampleInput} />
        </label>
        <label>
          Exemplo de saída
          <textarea name="exampleOutput" rows={2} required defaultValue={initial?.exampleOutput} />
        </label>
      </div>
      <label>
        Link do judge (opcional)
        <input
          name="externalUrl"
          type="url"
          defaultValue={initial?.externalUrl}
          placeholder="https://cses.fi/problemset/task/..."
        />
      </label>
      {[
        'Direção · após 3 minutos',
        'Estratégia · após 7 minutos',
        'Pseudocódigo · após 12 minutos',
      ].map((label, i) => (
        <label key={i}>
          Dica {i + 1}: {label}
          <textarea name={`hint${i}`} rows={2} required defaultValue={initial?.hints[i]?.text} />
        </label>
      ))}
      <fieldset className="test-cases">
        <legend>Casos de teste ocultos</legend>
        <p className="helper">
          O exemplo do enunciado é o caso 1 e o aluno o vê. Os casos ocultos definem o veredito do
          “Executar código” e nunca aparecem para o aluno. Cubra limites, repetições e o caso
          mínimo.
        </p>
        {tests.map((test, i) => (
          <div className="test-case" key={i}>
            <label>
              Entrada do caso {i + 2}
              <textarea
                rows={2}
                value={test.stdin}
                onChange={(e) => updateTest(i, { stdin: e.target.value })}
              />
            </label>
            <label>
              Saída esperada do caso {i + 2}
              <textarea
                rows={2}
                required
                value={test.expectedOutput}
                onChange={(e) => updateTest(i, { expectedOutput: e.target.value })}
              />
            </label>
            <button
              type="button"
              className="icon-button"
              aria-label={`Remover caso ${i + 2}`}
              onClick={() => setTests((all) => all.filter((_, j) => j !== i))}
            >
              <Trash2 size={17} />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="button secondary"
          disabled={tests.length >= MAX_HIDDEN_TESTS}
          onClick={() => setTests((all) => [...all, { stdin: '', expectedOutput: '' }])}
        >
          <Plus size={16} /> Adicionar caso oculto
        </button>
      </fieldset>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="form-actions">
        {draft ? (
          <>
            <button type="submit" value="close" className="button secondary">
              Salvar rascunho
            </button>
            <button type="submit" value="validate" className="button primary">
              Salvar e validar
            </button>
          </>
        ) : (
          <button type="submit" value="close" className="button primary">
            Salvar alterações
          </button>
        )}
      </div>
    </form>
  );
}
