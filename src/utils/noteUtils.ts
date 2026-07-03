export interface NoteData {
  note: string;       // Название ноты (например, "E")
  octave: number;     // Октава (например, 2)
  cents: number;      // Отклонение от идеала (от -50 до +50)
  expectedHz: number; // Какая частота должна быть у идеальной ноты
}

// Стандартные частоты струн гитары (E2, A2, D3, G3, B3, E4)
const GUITAR_TARGETS = [
  { note: 'E', octave: 2, freq: 82.41 },
  { note: 'A', octave: 2, freq: 110.00 },
  { note: 'D', octave: 3, freq: 146.83 },
  { note: 'G', octave: 3, freq: 196.00 },
  { note: 'B', octave: 3, freq: 246.94 },
  { note: 'E', octave: 4, freq: 329.63 }
];

export const calculateNoteFromHz = (hz: number | null): NoteData | null => {
  if (!hz || hz <= 0) return null;

  // 1. Находим, к какой из 6 струн ближе всего текущая частота
  const closest = GUITAR_TARGETS.reduce((prev, curr) => {
    return Math.abs(curr.freq - hz) < Math.abs(prev.freq - hz) ? curr : prev;
  });

  // 2. Считаем отклонение в центах по формуле: 1200 * log2(f1 / f2)
  const cents = 1200 * Math.log2(hz / closest.freq);

  return {
    note: closest.note,
    octave: closest.octave,
    expectedHz: closest.freq,
    cents: Math.round(cents) // Округляем до целого цента
  };
};