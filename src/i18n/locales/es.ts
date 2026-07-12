import type { Translations } from '../types';

export const es: Translations = {
  permission: {
    title: 'Permite el micrófono\npara empezar a afinar',
    button: 'Solicitar acceso',
  },
  tunerHeader: {
    auto: 'Auto',
    autoAriaLabel: 'Modo automático',
    flatAriaLabel: 'Usar notación con bemoles',
    sharpAriaLabel: 'Usar notación con sostenidos',
    instrumentTitle: (instrument, stringCount) =>
      instrument === 'bass'
        ? `Bajo de ${stringCount} cuerdas`
        : instrument === 'ukulele'
          ? `Ukelele de ${stringCount} cuerdas`
          : `Guitarra de ${stringCount} cuerdas`,
  },
  advancedTuner: {
    title: 'Afinación avanzada',
    reset: 'Restablecer',
  },
  tunerStatus: {
    inTune: '¡Afinado!',
    tuneUp: 'Sube',
    tuneDown: 'Baja',
    startPlaying: 'Empieza a tocar',
  },
  settings: {
    advancedMode: 'Modo avanzado',
    soundEffect: 'Efecto de sonido',
    leftHandedMode: 'Modo zurdo',
    calibrate: 'Calibrar',
    language: 'Idioma',
    support: 'Soporte',
    faq: 'Preguntas frecuentes',
    nicknamePlaceholder: 'Apodo',
    version: 'TunerApp v.1.0.0',
  },
  selectTuning: {
    title: 'Elegir afinación',
    guitarOption: 'Guitarra 6 cuerdas',
    bassOption: 'Bajo 4 cuerdas',
    categoryPower: 'Rebajadas',
    categoryOpen: 'Abiertas',
    categoryExtras: 'Extras',
    save: 'Guardar',
  },
  faq: {
    title: 'Preguntas frecuentes',
    backAriaLabel: 'Volver a Ajustes',
    entries: [
      {
        question: 'La app no oye mi guitarra, ¿qué reviso?',
        answer:
          'Asegúrate de que el acceso al micrófono esté permitido (Ajustes > Privacidad, o el aviso de permisos de ' +
          'tu cliente de Telegram), de que esté seleccionado el micrófono correcto si tu dispositivo tiene más de ' +
          'uno, y de que ninguna otra app esté usando el micrófono en segundo plano. Toca una sola nota, clara y ' +
          'cerca del micrófono — tocar muy flojo o muy amortiguado puede quedar por debajo del umbral de ruido ' +
          'que usa el afinador para descartar zumbidos y ruido ambiente.',
      },
      {
        question: '¿Por qué mi cuerda grave (o el bajo) no se fija en una nota?',
        answer:
          'Las notas graves y profundas tardan más en identificarse — el afinador necesita un momento para ver ' +
          'varios ciclos completos de la onda antes de estar seguro, así que un Mi grave o una cuerda de bajo ' +
          'pueden tardar un poco más en estabilizarse que una cuerda aguda. Deja que la nota suene en lugar de ' +
          'pulsarla rápido y espera un instante antes de esperar una lectura fija.',
      },
      {
        question: 'La lectura parpadea entre dos notas separadas por una octava.',
        answer:
          'Es un caso límite conocido y difícil en la detección de tono en cuerdas muy graves, donde un armónico ' +
          'de la cuerda puede superar brevemente a su nota fundamental. El afinador corrige esto activamente, ' +
          'pero con una captación muy floja, distorsión fuerte o una cuerda muy desafinada, todavía puede aparecer ' +
          'alguna vez. Tocar la nota de nuevo, un poco más fuerte y limpia, casi siempre lo resuelve al instante.',
      },
      {
        question: '¿Cuál es la diferencia entre afinación simple y avanzada?',
        answer:
          'El afinador simple muestra la pala del instrumento con todas las cuerdas a la vez y resalta cuál estás ' +
          'tocando ahora — pensado para afinar todo el instrumento rápidamente. El afinador avanzado es una ' +
          'pantalla única y más grande, con una lectura de cents más precisa — pensado para trabajar con detalle ' +
          'en una cuerda a la vez. Puedes cambiar entre ambos en cualquier momento desde Ajustes > Modo avanzado.',
      },
      {
        question: '¿Qué hacen los modos Auto y Manual en el afinador simple?',
        answer:
          'El modo Auto siempre muestra la cuerda que estás tocando, detectada automáticamente. El modo Manual ' +
          'te permite tocar una cuerda concreta para afinarla y sigue mostrando su lectura aunque toques ' +
          'brevemente otra — útil cuando el sonido de una cuerda vecina se cuela en el micrófono.',
      },
      {
        question: '¿Qué cambia realmente la calibración (A4 / Hz)?',
        answer:
          'Define el tono de referencia que el afinador considera «afinado» — 440Hz es el estándar usado por casi ' +
          'todos los instrumentos modernos, aunque algunos conjuntos o grabaciones usan una referencia ligeramente ' +
          'distinta (normalmente 442Hz). Cambia esto solo si necesitas ajustarte a otro instrumento o grabación en ' +
          'concreto; si no, déjalo en 440Hz.',
      },
      {
        question: '¿Cómo cambio de instrumento o afinación (Drop D, afinaciones alternativas, bajo)?',
        answer:
          'Toca el nombre de la afinación en la parte superior del afinador simple, o ábrelo desde la cabecera, ' +
          'para llegar a Elegir afinación. Elige Guitarra o Bajo y luego Estándar o cualquiera de las afinaciones ' +
          'alternativas de la lista — tu elección se recuerda la próxima vez que abras la app.',
      },
      {
        question: '¿Qué cambia el modo zurdo?',
        answer: 'Invierte la disposición de las cuerdas para que su orden coincida con un instrumento encordado para zurdos.',
      },
      {
        question: '¿Sigues atascado?',
        answer: 'Escríbenos desde Ajustes > Soporte y cuéntanos qué está pasando — te ayudamos encantados.',
      },
    ],
  },
  languagePicker: {
    title: 'Idioma',
  },
};
