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
import type { ComponentProps } from 'react';
import type { Classroom } from '../lib/types';
import type { ClassroomActivity, ProblemSummary } from '../data/repository';
import ClassMetrics from '../components/ClassMetrics';
import TeacherProblemList from '../components/TeacherProblemList';
export default function TeacherPage({
  teacher,
  classes,
  problems,
  ownedProblems,
  solvedCount,
  loadActivity,
  onReviewProgress,
  onCreateClass,
  onCreateProblem,
  onExport,
  onOpenProblem,
  onEditProblem,
  onPublishProblem,
  onArchiveProblem,
  onRestoreProblem,
  onChangeProfile,
  remote = false,
}: {
  teacher: boolean;
  classes: Classroom[];
  problems: ProblemSummary[];
  /** Problems of the teacher's classes in every status (drafts and archived included). */
  ownedProblems: ProblemSummary[];
  solvedCount: number;
  loadActivity: (classroomId: string) => Promise<ClassroomActivity>;
  onReviewProgress: ComponentProps<typeof ClassMetrics>['onReview'];
  onCreateClass: () => void;
  onCreateProblem: () => void;
  onExport: () => void;
  onOpenProblem: (p: ProblemSummary) => void;
  onEditProblem: (p: ProblemSummary) => void;
  onPublishProblem: (p: ProblemSummary) => void;
  onArchiveProblem: (p: ProblemSummary) => void;
  onRestoreProblem: (p: ProblemSummary) => void;
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
          <strong>{ownedProblems.length}</strong>
          <span>Questões das suas turmas</span>
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
      <ClassMetrics
        classes={classes}
        problems={problems}
        loadActivity={loadActivity}
        onReview={onReviewProgress}
      />
      <div className="section-heading">
        <div>
          <h2>Suas questões</h2>
          <p>Rascunhos ficam só com você até serem validados e publicados.</p>
        </div>
        <button className="button secondary" onClick={onCreateProblem}>
          <Plus size={16} /> Nova questão
        </button>
      </div>
      <TeacherProblemList
        problems={ownedProblems}
        classes={classes}
        onCreate={onCreateProblem}
        onOpen={onOpenProblem}
        onEdit={onEditProblem}
        onPublish={onPublishProblem}
        onArchive={onArchiveProblem}
        onRestore={onRestoreProblem}
      />
    </>
  );
}
