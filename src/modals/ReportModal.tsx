import { Check } from 'lucide-react';
import Modal from '../components/Modal';
export default function ReportModal({
  problemTitle,
  evidence,
  solved,
  onSave,
  onReopen,
  onClose,
}: {
  problemTitle: string;
  evidence: string | undefined;
  solved: boolean;
  onSave: (evidence: string) => void;
  onReopen: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title="Registre sua aprendizagem" onClose={onClose}>
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          onSave(String(d.get('evidence')).trim());
        }}
      >
        <p>
          Desafio: <strong>{problemTitle}</strong>
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
            defaultValue={evidence ?? ''}
            placeholder="Como você resolveu? O que aprendeu?"
          />
        </label>
        <label className="checkbox-label">
          <input type="checkbox" required /> Confirmei minha solução no judge ou com o professor.
        </label>
        <button type="submit" className="button primary">
          Salvar conclusão declarada <Check size={16} />
        </button>
        {solved && (
          <button type="button" className="text-button danger" onClick={onReopen}>
            Reabrir desafio
          </button>
        )}
      </form>
    </Modal>
  );
}
