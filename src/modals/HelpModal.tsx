import { ArrowUpRight, LockKeyhole, Sprout } from 'lucide-react';
import Modal from '../components/Modal';
export default function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Uma ideia de cada vez" onClose={onClose}>
      <div className="help-content">
        <span className="topic-icon blue">
          <Sprout size={28} />
        </span>
        <h3>Explore. Experimente. Evolua.</h3>
        <p>
          Comece pela trilha, abra um desafio e construa sua solução. Três dicas são liberadas em 3,
          7 e 12 minutos para ajudar sem antecipar toda a resposta.
        </p>
        <p>
          Use o laboratório para observar algoritmos passo a passo. O editor guarda rascunhos em
          Python, Java e C++; a avaliação acontece no judge externo ou com o professor.
        </p>
        <p>
          Para conhecer a gestão de turmas, altere a perspectiva para professor no botão de perfil.
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
  );
}
