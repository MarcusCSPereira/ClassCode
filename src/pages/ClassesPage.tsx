import { Braces, ChevronRight, CircleHelp, GraduationCap, Plus } from 'lucide-react';
import { belongsToClassroom } from '../lib/domain';
import type { Classroom } from '../lib/types';
import type { ProblemSummary } from '../data/repository';
export default function ClassesPage({
  teacher,
  classes,
  problems: all,
  onPrimaryAction,
  onOpenProblem,
  onAnnounce,
}: {
  teacher: boolean;
  classes: Classroom[];
  problems: ProblemSummary[];
  onPrimaryAction: () => void;
  onOpenProblem: (p: ProblemSummary) => void;
  onAnnounce: (message: string) => void;
}) {
  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">CONHECIMENTO SE CONSTRÓI EM CONJUNTO</div>
          <h1>Seu espaço em turma.</h1>
          <p>
            {teacher
              ? 'Organize a disciplina e publique desafios com intenção pedagógica.'
              : 'Acompanhe os desafios e siga aprendendo com a sua turma.'}
          </p>
        </div>
        <button className="button primary" onClick={onPrimaryAction}>
          <Plus size={17} /> {teacher ? 'Criar turma' : 'Entrar em uma turma'}
        </button>
      </div>
      <div className="class-grid">
        {classes.map((c) => (
          <section className="card classroom-card" key={c.id}>
            <div className="classroom-top">
              <span className="topic-icon blue">
                <GraduationCap size={27} />
              </span>
              <span className="badge neutral">{c.term}</span>
            </div>
            <h2>{c.name}</h2>
            <p>
              {c.teacher} <span>· Ambiente de demonstração</span>
            </p>
            <div className="class-code">
              <span>
                Código da turma<strong>{c.code}</strong>
              </span>
              <button
                className="icon-button"
                aria-label={`Copiar código ${c.code}`}
                onClick={() => {
                  void navigator.clipboard
                    .writeText(c.code)
                    .then(() => onAnnounce('Código da turma copiado.'))
                    .catch(() => onAnnounce(`Código da turma: ${c.code}`));
                }}
              >
                <Braces size={19} />
              </button>
            </div>
            <div className="class-challenges">
              <strong>Desafios da turma</strong>
              {all
                .filter((p) => belongsToClassroom(p, c.id))
                .map((p) => (
                  <button key={p.id} onClick={() => onOpenProblem(p)}>
                    <span>{p.title}</span>
                    <ChevronRight size={16} />
                  </button>
                ))}
              {!all.some((p) => belongsToClassroom(p, c.id)) && (
                <p className="helper">O primeiro desafio ainda será publicado.</p>
              )}
            </div>
          </section>
        ))}
      </div>
      <div className="info-strip">
        <CircleHelp size={19} />
        <p>
          Nesta demonstração, turmas e participações são locais. Para experimentar a entrada, use{' '}
          <strong>CLASS26</strong>. Códigos criados aqui só existem neste navegador.
        </p>
      </div>
    </>
  );
}
