import { useState, useRef } from 'react';

export const useGuitarAudio = () => {
  const [isActive, setIsActive] = useState(false);
  const [frequency, setFrequency] = useState<number | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const startAudio = async () => {
    try {
      // 1. Запрашиваем доступ к микрофону устройства
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 2. Инициализируем аудиоконтекст
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      await audioContext.resume(); // Пробуждаем контекст для Chrome/Safari
      audioContextRef.current = audioContext;

      // 3. Настраиваем узел анализатора
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048; // Оптимальный размер буфера для гитарных частот
      source.connect(analyser);

      const bufferLength = analyser.fftSize;
      const dataArray = new Float32Array(bufferLength);

      setIsActive(true);

      // 4. Цикл считывания частоты в реальном времени
      const updatePitch = () => {
        if (!analyser) return;
        
        // Получаем временной сигнал из микрофона
        analyser.getFloatTimeDomainData(dataArray);
        
        // Запускаем алгоритм автокорреляции для определения точной частоты
        const pitch = autoCorrelate(dataArray, audioContext.sampleRate);
        
        if (pitch !== -1 && pitch >= 60 && pitch <= 400) { 
          // Фильтруем частоты ниже 60 Гц и выше 400 Гц (диапазон гитары)
          setFrequency(Math.round(pitch * 10) / 10);
        }

        animationFrameRef.current = requestAnimationFrame(updatePitch);
      };

      updatePitch();

    } catch (err) {
      console.error('Не удалось получить доступ к микрофону:', err);
      alert('Пожалуйста, разрешите доступ к микрофону в настройках браузера.');
    }
  };

  const stopAudio = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    if (audioContextRef.current) audioContextRef.current.close();
    
    setIsActive(false);
    setFrequency(null);
  };

  return { isActive, frequency, startAudio, stopAudio };
};

// Алгоритм автокорреляции (поиск фундаментальной частоты звука)
function autoCorrelate(buffer: Float32Array, sampleRate: number): number {
  let SIZE = buffer.length;
  let rms = 0;

  // Считаем среднеквадратичное значение (громкость)
  for (let i = 0; i < SIZE; i++) {
    const val = buffer[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.015) return -1; // Сигнал слишком слабый (тишина или фоновый шум)

  // Обрезаем тихие участки по краям буфера
  let r1 = 0; let r2 = SIZE - 1;
  const thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) < thres) { r1 = i; break; }
  }
  for (let i = SIZE - 1; i >= SIZE / 2; i--) {
    if (Math.abs(buffer[i]) < thres) { r2 = i; break; }
  }

  const buf = buffer.subarray(r1, r2);
  SIZE = buf.length;

  // Вычисляем автокорреляцию
  const c = new Float32Array(SIZE);
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE - i; j++) {
      c[i] = c[i] + buf[j] * buf[j + i];
    }
  }

  // Находим первый пик сдвига
  let d = 0;
  while (c[d] > c[d + 1]) d++;
  let maxval = -1; let maxpos = -1;
  for (let i = d; i < SIZE / 2; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }

  let T0 = maxpos;
  return sampleRate / T0;
}