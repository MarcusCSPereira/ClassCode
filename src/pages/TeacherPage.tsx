import {
  ArrowDownToLine,
  ArrowUpRight,
  Braces,
  Code2,
  ListChecks,
  LockKeyhole,
  Plus,
  Users,
} from 'lucide-react';
import type { Classroom } from '../lib/types';
import type { ClassroomActivity, ProblemSummary } from '../data/repository';
import ClassMetrics from '../components/ClassMetrics';
import ProblemList from '../components/ProblemList';
export default function TeacherPage({
  teacher,
  classes,
  problems,
  customProblems,
  solvedCount,
  solved,
  loadActivity,
  onCreateClass,
  onCreateProblem,
  onExport,
  onOpenProblem,
  onChangeProfile,
  remote = false,
}: {
  teacher: boolean;
  classes: Classroom[];
  problems: ProblemSummary[];
  customProblems: ProblemSummary[];
  solvedCount: number;
  solved: string[];
  loadActivity: (classroomId: string) => Promise<ClassroomActivity>;
  onCreateClass: () => void;
  onCreateProblem: () => void;
  onExport: () => void;
  onOpenProblem: (p: ProblemSummary) => void;
  onChangeProfile: () => void;
  remote?: boolean;
}) {
  if (!teacher)
    return (
      <div className="empty card">
        <LockKeyhole size={30} />
        <h1>Perspectiva do professor</h1>
        <p>
          {remote
            ? 'Sua conta não possui o papel de professor.'
            : 'Altere o perfil da demonstração para explorar este painel.'}
        </p>
        {!remote && (
          <button className="button primary" onClick={onChangeProfile}>
            Alterar perfil
          </button>
        )}
      </div>
    );
  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">ENSINAR É ABRIR CAMINHOS</div>
          <h1>Aprendizagem com direção.</h1>
          <p>
            {remote
              ? 'Prepare os próximos desafios e acompanhe suas turmas.'
              : 'Prepare os próximos desafios e acompanhe o protótipo pela perspectiva do professor.'}
          </p>
        </div>
        <button className="button primary" onClick={onCreateProblem}>
          <Plus size={17} /> Criar desafio
        </button>
      </div>
      <div className="teacher-stats">
        <section className="card">
          <Users />
          <strong>{classes.length}</strong>
          <span>{remote ? 'Turmas conectadas' : 'Turmas na demonstração'}</span>
        </section>
        <section className="card">
          <Code2 />
          <strong>{customProblems.length}</strong>
          <span>Desafios autorais criados</span>
        </section>
        <section className="card">
          <ListChecks />
          <strong>{solvedCount}</strong>
          <span>{remote ? 'Conclusões autodeclaradas' : 'Conclusões locais declaradas'}</span>
        </section>
      </div>
      <div className="teacher-layout">
        <section className="card teacher-actions">
          <h2>Prepare sua próxima aula</h2>
          <p>O mesmo formato pedagógico em cada desafio.</p>
          <button onClick={onCreateClass}>
            <span className="topic-icon blue">
              <Users />
            </span>
            <span>
              <strong>Criar uma turma</strong>
              <small>Nome, semestre e código de convite</small>
            </span>
            <Plus size={19} />
          </button>
          <button onClick={onCreateProblem}>
            <span className="topic-icon peach">
              <Braces />
            </span>
            <span>
              <strong>Publicar um desafio</strong>
              <small>Objetivo, exemplos e dicas progressivas</small>
            </span>
            <Plus size={19} />
          </button>
          <button onClick={onExport}>
            <span className="topic-icon lavender">
              <ArrowDownToLine />
            </span>
            <span>
              <strong>Exportar meu conteúdo</strong>
              <small>JSON para o time migrar ao backend</small>
            </span>
            <ArrowDownToLine size={19} />
          </button>
        </section>
        <section className="card teacher-info">
          <span className="eyebrow">PRÓXIMO MARCO DO PROJETO</span>
          <h2>Da demonstração à sala de aula.</h2>
          <p>
            {remote
              ? 'Autenticação, autorização e métricas usam o backend da turma. Os sinais abaixo apoiam a prática e não são nota.'
              : 'Autenticação institucional e autorização serão conectadas ao backend. Por enquanto, o acompanhamento abaixo usa apenas dados deste navegador.'}
          </p>
          <a
            className="text-button"
            href="https://github.com/MarcusCSPereira/ClassCode/blob/main/docs/PLANO.md"
            target="_blank"
            rel="noreferrer"
          >
            Consultar plano de desenvolvimento <ArrowUpRight size={16} />
          </a>
        </section>
      </div>
      <ClassMetrics classes={classes} problems={problems} loadActivity={loadActivity} />
      <div className="section-heading">
        <h2>Seus desafios publicados</h2>
      </div>
      {customProblems.length ? (
        <ProblemList list={customProblems} solved={solved} onOpen={onOpenProblem} />
      ) : (
        <div className="empty card">
          <Code2 size={30} />
          <h3>O próximo desafio começa com você.</h3>
          <p>Crie sua primeira questão seguindo o padrão ClassCode.</p>
          <button className="button secondary" onClick={onCreateProblem}>
            Criar primeiro desafio <Plus size={16} />
          </button>
        </div>
      )}
    </>
  );
}
