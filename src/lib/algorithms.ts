export interface Frame {
  values: number[];
  active: number[];
  discarded?: number[];
  found?: number;
  message: string;
  line: number;
}
export function binaryFrames(values: number[], target: number): Frame[] {
  const frames: Frame[] = [
    { values, active: [], message: `Procuramos ${target} em um vetor ordenado.`, line: 0 },
  ];
  let l = 0,
    r = values.length - 1;
  while (l <= r) {
    const m = Math.floor((l + r) / 2);
    const discarded = values.map((_, i) => i).filter((i) => i < l || i > r);
    frames.push({
      values,
      active: [m],
      discarded,
      message: `Intervalo [${l}, ${r}]. Meio = ${m}; valor = ${values[m]}.`,
      line: 2,
    });
    if (values[m] === target) {
      frames.push({
        values,
        active: [m],
        discarded,
        found: m,
        message: `Encontramos ${target} no índice ${m}.`,
        line: 3,
      });
      return frames;
    }
    if (values[m] < target) {
      l = m + 1;
      frames.push({
        values,
        active: [],
        discarded: values.map((_, i) => i).filter((i) => i < l || i > r),
        message: `${values[m]} < ${target}: descartamos a metade à esquerda.`,
        line: 4,
      });
    } else {
      r = m - 1;
      frames.push({
        values,
        active: [],
        discarded: values.map((_, i) => i).filter((i) => i < l || i > r),
        message: `${values[m]} > ${target}: descartamos a metade à direita.`,
        line: 5,
      });
    }
  }
  frames.push({
    values,
    active: [],
    discarded: values.map((_, i) => i),
    message: `${target} não está no vetor. Retornamos -1.`,
    line: 6,
  });
  return frames;
}
export function bubbleFrames(input: number[]): Frame[] {
  const a = [...input];
  const frames: Frame[] = [
    {
      values: [...a],
      active: [],
      message: 'Compare vizinhos e leve o maior valor para o fim.',
      line: 0,
    },
  ];
  for (let i = 0; i < a.length - 1; i++) {
    let swapped = false;
    for (let j = 0; j < a.length - i - 1; j++) {
      frames.push({
        values: [...a],
        active: [j, j + 1],
        message: `Compare ${a[j]} e ${a[j + 1]}.`,
        line: 2,
      });
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        swapped = true;
        frames.push({
          values: [...a],
          active: [j, j + 1],
          message: 'Fora de ordem: trocamos os dois valores.',
          line: 3,
        });
      }
    }
    if (!swapped) break;
  }
  frames.push({
    values: [...a],
    active: [],
    message: 'Vetor ordenado! Cada valor está na posição correta.',
    line: 4,
  });
  return frames;
}
