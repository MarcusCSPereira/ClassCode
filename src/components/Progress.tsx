export default function Progress({ value }: { value: number }) {
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
