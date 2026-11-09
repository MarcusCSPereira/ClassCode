import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Pause, Play, RotateCcw, ScanLine } from 'lucide-react';
import type { Frame } from '../lib/algorithms';
import { getVisualLab, visualLabs, type VisualLabId } from '../lib/visualLabs';

export default function Visualizer({
  compact = false,
  labId,
  onLabChange,
  onStepChange,
}: {
  compact?: boolean;
  labId: VisualLabId;
  onLabChange: (labId: VisualLabId) => void;
  onStepChange?: (snapshot: { step: number; total: number; frame: Frame }) => void;
}) {
  const [target, setTarget] = useState(19);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1000);
  const lab = getVisualLab(labId);
  const frames = useMemo(() => lab.buildFrames({ target }), [lab, target]);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(
      () =>
        setStep((s) => {
          if (s >= frames.length - 1) {
            setPlaying(false);
            return s;
          }
          return s + 1;
        }),
      speed,
    );
    return () => clearInterval(timer);
  }, [playing, frames.length, speed]);

  useEffect(() => {
    setStep(0);
    setPlaying(false);
  }, [labId]);

  const frame = frames[Math.min(step, frames.length - 1)];

  useEffect(() => {
    onStepChange?.({ step, total: frames.length, frame });
  }, [frame, frames.length, onStepChange, step]);

  function reset() {
    setStep(0);
    setPlaying(false);
  }
  return (
    <div className={`visualizer ${compact ? 'compact' : ''}`}>
      {!compact && (
        <div className="visual-toolbar">
          <div className="segmented">
            {visualLabs.map((option) => (
              <button
                key={option.id}
                className={labId === option.id ? 'selected' : ''}
                onClick={() => {
                  onLabChange(option.id);
                  reset();
                }}
              >
                {option.title}
              </button>
            ))}
          </div>
          <label>
            Velocidade{' '}
            <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
              <option value={1600}>0,5×</option>
              <option value={1000}>1×</option>
              <option value={400}>2×</option>
            </select>
          </label>
        </div>
      )}
      <div className="visual-heading">
        <span>
          <ScanLine size={17} /> {lab.title}
        </span>
        <span className="mono">{lab.complexity}</span>
      </div>
      {!compact && labId === 'binary' && (
        <label className="target-field">
          Valor a encontrar{' '}
          <input
            type="number"
            value={target}
            onChange={(e) => {
              setTarget(Number(e.target.value));
              reset();
            }}
          />
        </label>
      )}
      <div className="array-stage" aria-label="Estado do vetor">
        {frame.values.map((v, i) => (
          <div
            className={`array-item ${frame.active.includes(i) ? 'active' : ''} ${frame.discarded?.includes(i) ? 'discarded' : ''} ${frame.found === i ? 'found' : ''}`}
            key={i}
          >
            <div
              className="array-cell"
              style={labId === 'bubble' ? { height: `${40 + v * 3}px` } : {}}
            >
              {v}
            </div>
            <span>{i}</span>
            {frame.active.includes(i) && <small>{labId === 'binary' ? 'meio' : '↑'}</small>}
          </div>
        ))}
      </div>
      <p className="frame-message" aria-live="polite">
        {frame.message}
      </p>
      {!compact && (
        <div className="pseudocode">
          {lab.pseudocode.map((line, i) => (
            <div key={line} className={frame.line === i ? 'highlight' : ''}>
              <span>{i + 1}</span>
              <code>{line}</code>
            </div>
          ))}
        </div>
      )}
      <div className="playback">
        <button className="icon-button" aria-label="Reiniciar animação" onClick={reset}>
          <RotateCcw size={17} />
        </button>
        <button
          className="icon-button"
          aria-label="Passo anterior"
          disabled={step === 0}
          onClick={() => {
            setPlaying(false);
            setStep((s) => s - 1);
          }}
        >
          <ArrowLeft size={17} />
        </button>
        <button
          className="play-button"
          aria-label={playing ? 'Pausar animação' : 'Reproduzir animação'}
          onClick={() => {
            if (step === frames.length - 1) setStep(0);
            setPlaying(!playing);
          }}
        >
          {playing ? <Pause size={17} /> : <Play size={17} fill="currentColor" />}
        </button>
        <button
          className="icon-button"
          aria-label="Próximo passo"
          disabled={step === frames.length - 1}
          onClick={() => {
            setPlaying(false);
            setStep((s) => s + 1);
          }}
        >
          <ArrowRight size={17} />
        </button>
        <span className="muted mono">
          {step + 1} / {frames.length}
        </span>
      </div>
      {!compact && (
        <p className="helper">
          Visualização didática de um algoritmo predefinido. Não executa o código do editor.
        </p>
      )}
    </div>
  );
}
