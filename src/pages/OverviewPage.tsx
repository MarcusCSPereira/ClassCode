import {
  ArrowRight,
  ArrowUpRight,
  Braces,
  CheckCheck,
  Code2,
  Flag,
  GraduationCap,
  LockKeyhole,
  Map,
  Plus,
  Target,
  Waypoints,
} from 'lucide-react';
import { modules } from '../lib/catalog';
import type { Page } from '../lib/navigation';
import type { ModuleProgress, Recommendation } from '../lib/progression';
import type { Module } from '../lib/types';
import type { ProblemSummary } from '../data/repository';
import ModuleCard from '../components/ModuleCard';
import ProblemList from '../components/ProblemList';
import Progress from '../components/Progress';
const goalText = (required: number, total: number) =>
  required < total
    ? `Conclua ${required} de ${total} desafios`
    : required === 1
      ? 'Conclua o desafio'
      : `Conclua os ${total} desafios`;
const kindLabels: Record<Recommendation['kind'], string> = {
  continue: 'CONTINUAR',
  advance: 'AVANÇAR',
  reinforce: 'REFORÇAR',
};
export default function OverviewPage({
  name,
  teacher,
  problems: all,
  solved,
  loading,
  progress,
  current,
  recommendation,
  onPractice,
  onOpenProblem,
  onNavigate,
  onPrimaryAction,
  onSelectTopic,
}: {
  name: string;
  teacher: boolean;
  problems: ProblemSummary[];
  solved: string[];
  /** True until the student's activity arrives; progress is not meaningful before that. */
  loading: boolean;
  progress: Record<string, ModuleProgress>;
  current: string | null;
  recommendation: Recommendation | null;
  onPractice: () => void;
  onOpenProblem: (p: ProblemSummary) => void;
  onNavigate: (page: Page) => void;
  onPrimaryAction: () => void;
  onSelectTopic: (m: Module) => void;
}) {
  const solvedCount = all.filter((p) => solved.includes(p.id)).length;
  const percent = Math.round((solvedCount / Math.max(all.length, 1)) * 100);
  const recommended = recommendation && all.find((p) => p.id === recommendation.problemId);
  const finished = !loading && !recommendation;
  const currentTitle = modules.find((m) => m.id === current)?.title;
  const goal = current ? progress[current] : undefined;
  // Show the current stage and the two after it.
  const first = Math.max(
    0,
    Math.min(
      modules.findIndex((m) => m.id === current),
      modules.length - 3,
    ),
  );
  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">SEU PRÓXIMO PASSO COMEÇA AQUI</div>
          <h1>
            Olá, {name}. Vamos evoluir<span className="blue-text">?</span>
          </h1>
          <p>Do primeiro “olá, mundo” às ideias que resolvem grandes problemas.</p>
        </div>
        <button className="button secondary" onClick={onPrimaryAction}>
          <Plus size={16} /> {teacher ? 'Criar turma' : 'Entrar em uma turma'}
        </button>
      </div>
      <div className="dashboard-layout">
        <div className="dashboard-main">
          <section className="hero">
            <div className="hero-copy">
              <span className="hero-kicker">
                <span /> APRENDA NO SEU RITMO
              </span>
              <h2>
                Pequenos passos.
                <br />
                Grandes <em>soluções.</em>
              </h2>
              <p>
                Entenda a ideia, visualize o algoritmo e<br className="desktop-break" /> transforme
                conhecimento em código.
              </p>
              <button className="button dark" onClick={onPractice} disabled={loading}>
                {finished
                  ? 'Ver minha trilha'
                  : solvedCount
                    ? 'Continuar aprendendo'
                    : 'Começar minha jornada'}
                <ArrowUpRight size={17} />
              </button>
              <div className="hero-languages">
                <span>Python</span>
                <i />
                <span>Java</span>
                <i />
                <span>C++</span>
              </div>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="art-orbit orbit-one" />
              <div className="art-orbit orbit-two" />
              <div className="art-dots" />
              <span className="floating-tag tag-top">pense → tente → aprenda</span>
              <div className="code-tile tile-back">
                <Braces size={36} />
              </div>
              <div className="code-tile tile-front">
                <Code2 size={60} />
                <span>hello, possibilities.</span>
              </div>
              <span className="floating-tag tag-bottom">
                <CheckCheck size={15} /> uma ideia de cada vez
              </span>
              <span className="art-star">✳</span>
            </div>
          </section>
          <div className="stat-grid">
            <div>
              <span className="stat-icon blue">
                <Map size={20} />
              </span>
              <span>
                <strong>
                  {modules.length}
                  <small> etapas para explorar</small>
                </strong>
                <p>Do básico ao avançado</p>
              </span>
            </div>
            <div>
              <span className="stat-icon peach">
                <Code2 size={20} />
              </span>
              <span>
                <strong>
                  {all.length}
                  <small> desafios disponíveis</small>
                </strong>
                <p>Prática com propósito</p>
              </span>
            </div>
            <div>
              <span className="stat-icon lavender">
                <CheckCheck size={20} />
              </span>
              <span>
                <strong>
                  {solvedCount}
                  <small> concluídos por você</small>
                </strong>
                <p>Progresso autodeclarado</p>
              </span>
            </div>
          </div>
          <section>
            <div className="section-heading">
              <div>
                <h2>
                  Sua trilha de aprendizagem <span className="subtle-badge">PASSO A PASSO</span>
                </h2>
                <p>Uma base sólida para chegar mais longe.</p>
              </div>
              <button className="text-button" onClick={() => onNavigate('roadmap')}>
                Ver trilha completa <ArrowRight size={16} />
              </button>
            </div>
            <div className="topics-grid">
              {modules.slice(first, first + 3).map((m, i) => (
                <ModuleCard
                  module={m}
                  index={first + i}
                  problems={all}
                  progress={loading ? undefined : progress[m.id]}
                  current={m.id === current}
                  onSelect={onSelectTopic}
                  key={m.id}
                />
              ))}
            </div>
          </section>
          <section className="next-section" aria-labelledby="next-step-title">
            <div className="section-heading">
              <div>
                <h2 id="next-step-title">
                  {finished ? 'Trilha concluída' : 'Seu próximo passo'}
                  {recommendation && (
                    <span className="subtle-badge">{kindLabels[recommendation.kind]}</span>
                  )}
                </h2>
                <p>
                  {loading
                    ? 'Calculando o próximo passo…'
                    : (recommendation?.reason ??
                      'Você concluiu todas as etapas com desafios publicados. Novos desafios aparecem aqui.')}
                </p>
              </div>
              <button className="text-button" onClick={() => onNavigate('problems')}>
                Ver todos <ArrowRight size={16} />
              </button>
            </div>
            {recommended && (
              <ProblemList list={[recommended]} solved={solved} onOpen={onOpenProblem} />
            )}
          </section>
        </div>
        <aside className="dashboard-aside">
          <section className="card progress-card">
            <div className="card-heading">
              <h3>Seu progresso</h3>
              <Target size={17} />
            </div>
            <div
              className="progress-ring"
              style={{
                background: `conic-gradient(var(--accent) ${percent}%, var(--surface-muted) 0)`,
              }}
            >
              <div>
                <strong>
                  {percent}
                  <span>%</span>
                </strong>
                <small>da prática disponível</small>
              </div>
            </div>
            <p>
              <strong>{solvedCount}</strong> de {all.length} desafios concluídos
            </p>
            <div className="progress-divider" />
            <div className="weekly-goal">
              <span className="small-icon">
                <Flag size={17} />
              </span>
              <span>
                <strong>{finished ? 'Trilha concluída' : 'Seu objetivo atual'}</strong>
                <small>
                  {goal && currentTitle
                    ? `${goalText(goal.required, goal.total)} de ${currentTitle} · ${goal.completed}/${goal.required}`
                    : finished
                      ? 'Todas as etapas com desafios estão concluídas'
                      : 'Calculando…'}
                </small>
              </span>
            </div>
            <Progress
              value={
                goal ? Math.min(100, (goal.completed / goal.required) * 100) : finished ? 100 : 0
              }
            />
          </section>
          <section className="card visual-preview">
            <div className="card-heading">
              <h3>Veja a ideia acontecer</h3>
              <span className="tiny-dot" />
            </div>
            <p>
              Algoritmos fazem mais sentido
              <br />
              quando você pode vê-los.
            </p>
            <div className="mini-array" aria-hidden="true">
              {[2, 5, 8, 13, 19].map((n, i) => (
                <span key={n} className={i === 2 ? 'highlight' : ''}>
                  {n}
                </span>
              ))}
            </div>
            <div className="mini-array-label">
              <span>Busca binária</span>
              <span className="mono">O(log n)</span>
            </div>
            <button className="button secondary full" onClick={() => onNavigate('visuals')}>
              <Waypoints size={16} /> Explorar laboratório <ArrowUpRight size={16} />
            </button>
          </section>
          <section className="class-preview">
            <div className="class-preview-icon">
              <GraduationCap size={26} />
            </div>
            <h3>Aprender é melhor em turma.</h3>
            <p>Conecte-se ao seu professor e acompanhe os desafios da disciplina.</p>
            <button className="text-button" onClick={() => onNavigate('classes')}>
              Acessar minhas turmas <ArrowRight size={15} />
            </button>
          </section>
          <div className="aside-footnote">
            <LockKeyhole size={13} /> Seus rascunhos ficam neste navegador.
          </div>
        </aside>
      </div>
    </>
  );
}
