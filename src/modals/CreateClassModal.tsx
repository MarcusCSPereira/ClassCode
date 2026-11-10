import { Plus } from 'lucide-react';
import Modal from '../components/Modal';
export default function CreateClassModal({
  onCreate,
  onClose,
  remote = false,
}: {
  onCreate: (name: string, term: string, importTrail: boolean) => void | Promise<void>;
  onClose: () => void;
  remote?: boolean;
}) {
  return (
    <Modal title="Um novo espaço para aprender" onClose={onClose}>
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          void onCreate(
            String(d.get('name')).trim(),
            String(d.get('term')).trim(),
            d.get('importTrail') === 'on',
          );
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
        {remote && (
          <label className="checkbox-label">
            <input name="importTrail" type="checkbox" defaultChecked /> Importar os 7 desafios da
            trilha-base
          </label>
        )}
        <p className="helper">
          Um código será gerado automaticamente.{' '}
          {remote
            ? 'A turma ficará disponível para os usuários convidados.'
            : 'A turma ficará salva neste navegador.'}
        </p>
        <button type="submit" className="button primary">
          Criar turma <Plus size={16} />
        </button>
      </form>
    </Modal>
  );
}
