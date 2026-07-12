import type { Translations } from '../types';

export const en: Translations = {
  permission: {
    title: 'Allow microphone\nto start tuning',
    button: 'Request access',
  },
  tunerHeader: {
    auto: 'Auto',
    autoAriaLabel: 'Auto mode',
    flatAriaLabel: 'Use flat notation',
    sharpAriaLabel: 'Use sharp notation',
    instrumentTitle: (instrument, stringCount) =>
      `${instrument === 'bass' ? 'Bass' : instrument === 'ukulele' ? 'Ukulele' : 'Guitar'} ${stringCount}-string`,
  },
  advancedTuner: {
    title: 'Advanced tuning',
    reset: 'Reset',
  },
  tunerStatus: {
    inTune: 'In tune!',
    tuneUp: 'Tune up',
    tuneDown: 'Tune down',
    startPlaying: 'Start playing',
  },
  settings: {
    advancedMode: 'Advanced mode',
    soundEffect: 'Sound effect',
    leftHandedMode: 'Left-handed mode',
    calibrate: 'Calibrate',
    language: 'Language',
    support: 'Support',
    faq: 'FAQ',
    nicknamePlaceholder: 'Nickname',
    version: 'TunerApp v.1.0.0',
  },
  selectTuning: {
    title: 'Select tuning',
    guitarOption: 'Guitar 6-string',
    bassOption: 'Bass 4-string',
    categoryPower: 'Power',
    categoryOpen: 'Open',
    categoryExtras: 'Extras',
    save: 'Save',
  },
  faq: {
    title: 'FAQ',
    backAriaLabel: 'Back to Settings',
    entries: [
      {
        question: 'The app can’t hear my guitar - what do I check?',
        answer:
          'Make sure microphone access is allowed (Settings > Privacy, or your Telegram client’s permission ' +
          'prompt), the correct microphone is selected if your device has more than one, and nothing else is ' +
          'holding the microphone open in the background. Play a single, clear note close to the mic - very ' +
          'quiet or heavily muted playing can fall below the noise floor the tuner uses to reject background ' +
          'hum and room rumble.',
      },
      {
        question: 'Why won’t my low string (or bass) lock onto a note?',
        answer:
          'Low, deep notes take longer to fingerprint - the tuner needs a moment to see a few full waveform ' +
          'cycles before it can be confident, so a low E or a bass string can take slightly longer to settle ' +
          'than a high string. Let the note ring out rather than a short pluck, and give it a beat before ' +
          'expecting a locked reading.',
      },
      {
        question: 'The reading flickers between two notes an octave apart.',
        answer:
          'This is a known, hard pitch-detection edge case on very low strings, where a string’s overtone can ' +
          'briefly outweigh its fundamental note. The tuner actively corrects for this, but on an unusually ' +
          'quiet pickup, heavy distortion, or a badly out-of-tune string it can still occasionally show up. ' +
          'Playing the note again, a little louder and cleaner, almost always resolves it immediately.',
      },
      {
        question: 'What’s the difference between Simple and Advanced tuning?',
        answer:
          'Simple Tuner shows a headstock with all of your instrument’s strings at once, and highlights which ' +
          'one you’re currently playing - built for quickly working through a full tuning pass. Advanced Tuner ' +
          'is a single, larger note display with a finer-grained cents readout - built for close, precise work ' +
          'on one string at a time. Switch between them any time from Settings > Advanced mode.',
      },
      {
        question: 'What do Auto and Manual mode do in Simple Tuner?',
        answer:
          'Auto mode always shows whichever string you’re currently playing, detected automatically. Manual ' +
          'mode lets you tap a specific string to tune, and keeps showing that string’s reading even if you ' +
          'briefly play a different one - useful when a neighboring string is bleeding into the microphone.',
      },
      {
        question: 'What does Calibrate (A4 / Hz) actually change?',
        answer:
          'It sets the reference pitch the tuner treats as "in tune" - 440Hz is the standard used by nearly all ' +
          'modern instruments, but some ensembles or recordings tune to a slightly different reference (commonly ' +
          '442Hz). Only change this if you specifically need to match another instrument or recording; otherwise ' +
          'leave it at 440Hz.',
      },
      {
        question: 'How do I change instrument or tuning (Drop D, alternate tunings, bass)?',
        answer:
          'Tap the tuning name at the top of Simple Tuner, or open it from the header, to reach Select Tuning. ' +
          'Choose Guitar or Bass, then pick Standard or any of the alternate tunings listed - your choice is ' +
          'remembered the next time you open the app.',
      },
      {
        question: 'What does Left-handed mode change?',
        answer: 'It mirrors the string layout so the string order matches a left-handed strung instrument.',
      },
      {
        question: 'Still stuck?',
        answer: 'Reach out from Settings > Support and describe what you’re seeing - happy to help directly.',
      },
    ],
  },
  languagePicker: {
    title: 'Language',
  },
};
