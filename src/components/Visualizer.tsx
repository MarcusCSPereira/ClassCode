import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Pause, Play, RotateCcw, ScanLine } from 'lucide-react';
import { binaryFrames, bubbleFrames } from '../lib/algorithms';
const codes = {
  binary: [
    'l = 0; r = n - 1',
    'enquanto l ≤ r:',
    '    meio = (l + r) // 2',
    '    se vetor[meio] == alvo: retorne meio',
    '    se vetor[meio] < alvo: l = meio + 1',
    '    senão: r = meio - 1',
    'retorne -1',
  ],
  bubble: [
    'para i de 0 até n - 2:',
    '    para j de 0 até n - i - 2:',
    '        se vetor[j] > vetor[j + 1]:',
    '            troque(vetor[j], vetor[j + 1])',
    'retorne vetor',
  ],
};
export default function Visualizer({ compact = false }: { compact?: boolean }) {
  const [algorithm, setAlgorithm] = useState<'binary' | 'bubble'>('binary');
  const [target, setTarget] = useState(19);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1000);
  const frames = useMemo(
    () =>
      algorithm === 'binary'
        ? binaryFrames([2, 5, 8, 13, 19, 24, 31], target)
        : bubbleFrames([24, 8, 19, 5, 31, 13, 2]),
    [algorithm, target],
  );
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
  const frame = frames[Math.min(step, frames.length - 1)];
  function reset() {
    setStep(0);
    setPlaying(false);
  }
  return (
    <div className={`visualizer ${compact ? 'compact' : ''}`}>
      {!compact && (
        <div className="visual-toolbar">
          <div className="segmented">
            <button
              className={algorithm === 'binary' ? 'selected' : ''}
              onClick={() => {
                setAlgorithm('binary');
                reset();
              }}
            >
              Busca binária
            </button>
            <button
              className={algorithm === 'bubble' ? 'selected' : ''}
              onClick={() => {
                setAlgorithm('bubble');
                reset();
              }}
            >
              Bubble sort
            </button>
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
          <ScanLine size={17} /> {algorithm === 'binary' ? 'Busca binária' : 'Bubble sort'}
        </span>
        <span className="mono">{algorithm === 'binary' ? 'O(log n)' : 'O(n²)'}</span>
      </div>
      {!compact && algorithm === 'binary' && (
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
              style={algorithm === 'bubble' ? { height: `${40 + v * 3}px` } : {}}
            >
              {v}
            </div>
            <span>{i}</span>
            {frame.active.includes(i) && <small>{algorithm === 'binary' ? 'meio' : '↑'}</small>}
          </div>
        ))}
      </div>
      <p className="frame-message" aria-live="polite">
        {frame.message}
      </p>
      {!compact && (
        <div className="pseudocode">
          {codes[algorithm].map((line, i) => (
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
