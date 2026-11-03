import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
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
import { demoStore, repository } from './data';
import { FICTITIOUS_CLASS } from './data/fictitiousClass';
import { describeError, RepositoryError, type ProblemSummary } from './data/repository';
import type { ActivityRow } from './data/repository';
import { modules, problems } from './lib/catalog';
import { downloadJson, visibleProblems } from './lib/domain';
import { currentModule, moduleStatuses, recommendNext } from './lib/progression';
import { pageNames, problemIdFromHash, readPage, type Page } from './lib/navigation';
import type { Language, Module, Role } from './lib/types';
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

export default function App() {
  const { theme, toggleTheme } = useTheme();
  // Reads still come from the local snapshot; CC-03 moves them to repository calls.
  const state = useSyncExternalStore(demoStore.subscribe, demoStore.getSnapshot);
  const storageError = demoStore.storageError();
  const [page, setPage] = useState<Page>(readPage);
  const [activeProblem, setActiveProblem] = useState<ProblemSummary>(
    () =>
      visibleProblems(problems, demoStore.getSnapshot()).find(
        (p) => p.id === problemIdFromHash(),
      ) ?? problems[0],
  );
  const [modal, setModal] = useState<ModalName | null>(null);
  const [topic, setTopic] = useState<Module | null>(null);
  const [language, setLanguage] = useState<Language>('python');
  const [notice, setNotice] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [problemTab, setProblemTab] = useState<ProblemTab>('statement');
  const fail = (error: unknown) => setNotice(describeError(error));
  useEffect(() => {
    const handle = () => {
      const current = readPage();
      setPage(current);
      if (current === 'problem') {
        const p = visibleProblems(problems, demoStore.getSnapshot()).find(
          (p) => p.id === problemIdFromHash(),
        );
        if (p) {
          setActiveProblem(p);
          repository.startAttempt(p.id).catch(fail);
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
  // The trail reacts to attempts, hint views and reports; drafts and names do not affect it.
  const [activity, setActivity] = useState<ActivityRow[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    repository.myActivity().then((rows) => {
      if (!cancelled) setActivity(rows);
    }, fail);
    return () => {
      cancelled = true;
    };
  }, [state.startedAt, state.hintViews, state.reports]);
  const all = visibleProblems(problems, state);
  const solved = Object.keys(state.reports);
  const solvedCount = all.filter((p) => solved.includes(p.id)).length;
  const progress = moduleStatuses(modules, all, activity ?? []);
  const current = activity && currentModule(modules, progress);
  const recommendation = activity && recommendNext(modules, all, activity);
  const recommended = recommendation && all.find((p) => p.id === recommendation.problemId);
  // A new function when the activity changes makes the teacher panel reload.
  const loadClassroomActivity = useCallback(
    (classroomId: string) => repository.classroomActivity(classroomId),
    [state.startedAt, state.hintViews, state.reports, state.name, state.joinedClassIds],
  );
  const teacher = state.role === 'teacher';
  const myClasses = state.classes.filter((c) => teacher || state.joinedClassIds.includes(c.id));
  function navigate(p: Page, problemId?: string) {
    const hash = p === 'problem' ? `problem/${problemId ?? activeProblem.id}` : p;
    if (location.hash.slice(1) !== hash) location.hash = hash;
    setPage(p);
    setMobileNav(false);
    window.scrollTo({ top: 0 });
  }
  function openProblem(p: ProblemSummary) {
    setTopic(null);
    setActiveProblem(p);
    setProblemTab('statement');
    repository.startAttempt(p.id).catch(fail);
    navigate('problem', p.id);
  }
  function announce(message: string) {
    setNotice(message);
  }
  /** Opens the recommended problem; with the trail finished, shows the whole trail. */
  function practice() {
    if (recommended) openProblem(recommended);
    else navigate('roadmap');
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
            <button onClick={practice} disabled={!activity}>
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
              solved={solved}
              loading={!activity}
              progress={progress}
              current={current ?? null}
              recommendation={recommendation ?? null}
              onPractice={practice}
              onOpenProblem={openProblem}
              onNavigate={navigate}
              onPrimaryAction={() => setModal(teacher ? 'create-class' : 'join')}
              onSelectTopic={setTopic}
            />
          )}
          {page === 'roadmap' && (
            <RoadmapPage
              problems={all}
              progress={activity ? progress : null}
              current={current ?? null}
              onSelectTopic={setTopic}
            />
          )}
          {page === 'problems' && (
            <ProblemsPage
              problems={all}
              solved={solved}
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
              classes={[...state.classes, FICTITIOUS_CLASS]}
              problems={all}
              customProblems={state.customProblems}
              solvedCount={solvedCount}
              solved={solved}
              loadActivity={loadClassroomActivity}
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
              key={activeProblem.id}
              problem={activeProblem}
              startedAt={state.startedAt[activeProblem.id]}
              viewedHints={(state.hintViews[activeProblem.id] ?? []).map((v) => v.ordinal)}
              solved={solved.includes(activeProblem.id)}
              draft={state.drafts[draftKey]}
              language={language}
              theme={theme}
              storageError={storageError}
              tab={problemTab}
              onTabChange={setProblemTab}
              onLanguageChange={setLanguage}
              onDraftChange={(value) =>
                // Drafts stay local in every mode; remote drafts are outside the MVP.
                demoStore.update((s) => ({ ...s, drafts: { ...s.drafts, [draftKey]: value } }))
              }
              onRevealHint={(ordinal) =>
                repository.revealHint(activeProblem.id, ordinal).catch((error: unknown) => {
                  fail(error);
                  throw error;
                })
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
          solved={solved}
          progress={activity ? progress[topic.id] : undefined}
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
            // The perspective switch exists only in the demo; CC-02 replaces it with login.
            demoStore.update((s) => ({ ...s, name, role }));
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
            try {
              const id = await repository.joinClassroom(code);
              const joined = (await repository.listClassrooms()).find((c) => c.id === id);
              setModal(null);
              navigate('classes');
              announce(`Você está na turma ${joined?.name}.`);
              return null;
            } catch (error) {
              if (error instanceof RepositoryError && error.code === 'invalid_invite')
                return 'Código não encontrado neste navegador. Experimente CLASS26.';
              return describeError(error);
            }
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'create-class' && teacher && (
        <CreateClassModal
          onCreate={(name, term) =>
            repository.createClassroom(name, term).then(({ code }) => {
              setModal(null);
              navigate('classes');
              announce(`Turma criada. Código: ${code}`);
            }, fail)
          }
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'create-problem' && teacher && (
        <Modal title="Um desafio com propósito" onClose={() => setModal(null)} wide>
          <ProblemEditor
            classes={state.classes}
            onSave={(p) =>
              repository.publishProblem(p).then(() => {
                setModal(null);
                navigate('teacher');
                announce('Desafio publicado na demonstração.');
                return null;
              }, describeError)
            }
          />
        </Modal>
      )}
      {modal === 'report' && (
        <ReportModal
          problemTitle={activeProblem.title}
          evidence={state.reports[activeProblem.id]?.evidence}
          solved={solved.includes(activeProblem.id)}
          onSave={(evidence) =>
            repository.reportProgress(activeProblem.id, evidence).then(() => {
              setModal(null);
              announce('Conclusão autodeclarada registrada. Continue aprendendo!');
            }, fail)
          }
          onReopen={() =>
            repository.reopenProblem(activeProblem.id).then(() => {
              setModal(null);
              announce('Desafio reaberto para praticar.');
            }, fail)
          }
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
