import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  CircleHelp,
  Code2,
  FolderKanban,
  GraduationCap,
  Map,
  Menu,
  Moon,
  Settings2,
  Sprout,
  Sun,
  Users,
  Waypoints,
  X,
} from 'lucide-react';
import { problems } from './lib/catalog';
import {
  downloadJson,
  initialState,
  normalizeClassCode,
  STORAGE_KEY,
  visibleProblems,
} from './lib/domain';
import { pageNames, problemIdFromHash, readPage, type Page } from './lib/navigation';
import type { DemoState, Language, Module, Problem, Role } from './lib/types';
import { useTheme } from './lib/useTheme';
import Modal from './components/Modal';
import ProblemEditor from './components/ProblemEditor';
import ClassesPage from './pages/ClassesPage';
import LabPage from './pages/LabPage';
import OverviewPage from './pages/OverviewPage';
import ProblemPage, { type ProblemTab } from './pages/ProblemPage';
import ProblemsPage from './pages/ProblemsPage';
import RoadmapPage from './pages/RoadmapPage';
import TeacherPage from './pages/TeacherPage';
import CreateClassModal from './modals/CreateClassModal';
import HelpModal from './modals/HelpModal';
import JoinClassModal from './modals/JoinClassModal';
import ProfileModal from './modals/ProfileModal';
import ReportModal from './modals/ReportModal';
import TopicModal from './modals/TopicModal';

type ModalName = 'join' | 'profile' | 'create-class' | 'create-problem' | 'help' | 'report';
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

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [state, setState] = useState(readState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const [page, setPage] = useState<Page>(readPage);
  const [activeProblem, setActiveProblem] = useState<Problem>(
    () =>
      visibleProblems(problems, readState()).find((p) => p.id === problemIdFromHash()) ??
      problems[0],
  );
  const [modal, setModal] = useState<ModalName | null>(null);
  const [topic, setTopic] = useState<Module | null>(null);
  const [language, setLanguage] = useState<Language>('python');
  const [notice, setNotice] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [problemTab, setProblemTab] = useState<ProblemTab>('statement');
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      setStorageError(true);
    }
  }, [state]);
  useEffect(() => {
    const handle = () => {
      const current = readPage();
      setPage(current);
      if (current === 'problem') {
        const p = visibleProblems(problems, stateRef.current).find(
          (p) => p.id === problemIdFromHash(),
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
    setTopic(null);
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
            <button
              className="icon-button theme-toggle"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
              title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
              aria-pressed={theme === 'dark'}
            >
              {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
            </button>
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
            <OverviewPage
              name={state.name}
              teacher={teacher}
              problems={all}
              solved={state.solved}
              next={next}
              onOpenProblem={openProblem}
              onNavigate={navigate}
              onPrimaryAction={() => setModal(teacher ? 'create-class' : 'join')}
              onSelectTopic={setTopic}
            />
          )}
          {page === 'roadmap' && (
            <RoadmapPage problems={all} solved={state.solved} onSelectTopic={setTopic} />
          )}
          {page === 'problems' && (
            <ProblemsPage
              problems={all}
              solved={state.solved}
              teacher={teacher}
              onCreateProblem={() => setModal('create-problem')}
              onOpenProblem={openProblem}
            />
          )}
          {page === 'visuals' && <LabPage onOpenProblem={openProblem} />}
          {page === 'classes' && (
            <ClassesPage
              teacher={teacher}
              classes={myClasses}
              problems={all}
              onPrimaryAction={() => setModal(teacher ? 'create-class' : 'join')}
              onOpenProblem={openProblem}
              onAnnounce={announce}
            />
          )}
          {page === 'teacher' && (
            <TeacherPage
              teacher={teacher}
              classCount={state.classes.length}
              customProblems={state.customProblems}
              solvedCount={solvedCount}
              solved={state.solved}
              onCreateClass={() => setModal('create-class')}
              onCreateProblem={() => setModal('create-problem')}
              onExport={() =>
                downloadJson(
                  { classes: state.classes, problems: state.customProblems },
                  'classcode-conteudo.json',
                )
              }
              onOpenProblem={openProblem}
              onChangeProfile={() => setModal('profile')}
            />
          )}
          {page === 'problem' && (
            <ProblemPage
              problem={activeProblem}
              startedAt={state.startedAt[activeProblem.id]}
              revealedHints={state.revealedHints[activeProblem.id] ?? []}
              solved={state.solved.includes(activeProblem.id)}
              draft={state.drafts[draftKey]}
              language={language}
              theme={theme}
              storageError={storageError}
              tab={problemTab}
              onTabChange={setProblemTab}
              onLanguageChange={setLanguage}
              onDraftChange={(value) =>
                setState((s) => ({ ...s, drafts: { ...s.drafts, [draftKey]: value } }))
              }
              onRevealHint={(i) =>
                setState((s) => ({
                  ...s,
                  revealedHints: {
                    ...s.revealedHints,
                    [activeProblem.id]: [...(s.revealedHints[activeProblem.id] ?? []), i],
                  },
                }))
              }
              onReport={() => setModal('report')}
              onBack={() => navigate('problems')}
              onOpenLab={() => navigate('visuals')}
            />
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
        <TopicModal
          topic={topic}
          problems={all}
          solved={state.solved}
          teacher={teacher}
          onOpenProblem={openProblem}
          onCreateProblem={() => {
            setTopic(null);
            setModal('create-problem');
          }}
          onClose={() => setTopic(null)}
        />
      )}
      {modal === 'profile' && (
        <ProfileModal
          name={state.name}
          role={state.role}
          onSubmit={(name: string, role: Role) => {
            setState((s) => ({ ...s, name, role }));
            setModal(null);
            navigate(role === 'teacher' ? 'teacher' : 'overview');
            announce('Perfil da demonstração alterado.');
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'join' && (
        <JoinClassModal
          onJoin={async (code) => {
            const c = state.classes.find((c) => c.code === normalizeClassCode(code));
            if (!c) return 'Código não encontrado neste navegador. Experimente CLASS26.';
            setState((s) => ({
              ...s,
              joinedClassIds: [...new Set([...s.joinedClassIds, c.id])],
            }));
            setModal(null);
            navigate('classes');
            announce(`Você está na turma ${c.name}.`);
            return null;
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'create-class' && teacher && (
        <CreateClassModal
          onCreate={(name, term) => {
            const c = {
              id: crypto.randomUUID(),
              name,
              code: crypto.randomUUID().slice(0, 8).toUpperCase(),
              teacher: state.name,
              term,
            };
            setState((s) => ({ ...s, classes: [...s.classes, c] }));
            setModal(null);
            navigate('classes');
            announce(`Turma criada. Código: ${c.code}`);
          }}
          onClose={() => setModal(null)}
        />
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
        <ReportModal
          problemTitle={activeProblem.title}
          evidence={state.evidence[activeProblem.id]}
          solved={state.solved.includes(activeProblem.id)}
          onSave={(evidence) => {
            setState((s) => ({
              ...s,
              solved: [...new Set([...s.solved, activeProblem.id])],
              evidence: { ...s.evidence, [activeProblem.id]: evidence },
            }));
            setModal(null);
            announce('Conclusão autodeclarada registrada. Continue aprendendo!');
          }}
          onReopen={() => {
            setState((s) => ({
              ...s,
              solved: s.solved.filter((id) => id !== activeProblem.id),
            }));
            setModal(null);
            announce('Desafio reaberto para praticar.');
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'help' && <HelpModal onClose={() => setModal(null)} />}
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
