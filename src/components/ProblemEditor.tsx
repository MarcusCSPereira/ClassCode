import { useState } from 'react';
import { modules } from '../lib/catalog';
import { validateProblem } from '../lib/domain';
import type { Classroom, Problem } from '../lib/types';
import type { NewProblem } from '../data/repository';
export default function ProblemEditor({
  classes,
  onSave,
  remote = false,
}: {
  classes: Classroom[];
  /** Resolves to an error message, or null after publishing. */
  onSave: (p: NewProblem) => Promise<string | null>;
  remote?: boolean;
}) {
  const [error, setError] = useState('');
  return (
    <form
      className="form-stack"
      onSubmit={async (e) => {
        e.preventDefault();
        const d = new FormData(e.currentTarget);
        const get = (key: string) => String(d.get(key) ?? '').trim();
        const p: NewProblem = {
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
          authorClassId: get('class'),
          hints: [180, 420, 720].map((afterSeconds, i) => ({
            afterSeconds,
            text: get(`hint${i}`),
          })),
        };
        const validation = validateProblem(p);
        if (validation) {
          setError(validation);
          return;
        }
        const failure = await onSave(p);
        if (failure) setError(failure);
      }}
    >
      <p className="helper">
        Um padrão para todos os desafios: objetivo, enunciado, exemplos e três dicas progressivas. A
        publicação{' '}
        {remote ? 'será persistida na turma selecionada.' : 'acontece apenas neste navegador.'}
      </p>
      <label>
        Título
        <input name="title" required maxLength={100} placeholder="Ex.: O caminho mais curto" />
      </label>
      <div className="form-grid">
        <label>
          Turma
          <select name="class">
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tópico
          <select name="module">
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
          <select name="difficulty">
            <option>Básico</option>
            <option>Intermediário</option>
            <option>Avançado</option>
          </select>
        </label>
        <label>
          Tempo sugerido (min)
          <input name="minutes" type="number" min={5} max={180} defaultValue={20} required />
        </label>
      </div>
      <label>
        Objetivo de aprendizagem
        <input name="objective" required placeholder="O que o aluno vai aprender?" />
      </label>
      <label>
        Enunciado
        <textarea name="statement" rows={3} required />
      </label>
      <div className="form-grid">
        <label>
          Entrada
          <textarea name="input" rows={2} required />
        </label>
        <label>
          Saída
          <textarea name="output" rows={2} required />
        </label>
      </div>
      <label>
        Restrições
        <input name="constraints" required placeholder="Ex.: 1 ≤ n ≤ 10⁵" />
      </label>
      <div className="form-grid">
        <label>
          Exemplo de entrada
          <textarea name="exampleInput" rows={2} required />
        </label>
        <label>
          Exemplo de saída
          <textarea name="exampleOutput" rows={2} required />
        </label>
      </div>
      <label>
        Link do judge (opcional)
        <input name="externalUrl" type="url" placeholder="https://cses.fi/problemset/task/..." />
      </label>
      {[
        'Direção · após 3 minutos',
        'Estratégia · após 7 minutos',
        'Pseudocódigo · após 12 minutos',
      ].map((label, i) => (
        <label key={i}>
          Dica {i + 1}: {label}
          <textarea name={`hint${i}`} rows={2} required />
        </label>
      ))}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button type="submit" className="button primary">
        {remote ? 'Publicar desafio na turma' : 'Publicar desafio na demonstração'}
      </button>
    </form>
  );
}
