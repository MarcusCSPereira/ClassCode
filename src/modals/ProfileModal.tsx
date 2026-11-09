import { ArrowRight } from 'lucide-react';
import type { Role } from '../lib/types';
import Modal from '../components/Modal';
export default function ProfileModal({
  name,
  role,
  onSubmit,
  onClose,
}: {
  name: string;
  role: Role;
  onSubmit: (name: string, role: Role) => void;
  onClose: () => void;
}) {
  return (
    <Modal title="Explore o ClassCode" onClose={onClose}>
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          onSubmit(String(data.get('name')).trim(), String(data.get('role')) as Role);
        }}
      >
        <p className="helper">
          Experimente as duas perspectivas. Este seletor é uma demonstração de interface, sem
          autenticação. Todos os dados são compartilhados somente neste navegador.
        </p>
        <label>
          Como podemos chamar você?
          <input name="name" required maxLength={30} defaultValue={name} />
        </label>
        <label>
          Perspectiva
          <select name="role" defaultValue={role}>
            <option value="student">Estudante</option>
            <option value="teacher">Professor</option>
          </select>
        </label>
        <button type="submit" className="button primary">
          Acessar demonstração <ArrowRight size={16} />
        </button>
      </form>
    </Modal>
  );
}
