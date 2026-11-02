import { useEffect, useRef, useState, type ComponentType } from 'react';
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Braces,
  ChartNoAxesCombined,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  Clock3,
  Code2,
  ExternalLink,
  Flag,
  FolderKanban,
  GraduationCap,
  Layers3,
  Lightbulb,
  ListChecks,
  LockKeyhole,
  Map,
  Menu,
  Network,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Sprout,
  Target,
  Terminal,
  Users,
  Waypoints,
  X,
} from 'lucide-react';
import { modules, problems, starters } from './lib/catalog';
import {
  downloadJson,
  initialState,
  normalizeClassCode,
  remainingHintSeconds,
  STORAGE_KEY,
  visibleProblems,
} from './lib/domain';
import type { DemoState, Language, Module, Problem } from './lib/types';
import Modal from './components/Modal';
import Visualizer from './components/Visualizer';
import ProblemEditor from './components/ProblemEditor';

type Page = 'overview' | 'roadmap' | 'problems' | 'visuals' | 'classes' | 'teacher' | 'problem';
const pageNames: Record<Page, string> = {
  overview: 'Visão geral',
  roadmap: 'Minha trilha',
  problems: 'Desafios',
  visuals: 'Laboratório visual',
  classes: 'Minhas turmas',
  teacher: 'Painel do professor',
  problem: 'Espaço de prática',
};
function readState(): DemoState {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (
      value?.version === 1 &&
      ['student', 'teacher'].includes(value.role) &&
      Array.isArray(value.classes) &&
      Array.isArray(value.solved) &&
      Array.isArray(value.joinedClassIds) &&
      Array.isArray(value.customProblems) &&
      typeof value.startedAt === 'object' &&
      value.startedAt &&
      value.drafts &&
      value.revealedHints &&
      value.evidence &&
      typeof value.name === 'string'
    )
      return value;
  } catch {
    /* Storage is optional for the demo. */
  }
  return initialState();
}
function readPage(): Page {
  const page = location.hash.slice(1).split('/')[0] as Page;
  return Object.hasOwn(pageNames, page) ? page : 'overview';
}
function TopicIcon({ id, size = 22 }: { id: string; size?: number }) {
  const icons: Record<string, ComponentType<{ size?: number }>> = {
    foundations: Terminal,
    loops: Waypoints,
    arrays: Braces,
    complexity: ChartNoAxesCombined,
    search: Search,
    pointers: Code2,
    structures: Layers3,
    recursion: Network,
    greedy: Sparkles,
    graphs: Network,
    dp: FolderKanban,
    advanced: Flag,
  };
  const Icon = icons[id] ?? Code2;
  return <Icon size={size} />;
}
function Progress({ value }: { value: number }) {
  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-label="Progresso"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div style={{ width: `${value}%` }} />
    </div>
  );
}
const fmt = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

export default function App() {
  const [state, setState] = useState(readState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const [page, setPage] = useState<Page>(readPage);
  const [activeProblem, setActiveProblem] = useState<Problem>(
    () =>
      visibleProblems(problems, readState()).find((p) => p.id === location.hash.split('/')[1]) ??
      problems[0],
  );
  const [modal, setModal] = useState<
    'join' | 'profile' | 'create-class' | 'create-problem' | 'help' | 'report' | null
  >(null);
  const [topic, setTopic] = useState<Module | null>(null);
  const [level, setLevel] = useState('Todos');
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState<Language>('python');
  const [now, setNow] = useState(Date.now());
  const [notice, setNotice] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [problemTab, setProblemTab] = useState<'statement' | 'hints'>('statement');
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      setStorageError(true);
    }
  }, [state]);
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const handle = () => {
      const current = readPage();
      setPage(current);
      if (current === 'problem') {
        const p = visibleProblems(problems, stateRef.current).find(
          (p) => p.id === location.hash.split('/')[1],
        );
        if (p) {
          setActiveProblem(p);
          setState((s) =>
            s.startedAt[p.id] ? s : { ...s, startedAt: { ...s.startedAt, [p.id]: Date.now() } },
          );
        } else {
          setPage('problems');
          location.hash = 'problems';
        }
      }
    };
    handle();
    window.addEventListener('hashchange', handle);
    return () => window.removeEventListener('hashchange', handle);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(t);
  }, [notice]);
  const all = visibleProblems(problems, state);
  const solvedCount = all.filter((p) => state.solved.includes(p.id)).length;
  const percent = Math.round((solvedCount / Math.max(all.length, 1)) * 100);
  const next = all.find((p) => !state.solved.includes(p.id)) ?? all[0];
  const teacher = state.role === 'teacher';
  const myClasses = state.classes.filter((c) => teacher || state.joinedClassIds.includes(c.id));
  function navigate(p: Page, problemId?: string) {
    const hash = p === 'problem' ? `problem/${problemId ?? activeProblem.id}` : p;
    if (location.hash.slice(1) !== hash) location.hash = hash;
    setPage(p);
    setMobileNav(false);
    window.scrollTo({ top: 0 });
  }
  function openProblem(p: Problem) {
    setActiveProblem(p);
    setProblemTab('statement');
    setState((s) => ({
      ...s,
      startedAt: { ...s.startedAt, [p.id]: s.startedAt[p.id] ?? Date.now() },
    }));
    navigate('problem', p.id);
  }
  function announce(message: string) {
    setNotice(message);
  }
  const draftKey = `${activeProblem.id}:${language}`;

  const navItems: { page: Page; label: string; Icon: typeof Map; count?: number }[] = [
    { page: 'overview', label: 'Visão geral', Icon: FolderKanban },
    { page: 'roadmap', label: 'Minha trilha', Icon: Map },
    { page: 'problems', label: 'Desafios', Icon: Code2, count: all.length },
    { page: 'visuals', label: 'Laboratório visual', Icon: Waypoints },
    { page: 'classes', label: 'Minhas turmas', Icon: Users },
  ];
  function ModuleCard({ m, index }: { m: Module; index: number }) {
    const list = all.filter((p) => p.moduleId === m.id);
    const done = list.filter((p) => state.solved.includes(p.id)).length;
    return (
      <button
        className={`topic-card ${m.id === 'foundations' ? 'featured-topic' : ''}`}
        onClick={() => setTopic(m)}
      >
        <div className="topic-card-top">
          <span className={`topic-icon tone-${index % 4}`}>
            <TopicIcon id={m.id} />
          </span>
          <span className="topic-number">{String(index + 1).padStart(2, '0')}</span>
        </div>
        <h3>{m.title}</h3>
        <p>{m.description}</p>
        <div className="topic-card-bottom">
          <span>{list.length ? `${done}/${list.length} desafios` : 'Em preparação'}</span>
          <ArrowUpRight size={17} />
        </div>
        <Progress value={list.length ? (done / list.length) * 100 : 0} />
      </button>
    );
  }
  function ProblemList({ list }: { list: Problem[] }) {
    return (
      <div className="problem-list">
        {list.length === 0 ? (
          <div className="empty">
            <Search size={28} />
            <h3>Nenhum desafio encontrado</h3>
            <p>Tente outro título ou tópico.</p>
          </div>
        ) : (
          list.map((p, i) => (
            <button
              className="problem-row"
              key={p.id}
              onClick={() => {
                setTopic(null);
                openProblem(p);
              }}
            >
              <span className={`problem-status ${state.solved.includes(p.id) ? 'done' : ''}`}>
                {state.solved.includes(p.id) ? <Check size={16} /> : String(i + 1).padStart(2, '0')}
              </span>
              <span className="problem-info">
                <strong>{p.title}</strong>
                <small>
                  {modules.find((m) => m.id === p.moduleId)?.title} <span>· {p.source}</span>
                </small>
              </span>
              <span className={`badge ${p.difficulty === 'Básico' ? 'green' : 'amber'}`}>
                {p.difficulty}
              </span>
              <span className="problem-time">
                <Clock3 size={14} /> {p.minutes} min
              </span>
              <ChevronRight size={18} />
            </button>
          ))
        )}
      </div>
    );
  }

  return (
    <div className="app-shell">
      {mobileNav && (
        <button
          className="nav-backdrop"
          aria-label="Fechar navegação"
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
        <a className="brand" href="#overview" onClick={() => navigate('overview')}>
          <span className="brand-mark">
            <Code2 size={25} />
          </span>
          <span>
            class<span className="brand-light">code</span>
            <small>UM PASSO. UM ALGORITMO.</small>
          </span>
        </a>
        <div className="workspace-label">
          <span className="workspace-icon">
            <GraduationCap size={19} />
          </span>
          <span>
            Espaço de aprendizagem<small>Semestre 2026.2</small>
          </span>
        </div>
        <div className="nav-label">APRENDER</div>
        <nav>
          {navItems.map(({ page: p, label, Icon, count }) => (
            <button
              key={p}
              className={`nav-link ${page === p ? 'active' : ''}`}
              onClick={() => navigate(p)}
            >
              <Icon size={19} />
              <span>{label}</span>
              {count !== undefined && <small>{count}</small>}
              {p === 'visuals' && <i />}
            </button>
          ))}
        </nav>
        {teacher && (
          <>
            <div className="nav-label teacher-label">ENSINAR</div>
            <button
              className={`nav-link ${page === 'teacher' ? 'active' : ''}`}
              onClick={() => navigate('teacher')}
            >
              <ChartNoAxesCombined size={19} />
              <span>Painel do professor</span>
            </button>
          </>
        )}
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Sprout size={25} />
            <h3>Consistência é o caminho.</h3>
            <p>Um desafio por vez. Uma ideia nova todos os dias.</p>
            <button onClick={() => openProblem(next)}>
              Vamos praticar <ArrowRight size={15} />
            </button>
          </div>
          <button className="help-link" onClick={() => setModal('help')}>
            <CircleHelp size={18} /> Como funciona
          </button>
          <button className="profile" onClick={() => setModal('profile')}>
            <span className="avatar">{state.name.slice(0, 2).toUpperCase()}</span>
            <span>
              {state.name}
              <small>{teacher ? 'Professor' : 'Estudante'} · demo local</small>
            </span>
            <Settings2 size={16} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              onClick={() => setMobileNav(!mobileNav)}
              aria-label="Abrir navegação"
            >
              <Menu size={22} />
            </button>
            <span>Meu espaço</span>
            <ChevronRight size={14} />
            <strong>{pageNames[page]}</strong>
          </div>
          <div className="topbar-right">
            <span className="demo-pill">
              <span /> Demonstração local
            </span>
            <button
              className="topbar-avatar"
              aria-label="Alterar perfil da demonstração"
              onClick={() => setModal('profile')}
            >
              {state.name.slice(0, 1).toUpperCase()}
            </button>
          </div>
        </header>
        <main id="main-content">
          {storageError && (
            <p role="alert" className="storage-warning">
              O navegador bloqueou o armazenamento. Suas alterações serão mantidas apenas enquanto
              esta página estiver aberta.
            </p>
          )}
          {page === 'overview' && (
            <>
              <div className="page-title">
                <div>
                  <div className="eyebrow">SEU PRÓXIMO PASSO COMEÇA AQUI</div>
                  <h1>
                    Olá, {state.name}. Vamos evoluir<span className="green-text">?</span>
                  </h1>
                  <p>Do primeiro “olá, mundo” às ideias que resolvem grandes problemas.</p>
                </div>
                <button
                  className="button secondary"
                  onClick={() => setModal(teacher ? 'create-class' : 'join')}
                >
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
                        Entenda a ideia, visualize o algoritmo e<br className="desktop-break" />{' '}
                        transforme conhecimento em código.
                      </p>
                      <button className="button dark" onClick={() => openProblem(next)}>
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
                      <span className="stat-icon mint">
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
                          Sua trilha de aprendizagem{' '}
                          <span className="subtle-badge">PASSO A PASSO</span>
                        </h2>
                        <p>Uma base sólida para chegar mais longe.</p>
                      </div>
                      <button className="text-button" onClick={() => navigate('roadmap')}>
                        Ver trilha completa <ArrowRight size={16} />
                      </button>
                    </div>
                    <div className="topics-grid">
                      {modules.slice(0, 3).map((m, i) => (
                        <ModuleCard m={m} index={i} key={m.id} />
                      ))}
                    </div>
                  </section>
                  <section className="next-section">
                    <div className="section-heading">
                      <div>
                        <h2>Um novo desafio espera por você</h2>
                        <p>Não precisa saber tudo. Só precisa começar.</p>
                      </div>
                      <button className="text-button" onClick={() => navigate('problems')}>
                        Ver todos <ArrowRight size={16} />
                      </button>
                    </div>
                    <ProblemList
                      list={all.filter((p) => !state.solved.includes(p.id)).slice(0, 2)}
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
                      style={{ background: `conic-gradient(var(--green) ${percent}%, #edf0e9 0)` }}
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
                        (all.filter(
                          (p) => p.moduleId === 'foundations' && state.solved.includes(p.id),
                        ).length /
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
                    <button className="button secondary full" onClick={() => navigate('visuals')}>
                      <Waypoints size={16} /> Explorar laboratório <ArrowUpRight size={16} />
                    </button>
                  </section>
                  <section className="class-preview">
                    <div className="class-preview-icon">
                      <GraduationCap size={26} />
                    </div>
                    <h3>Aprender é melhor em turma.</h3>
                    <p>Conecte-se ao seu professor e acompanhe os desafios da disciplina.</p>
                    <button className="text-button" onClick={() => navigate('classes')}>
                      Acessar minhas turmas <ArrowRight size={15} />
                    </button>
                  </section>
                  <div className="aside-footnote">
                    <LockKeyhole size={13} /> Seus rascunhos ficam neste navegador.
                  </div>
                </aside>
              </div>
            </>
          )}

          {page === 'roadmap' && (
            <>
              <div className="page-title">
                <div>
                  <div className="eyebrow">UM CAMINHO, MUITAS DESCOBERTAS</div>
                  <h1>Do primeiro passo ao próximo nível.</h1>
                  <p>
                    Explore a trilha. Os pré-requisitos sugerem uma ordem, sem bloquear sua
                    curiosidade.
                  </p>
                </div>
              </div>
              <div className="roadmap-banner">
                <span className="topic-icon mint">
                  <Map size={25} />
                </span>
                <div>
                  <strong>{modules.length} etapas conectadas pela aprendizagem</strong>
                  <p>
                    As primeiras {new Set(all.map((p) => p.moduleId)).size} etapas já têm desafios.
                    As demais compõem o plano de conteúdo.
                  </p>
                </div>
                <span className="badge green">{all.length} desafios</span>
              </div>
              <div className="filter-row">
                <div className="segmented">
                  {['Todos', 'Fundamentos', 'Intermediário', 'Avançado'].map((v) => (
                    <button
                      key={v}
                      className={level === v ? 'selected' : ''}
                      onClick={() => setLevel(v)}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <span className="muted">Selecione uma etapa para explorar</span>
              </div>
              <div className="roadmap-grid">
                {modules
                  .filter((m) => level === 'Todos' || m.level === level)
                  .map((m) => (
                    <ModuleCard m={m} index={modules.indexOf(m)} key={m.id} />
                  ))}
              </div>
            </>
          )}

          {page === 'problems' && (
            <>
              <div className="page-title">
                <div>
                  <div className="eyebrow">APRENDA FAZENDO</div>
                  <h1>Ideias que viram código.</h1>
                  <p>Desafios com objetivos claros e a ajuda certa, na hora certa.</p>
                </div>
                {teacher && (
                  <button className="button primary" onClick={() => setModal('create-problem')}>
                    <Plus size={17} /> Criar desafio
                  </button>
                )}
              </div>
              <div className="filter-row">
                <label className="search-field">
                  <Search size={18} />
                  <input
                    aria-label="Buscar desafios"
                    placeholder="Buscar por título ou tópico..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <span className="muted">{all.length} desafios disponíveis</span>
              </div>
              <div className="list-header">
                <span>DESAFIO / TÓPICO</span>
                <span>DIFICULDADE & TEMPO</span>
              </div>
              <ProblemList
                list={all.filter((p) =>
                  `${p.title} ${modules.find((m) => m.id === p.moduleId)?.title}`
                    .toLocaleLowerCase()
                    .includes(query.toLocaleLowerCase()),
                )}
              />
              <div className="info-strip">
                <Lightbulb size={19} />
                <p>
                  Dicas progressivas são liberadas após <strong>3, 7 e 12 minutos</strong> de
                  tentativa. O tempo começa quando você abre o desafio.
                </p>
              </div>
            </>
          )}

          {page === 'visuals' && (
            <>
              <div className="page-title">
                <div>
                  <div className="eyebrow">ALÉM DAS LINHAS DE CÓDIGO</div>
                  <h1>Veja. Pause. Entenda.</h1>
                  <p>
                    Acompanhe cada comparação e descubra o que acontece entre a entrada e a
                    resposta.
                  </p>
                </div>
                <span className="badge green">2 experiências interativas</span>
              </div>
              <div className="lab-layout">
                <section className="card">
                  <Visualizer />
                </section>
                <aside className="card lab-notes">
                  <span className="topic-icon peach">
                    <Lightbulb size={24} />
                  </span>
                  <h2>Primeiro, faça uma previsão.</h2>
                  <p>Antes de avançar um passo, tente responder:</p>
                  <ol>
                    <li>Quais valores serão comparados?</li>
                    <li>O que muda depois dessa comparação?</li>
                    <li>Que parte do problema já está resolvida?</li>
                  </ol>
                  <div className="info-strip">
                    <BookOpen size={19} />
                    <p>
                      A animação mostra um algoritmo predefinido. Compare os passos com o seu
                      raciocínio.
                    </p>
                  </div>
                  <button
                    className="button secondary full"
                    onClick={() => openProblem(problems.find((p) => p.id === 'binary')!)}
                  >
                    Praticar busca binária <ArrowRight size={16} />
                  </button>
                </aside>
              </div>
            </>
          )}

          {page === 'classes' && (
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
                <button
                  className="button primary"
                  onClick={() => setModal(teacher ? 'create-class' : 'join')}
                >
                  <Plus size={17} /> {teacher ? 'Criar turma' : 'Entrar em uma turma'}
                </button>
              </div>
              <div className="class-grid">
                {myClasses.map((c) => (
                  <section className="card classroom-card" key={c.id}>
                    <div className="classroom-top">
                      <span className="topic-icon mint">
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
                            .then(() => announce('Código da turma copiado.'))
                            .catch(() => announce(`Código da turma: ${c.code}`));
                        }}
                      >
                        <Braces size={19} />
                      </button>
                    </div>
                    <div className="class-challenges">
                      <strong>Desafios da turma</strong>
                      {(c.id === 'demo-class'
                        ? all.filter((p) => !p.authorClassId || p.authorClassId === c.id)
                        : all.filter((p) => p.authorClassId === c.id)
                      ).map((p) => (
                        <button key={p.id} onClick={() => openProblem(p)}>
                          <span>{p.title}</span>
                          <ChevronRight size={16} />
                        </button>
                      ))}
                      {c.id !== 'demo-class' && !all.some((p) => p.authorClassId === c.id) && (
                        <p className="helper">O primeiro desafio ainda será publicado.</p>
                      )}
                    </div>
                  </section>
                ))}
              </div>
              <div className="info-strip">
                <CircleHelp size={19} />
                <p>
                  Nesta demonstração, turmas e participações são locais. Para experimentar a
                  entrada, use <strong>CLASS26</strong>. Códigos criados aqui só existem neste
                  navegador.
                </p>
              </div>
            </>
          )}

          {page === 'teacher' &&
            (teacher ? (
              <>
                <div className="page-title">
                  <div>
                    <div className="eyebrow">ENSINAR É ABRIR CAMINHOS</div>
                    <h1>Aprendizagem com direção.</h1>
                    <p>
                      Prepare os próximos desafios e acompanhe o protótipo pela perspectiva do
                      professor.
                    </p>
                  </div>
                  <button className="button primary" onClick={() => setModal('create-problem')}>
                    <Plus size={17} /> Criar desafio
                  </button>
                </div>
                <div className="teacher-stats">
                  <section className="card">
                    <Users />
                    <strong>{state.classes.length}</strong>
                    <span>Turmas na demonstração</span>
                  </section>
                  <section className="card">
                    <Code2 />
                    <strong>{state.customProblems.length}</strong>
                    <span>Desafios autorais criados</span>
                  </section>
                  <section className="card">
                    <ListChecks />
                    <strong>{solvedCount}</strong>
                    <span>Conclusões locais declaradas</span>
                  </section>
                </div>
                <div className="teacher-layout">
                  <section className="card teacher-actions">
                    <h2>Prepare sua próxima aula</h2>
                    <p>O mesmo formato pedagógico em cada desafio.</p>
                    <button onClick={() => setModal('create-class')}>
                      <span className="topic-icon mint">
                        <Users />
                      </span>
                      <span>
                        <strong>Criar uma turma</strong>
                        <small>Nome, semestre e código de convite</small>
                      </span>
                      <Plus size={19} />
                    </button>
                    <button onClick={() => setModal('create-problem')}>
                      <span className="topic-icon peach">
                        <Braces />
                      </span>
                      <span>
                        <strong>Publicar um desafio</strong>
                        <small>Objetivo, exemplos e dicas progressivas</small>
                      </span>
                      <Plus size={19} />
                    </button>
                    <button
                      onClick={() =>
                        downloadJson(
                          { classes: state.classes, problems: state.customProblems },
                          'classcode-conteudo.json',
                        )
                      }
                    >
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
                      Autenticação institucional, autorização e acompanhamento de alunos serão
                      conectados ao backend. Este painel exibe apenas dados deste navegador.
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
                <div className="section-heading">
                  <h2>Seus desafios publicados</h2>
                </div>
                {state.customProblems.length ? (
                  <ProblemList list={state.customProblems} />
                ) : (
                  <div className="empty card">
                    <Code2 size={30} />
                    <h3>O próximo desafio começa com você.</h3>
                    <p>Crie sua primeira questão seguindo o padrão ClassCode.</p>
                    <button className="button secondary" onClick={() => setModal('create-problem')}>
                      Criar primeiro desafio <Plus size={16} />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="empty card">
                <LockKeyhole size={30} />
                <h1>Perspectiva do professor</h1>
                <p>Altere o perfil da demonstração para explorar este painel.</p>
                <button className="button primary" onClick={() => setModal('profile')}>
                  Alterar perfil
                </button>
              </div>
            ))}

          {page === 'problem' && (
            <>
              <button className="text-button back-button" onClick={() => navigate('problems')}>
                <ArrowLeft size={16} /> Voltar aos desafios
              </button>
              <div className="problem-title">
                <div>
                  <div className="eyebrow">
                    {modules.find((m) => m.id === activeProblem.moduleId)?.title}
                  </div>
                  <h1>{activeProblem.title}</h1>
                  <p>{activeProblem.objective}</p>
                </div>
                <div className="problem-title-meta">
                  <span className="badge green">{activeProblem.difficulty}</span>
                  <span>
                    <Clock3 size={16} />{' '}
                    {fmt(
                      Math.floor(
                        Math.max(0, now - (state.startedAt[activeProblem.id] ?? now)) / 1000,
                      ),
                    )}
                  </span>
                </div>
              </div>
              <div className="workspace-grid">
                <section className="card statement-card">
                  <div className="tabs">
                    <button
                      className={problemTab === 'statement' ? 'selected' : ''}
                      onClick={() => setProblemTab('statement')}
                    >
                      <BookOpen size={17} /> Enunciado
                    </button>
                    <button
                      className={problemTab === 'hints' ? 'selected' : ''}
                      onClick={() => setProblemTab('hints')}
                    >
                      <Lightbulb size={17} /> Dicas progressivas
                    </button>
                  </div>
                  {problemTab === 'statement' ? (
                    <div className="statement-content">
                      <span className="source-label">{activeProblem.source}</span>
                      <p>{activeProblem.statement}</p>
                      <h3>Entrada</h3>
                      <p>{activeProblem.input}</p>
                      <h3>Saída</h3>
                      <p>{activeProblem.output}</p>
                      <h3>Restrições</h3>
                      <p className="mono">{activeProblem.constraints}</p>
                      <div className="example-grid">
                        <div>
                          <h3>Exemplo de entrada</h3>
                          <pre>{activeProblem.exampleInput}</pre>
                        </div>
                        <div>
                          <h3>Exemplo de saída</h3>
                          <pre>{activeProblem.exampleOutput}</pre>
                        </div>
                      </div>
                      {activeProblem.externalUrl && (
                        <a
                          href={activeProblem.externalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="button secondary full"
                        >
                          Abrir problema no judge <ExternalLink size={16} />
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="hints-content">
                      <p className="helper">
                        Dê tempo ao seu raciocínio. As dicas são liberadas desde a abertura do
                        desafio, mesmo se você sair desta tela. O cronômetro local é apenas
                        demonstrativo.
                      </p>
                      {activeProblem.hints.map((hint, i) => {
                        const remaining = remainingHintSeconds(
                          hint,
                          state.startedAt[activeProblem.id],
                          now,
                        );
                        const revealed = state.revealedHints[activeProblem.id]?.includes(i);
                        return (
                          <div className="hint-card" key={i}>
                            <div>
                              <span className="hint-number">{i + 1}</span>
                              <strong>
                                {['Uma direção', 'Uma estratégia', 'Mais perto da solução'][i]}
                              </strong>
                              <span className="mono">
                                {remaining > 0 ? fmt(remaining) : 'Disponível'}
                              </span>
                            </div>
                            {revealed ? (
                              <p>{hint.text}</p>
                            ) : (
                              <button
                                className="button secondary full"
                                disabled={remaining > 0}
                                onClick={() =>
                                  setState((s) => ({
                                    ...s,
                                    revealedHints: {
                                      ...s.revealedHints,
                                      [activeProblem.id]: [
                                        ...(s.revealedHints[activeProblem.id] ?? []),
                                        i,
                                      ],
                                    },
                                  }))
                                }
                              >
                                {remaining ? <LockKeyhole size={15} /> : <Lightbulb size={15} />}
                                {remaining
                                  ? `Libera após ${hint.afterSeconds / 60} min`
                                  : 'Revelar dica'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
                <section className="card code-panel">
                  <div className="code-toolbar">
                    <span>
                      <Code2 size={17} /> Seu rascunho
                    </span>
                    <label className="sr-only" htmlFor="language">
                      Linguagem
                    </label>
                    <select
                      id="language"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as Language)}
                    >
                      <option value="python">Python 3</option>
                      <option value="java">Java</option>
                      <option value="cpp">C++17</option>
                    </select>
                  </div>
                  <div className="editor">
                    <div className="line-numbers" aria-hidden="true">
                      {(state.drafts[draftKey] ?? starters[language]).split('\n').map((_, i) => (
                        <span key={i}>{i + 1}</span>
                      ))}
                    </div>
                    <textarea
                      aria-label="Editor de código"
                      spellCheck={false}
                      value={state.drafts[draftKey] ?? starters[language]}
                      onChange={(e) => {
                        const value = e.target.value;
                        setState((s) => ({ ...s, drafts: { ...s.drafts, [draftKey]: value } }));
                      }}
                    />
                  </div>
                  <div className="editor-footer">
                    <span>
                      <span className="tiny-dot" /> Rascunho{' '}
                      {storageError ? 'em memória' : 'salvo localmente'}
                    </span>
                    <span>UTF-8</span>
                  </div>
                  <div className="submission-area">
                    <div className="submission-info">
                      <CircleHelp size={18} />
                      <p>
                        O editor ainda não executa código.{' '}
                        {activeProblem.externalUrl
                          ? 'Envie sua solução no judge e registre seu progresso aqui.'
                          : 'Valide sua solução com seu professor e registre seu progresso.'}
                      </p>
                    </div>
                    <button
                      className={`button ${state.solved.includes(activeProblem.id) ? 'secondary' : 'primary'} full`}
                      onClick={() => setModal('report')}
                    >
                      {state.solved.includes(activeProblem.id) ? (
                        <Check size={17} />
                      ) : (
                        <CheckCheck size={17} />
                      )}
                      {state.solved.includes(activeProblem.id)
                        ? 'Conclusão declarada · ver registro'
                        : 'Registrar conclusão'}
                    </button>
                    <button className="text-button" onClick={() => navigate('visuals')}>
                      Abrir laboratório visual <ArrowUpRight size={15} />
                    </button>
                  </div>
                </section>
              </div>
            </>
          )}
          <footer className="page-footer">
            <span>
              classcode <span>· Aprender é um processo.</span>
            </span>
            <span>Feito para quem ensina e para quem descobre.</span>
          </footer>
        </main>
      </div>

      {topic && (
        <Modal title={topic.title} onClose={() => setTopic(null)} wide>
          <div className="topic-modal-intro">
            <span className="topic-icon mint">
              <TopicIcon id={topic.id} size={27} />
            </span>
            <p>{topic.description}</p>
          </div>
          <p className="helper">
            Pré-requisitos sugeridos:{' '}
            {topic.prerequisites.length
              ? topic.prerequisites.map((id) => modules.find((m) => m.id === id)?.title).join(' · ')
              : 'Nenhum. Você pode começar aqui.'}
          </p>
          {all.some((p) => p.moduleId === topic.id) ? (
            <ProblemList list={all.filter((p) => p.moduleId === topic.id)} />
          ) : (
            <div className="empty">
              <Sprout size={30} />
              <h3>Uma nova etapa está sendo preparada.</h3>
              <p>
                O tópico faz parte do currículo planejado. Professores já podem criar desafios para
                ele na demonstração.
              </p>
              {teacher && (
                <button
                  className="button primary"
                  onClick={() => {
                    setTopic(null);
                    setModal('create-problem');
                  }}
                >
                  Criar um desafio
                </button>
              )}
            </div>
          )}
        </Modal>
      )}
      {modal === 'profile' && (
        <Modal title="Explore o ClassCode" onClose={() => setModal(null)}>
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const role = String(data.get('role')) as DemoState['role'];
              setState((s) => ({ ...s, name: String(data.get('name')).trim(), role }));
              setModal(null);
              navigate(role === 'teacher' ? 'teacher' : 'overview');
              announce('Perfil da demonstração alterado.');
            }}
          >
            <p className="helper">
              Experimente as duas perspectivas. Este seletor é uma demonstração de interface, sem
              autenticação. Todos os dados são compartilhados somente neste navegador.
            </p>
            <label>
              Como podemos chamar você?
              <input name="name" required maxLength={30} defaultValue={state.name} />
            </label>
            <label>
              Perspectiva
              <select name="role" defaultValue={state.role}>
                <option value="student">Estudante</option>
                <option value="teacher">Professor</option>
              </select>
            </label>
            <button type="submit" className="button primary">
              Acessar demonstração <ArrowRight size={16} />
            </button>
          </form>
        </Modal>
      )}
      {modal === 'join' && (
        <Modal title="Encontre a sua turma" onClose={() => setModal(null)}>
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.elements.namedItem('code') as HTMLInputElement;
              const c = state.classes.find((c) => c.code === normalizeClassCode(input.value));
              if (!c) {
                input.setCustomValidity(
                  'Código não encontrado neste navegador. Experimente CLASS26.',
                );
                input.reportValidity();
                return;
              }
              setState((s) => ({
                ...s,
                joinedClassIds: [...new Set([...s.joinedClassIds, c.id])],
              }));
              setModal(null);
              navigate('classes');
              announce(`Você está na turma ${c.name}.`);
            }}
          >
            <p className="helper">
              Digite o código enviado pelo professor. Na demonstração, use CLASS26 ou o código de
              uma turma criada neste navegador.
            </p>
            <label>
              Código da turma
              <input
                name="code"
                required
                placeholder="Ex.: CLASS26"
                maxLength={20}
                onInput={(e) => e.currentTarget.setCustomValidity('')}
                autoComplete="off"
              />
            </label>
            <button className="button primary" type="submit">
              Entrar na turma <ArrowRight size={16} />
            </button>
          </form>
        </Modal>
      )}
      {modal === 'create-class' && teacher && (
        <Modal title="Um novo espaço para aprender" onClose={() => setModal(null)}>
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              const c = {
                id: crypto.randomUUID(),
                name: String(d.get('name')).trim(),
                code: crypto.randomUUID().slice(0, 8).toUpperCase(),
                teacher: state.name,
                term: String(d.get('term')).trim(),
              };
              setState((s) => ({ ...s, classes: [...s.classes, c] }));
              setModal(null);
              navigate('classes');
              announce(`Turma criada. Código: ${c.code}`);
            }}
          >
            <label>
              Nome da turma
              <input
                name="name"
                required
                maxLength={100}
                placeholder="Ex.: Estruturas de dados · Turma A"
              />
            </label>
            <label>
              Semestre
              <input name="term" required defaultValue="2026.2" maxLength={20} />
            </label>
            <p className="helper">
              Um código será gerado automaticamente. A turma ficará salva neste navegador.
            </p>
            <button type="submit" className="button primary">
              Criar turma <Plus size={16} />
            </button>
          </form>
        </Modal>
      )}
      {modal === 'create-problem' && teacher && (
        <Modal title="Um desafio com propósito" onClose={() => setModal(null)} wide>
          <ProblemEditor
            classes={state.classes}
            onSave={(p) => {
              setState((s) => ({ ...s, customProblems: [...s.customProblems, p] }));
              setModal(null);
              navigate('teacher');
              announce('Desafio publicado na demonstração.');
            }}
          />
        </Modal>
      )}
      {modal === 'report' && (
        <Modal title="Registre sua aprendizagem" onClose={() => setModal(null)}>
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              setState((s) => ({
                ...s,
                solved: [...new Set([...s.solved, activeProblem.id])],
                evidence: { ...s.evidence, [activeProblem.id]: String(d.get('evidence')).trim() },
              }));
              setModal(null);
              announce('Conclusão autodeclarada registrada. Continue aprendendo!');
            }}
          >
            <p>
              Desafio: <strong>{activeProblem.title}</strong>
            </p>
            <p className="helper">
              Este registro é autodeclarado. Ele não equivale a um Accepted do judge e não deve ser
              usado como nota automática.
            </p>
            <label>
              Link da submissão ou reflexão sobre a solução
              <textarea
                name="evidence"
                required
                rows={3}
                maxLength={2000}
                defaultValue={state.evidence[activeProblem.id] ?? ''}
                placeholder="Como você resolveu? O que aprendeu?"
              />
            </label>
            <label className="checkbox-label">
              <input type="checkbox" required /> Confirmei minha solução no judge ou com o
              professor.
            </label>
            <button type="submit" className="button primary">
              Salvar conclusão declarada <Check size={16} />
            </button>
            {state.solved.includes(activeProblem.id) && (
              <button
                type="button"
                className="text-button danger"
                onClick={() => {
                  setState((s) => ({
                    ...s,
                    solved: s.solved.filter((id) => id !== activeProblem.id),
                  }));
                  setModal(null);
                  announce('Desafio reaberto para praticar.');
                }}
              >
                Reabrir desafio
              </button>
            )}
          </form>
        </Modal>
      )}
      {modal === 'help' && (
        <Modal title="Uma ideia de cada vez" onClose={() => setModal(null)}>
          <div className="help-content">
            <span className="topic-icon mint">
              <Sprout size={28} />
            </span>
            <h3>Explore. Experimente. Evolua.</h3>
            <p>
              Comece pela trilha, abra um desafio e construa sua solução. Três dicas são liberadas
              em 3, 7 e 12 minutos para ajudar sem antecipar toda a resposta.
            </p>
            <p>
              Use o laboratório para observar algoritmos passo a passo. O editor guarda rascunhos em
              Python, Java e C++; a avaliação acontece no judge externo ou com o professor.
            </p>
            <p>
              Para conhecer a gestão de turmas, altere a perspectiva para professor no botão de
              perfil.
            </p>
            <div className="info-strip">
              <LockKeyhole size={20} />
              <p>
                Esta é uma base navegável, com dados locais. Login real, isolamento entre usuários e
                correção automática estão no plano de desenvolvimento.
              </p>
            </div>
            <a
              className="button secondary full"
              href="https://github.com/MarcusCSPereira/ClassCode"
              target="_blank"
              rel="noreferrer"
            >
              Conhecer o projeto <ArrowUpRight size={16} />
            </a>
          </div>
        </Modal>
      )}
      {notice && (
        <div role="status" className="toast">
          <Check size={18} />
          <span>{notice}</span>
          <button className="icon-button" aria-label="Fechar aviso" onClick={() => setNotice('')}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
