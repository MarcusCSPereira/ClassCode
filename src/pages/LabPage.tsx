import { ArrowRight, BookOpen, Lightbulb } from 'lucide-react';
import { problems } from '../lib/catalog';
import type { Problem } from '../lib/types';
import Visualizer from '../components/Visualizer';
export default function LabPage({ onOpenProblem }: { onOpenProblem: (p: Problem) => void }) {
  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">ALÉM DAS LINHAS DE CÓDIGO</div>
          <h1>Veja. Pause. Entenda.</h1>
          <p>Acompanhe cada comparação e descubra o que acontece entre a entrada e a resposta.</p>
        </div>
        <span className="badge blue">2 experiências interativas</span>
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
              A animação mostra um algoritmo predefinido. Compare os passos com o seu raciocínio.
            </p>
          </div>
          <button
            className="button secondary full"
            onClick={() => onOpenProblem(problems.find((p) => p.id === 'binary')!)}
          >
            Praticar busca binária <ArrowRight size={16} />
          </button>
        </aside>
      </div>
    </>
  );
}
