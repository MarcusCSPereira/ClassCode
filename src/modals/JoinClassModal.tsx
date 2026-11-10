import { ArrowRight } from 'lucide-react';
import Modal from '../components/Modal';
export default function JoinClassModal({
  onJoin,
  onClose,
  remote = false,
}: {
  /** Resolves to an error message for the code field, or null after joining. */
  onJoin: (code: string) => Promise<string | null>;
  onClose: () => void;
  remote?: boolean;
}) {
  return (
    <Modal title="Encontre a sua turma" onClose={onClose}>
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          const input = e.currentTarget.elements.namedItem('code') as HTMLInputElement;
          const error = await onJoin(input.value);
          if (error) {
            input.setCustomValidity(error);
            input.reportValidity();
          }
        }}
      >
        <p className="helper">
          {remote
            ? 'Digite o código de convite enviado pelo professor.'
            : 'Digite o código enviado pelo professor. Na demonstração, use CLASS26 ou o código de uma turma criada neste navegador.'}
        </p>
        <label>
          Código da turma
          <input
            name="code"
            required
            placeholder={remote ? 'Cole o código recebido' : 'Ex.: CLASS26'}
            maxLength={remote ? 64 : 20}
            onInput={(e) => e.currentTarget.setCustomValidity('')}
            autoComplete="off"
          />
        </label>
        <button className="button primary" type="submit">
          Entrar na turma <ArrowRight size={16} />
        </button>
      </form>
    </Modal>
  );
}
