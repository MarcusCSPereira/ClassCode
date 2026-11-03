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
import type { Module, Problem } from '../lib/types';
import ModuleCard from '../components/ModuleCard';
import ProblemList from '../components/ProblemList';
import Progress from '../components/Progress';
export default function OverviewPage({
  name,
  teacher,
  problems: all,
  solved,
  next,
  onOpenProblem,
  onNavigate,
  onPrimaryAction,
  onSelectTopic,
}: {
  name: string;
  teacher: boolean;
  problems: Problem[];
  solved: string[];
  next: Problem;
  onOpenProblem: (p: Problem) => void;
  onNavigate: (page: Page) => void;
  onPrimaryAction: () => void;
  onSelectTopic: (m: Module) => void;
}) {
  const solvedCount = all.filter((p) => solved.includes(p.id)).length;
  const percent = Math.round((solvedCount / Math.max(all.length, 1)) * 100);
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
              <button className="button dark" onClick={() => onOpenProblem(next)}>
                {solvedCount ? 'Continuar aprendendo' : 'Começar minha jornada'}
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
              {modules.slice(0, 3).map((m, i) => (
                <ModuleCard
                  module={m}
                  index={i}
                  problems={all}
                  solved={solved}
                  onSelect={onSelectTopic}
                  key={m.id}
                />
              ))}
            </div>
          </section>
          <section className="next-section">
            <div className="section-heading">
              <div>
                <h2>Um novo desafio espera por você</h2>
                <p>Não precisa saber tudo. Só precisa começar.</p>
              </div>
              <button className="text-button" onClick={() => onNavigate('problems')}>
                Ver todos <ArrowRight size={16} />
              </button>
            </div>
            <ProblemList
              list={all.filter((p) => !solved.includes(p.id)).slice(0, 2)}
              solved={solved}
              onOpen={onOpenProblem}
            />
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
                <strong>Seu primeiro objetivo</strong>
                <small>Concluir 3 desafios de fundamentos</small>
              </span>
            </div>
            <Progress
              value={Math.min(
                100,
                (all.filter((p) => p.moduleId === 'foundations' && solved.includes(p.id)).length /
                  3) *
                  100,
              )}
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
