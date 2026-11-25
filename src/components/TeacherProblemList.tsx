import { Archive, ArrowUpRight, Code2, Pencil, Plus, RotateCcw, Send } from 'lucide-react';
import { modules } from '../lib/catalog';
import type { Classroom, ProblemStatus } from '../lib/types';
import type { ProblemSummary } from '../data/repository';

const statusLabels: Record<ProblemStatus, string> = {
  draft: 'Rascunho',
  published: 'Publicada',
  archived: 'Arquivada',
};
const statusTones: Record<ProblemStatus, string> = {
  draft: 'amber',
  published: 'blue',
  archived: 'neutral',
};
const order: ProblemStatus[] = ['draft', 'published', 'archived'];

/** The teacher's own problems with what can be done in each status. */
export default function TeacherProblemList({
  problems,
  classes,
  onCreate,
  onOpen,
  onEdit,
  onPublish,
  onArchive,
  onRestore,
}: {
  problems: ProblemSummary[];
  classes: Classroom[];
  onCreate: () => void;
  onOpen: (p: ProblemSummary) => void;
  onEdit: (p: ProblemSummary) => void;
  onPublish: (p: ProblemSummary) => void;
  onArchive: (p: ProblemSummary) => void;
  onRestore: (p: ProblemSummary) => void;
}) {
  if (!problems.length)
    return (
      <div className="empty card">
        <Code2 size={30} />
        <h3>O próximo desafio começa com você.</h3>
        <p>Crie sua primeira questão seguindo o padrão ClassCode.</p>
        <button className="button secondary" onClick={onCreate}>
          Criar primeiro desafio <Plus size={16} />
        </button>
      </div>
    );
  const status = (p: ProblemSummary) => p.status ?? 'published';
  const sorted = [...problems].sort((a, b) => order.indexOf(status(a)) - order.indexOf(status(b)));
  return (
    <ul className="teacher-problems" aria-label="Suas questões">
      {sorted.map((p) => (
        <li className="teacher-problem" key={p.id}>
          <div className="teacher-problem-info">
            <strong>{p.title}</strong>
            <small>
              {classes.find((c) => c.id === p.authorClassId)?.name ?? 'Turma'} ·{' '}
              {modules.find((m) => m.id === p.moduleId)?.title}
            </small>
          </div>
          <span className={`badge ${statusTones[status(p)]}`}>{statusLabels[status(p)]}</span>
          <div className="teacher-problem-actions">
            {status(p) === 'published' && (
              <button
                className="text-button"
                aria-label={`Abrir ${p.title}`}
                onClick={() => onOpen(p)}
              >
                <ArrowUpRight size={15} /> Abrir
              </button>
            )}
            {status(p) !== 'archived' && (
              <button
                className="text-button"
                aria-label={`Editar ${p.title}`}
                onClick={() => onEdit(p)}
              >
                <Pencil size={15} /> Editar
              </button>
            )}
            {status(p) === 'draft' && (
              <button
                className="text-button"
                aria-label={`Validar e publicar ${p.title}`}
                onClick={() => onPublish(p)}
              >
                <Send size={15} /> Validar e publicar
              </button>
            )}
            {status(p) === 'published' && (
              <button
                className="text-button"
                aria-label={`Arquivar ${p.title}`}
                onClick={() => onArchive(p)}
              >
                <Archive size={15} /> Arquivar
              </button>
            )}
            {status(p) === 'archived' && (
              <button
                className="text-button"
                aria-label={`Restaurar ${p.title} como rascunho`}
                onClick={() => onRestore(p)}
              >
                <RotateCcw size={15} /> Restaurar como rascunho
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
