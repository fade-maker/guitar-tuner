import { useState } from 'react';
import type { ReactElement } from 'react';
import { useNavigation } from '../../navigation';
import { triggerHapticFeedback } from '../../telegram/haptics';
import { classNames } from '../ui/classNames';
import { Icon } from '../ui';
import styles from './FAQScreen.module.css';

// No Figma source exists for this screen (Settings' FAQ row was a flagged, deliberate no-op - see
// CLAUDE.md's Stage 2-4 log entry). Authorized to close the gap with our own judgment: an in-app
// screen using the existing NavigationProvider/ScreenId/components/screens pattern, styled to match
// the rest of the app (same card/row language as SettingsScreen, same accordion technique as Select
// Tuning's Power/Open/Extras catalog) rather than inventing new visual language. No new dependency,
// no external host - real content grounded in what this app actually does, not generic filler.
interface FAQEntry {
  readonly question: string;
  readonly answer: string;
}

const FAQ_ENTRIES: readonly FAQEntry[] = [
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
];

interface FAQRowProps {
  readonly entry: FAQEntry;
  readonly expanded: boolean;
  readonly onToggle: () => void;
}

function FAQRow({ entry, expanded, onToggle }: FAQRowProps): ReactElement {
  return (
    <div className={styles.item}>
      <button type="button" className={styles.questionRow} onClick={onToggle} aria-expanded={expanded}>
        <span className={styles.question}>{entry.question}</span>
        <span className={classNames(styles.chevron, !expanded && styles.chevronCollapsed)}>
          <Icon name="arrow-down" size={16} />
        </span>
      </button>
      <div className={classNames(styles.expandWrapper, expanded && styles.expandWrapperOpen)}>
        <div className={styles.expandInner}>
          <p className={styles.answer}>{entry.answer}</p>
        </div>
      </div>
    </div>
  );
}

// Same "always mounted, height-animated via grid-template-rows" accordion technique already
// established and tested in SelectTuningScreen's Power/Open/Extras catalog - reused rather than
// invented fresh for this screen.
export function FAQScreen(): ReactElement {
  const { navigateTo } = useNavigation();
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);

  function handleToggle(question: string): void {
    triggerHapticFeedback('light');
    setOpenQuestion((current) => (current === question ? null : question));
  }

  function handleBack(): void {
    triggerHapticFeedback('light');
    navigateTo('settings');
  }

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <button type="button" className={styles.backButton} onClick={handleBack} aria-label="Back to Settings">
          <span className={styles.backIcon}>
            <Icon name="arrow-right" size={20} />
          </span>
        </button>
        <h1 className={styles.title}>FAQ</h1>
        <span className={styles.headerSpacer} aria-hidden="true" />
      </div>

      <div className={styles.content}>
        <div className={styles.card}>
          {FAQ_ENTRIES.map((entry, index) => (
            <div key={entry.question}>
              <FAQRow entry={entry} expanded={openQuestion === entry.question} onToggle={() => handleToggle(entry.question)} />
              {index < FAQ_ENTRIES.length - 1 && <hr className={styles.divider} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
