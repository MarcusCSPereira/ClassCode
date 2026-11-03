import { Plus } from 'lucide-react';
import Modal from '../components/Modal';
export default function CreateClassModal({
  onCreate,
  onClose,
}: {
  onCreate: (name: string, term: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal title="Um novo espaço para aprender" onClose={onClose}>
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          onCreate(String(d.get('name')).trim(), String(d.get('term')).trim());
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
  );
}
