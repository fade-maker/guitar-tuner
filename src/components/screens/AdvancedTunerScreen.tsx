import { useEffect, useMemo } from 'react';
import type { ReactElement } from 'react';
import { useAudioEngine } from '../../hooks';
import { useTranslation } from '../../i18n';
import { DEFAULT_A4_FREQUENCY, getAllTunings, midiToNoteName } from '../../music-theory';
import type { TuningPreset } from '../../music-theory';
import { usePreferences } from '../../preferences';
import { triggerHapticFeedback } from '../../telegram/haptics';
import { AdvancedStatusBadge, AppHeader, Button, Icon, InTuneZone, NoteCircle, StepperButton } from '../ui';
import type { AdvancedStatusBadgeState } from '../ui';
import bgPatternLines from './assets/bg-pattern-lines.svg';
import bgPatternMask from './assets/bg-pattern-mask.svg';
import styles from './AdvancedTunerScreen.module.css';

export function AdvancedTunerScreen(): ReactElement {
  const { preferences, setPreference } = usePreferences();
  const t = useTranslation();
  const allTunings = useMemo(() => getAllTunings(), []);
  const activeTuning: TuningPreset =
    allTunings.find((tuning) => tuning.id === preferences.selectedTuning) ?? allTunings[0];

  // Advanced Tuner always auto-detects the nearest string - Figma's header for this screen has no
  // Auto switch (unlike Simple Tuner's), and no manual per-string picker exists on this screen, so
  // pinTarget/unpinTarget are never called here. a4Frequency is passed straight through as the
  // hook's own controlled a4 input - useAudioEngine keeps the presenter's calibration synced to it
  // on every render, so this screen's own Calibrate stepper only needs to update AppPreferences,
  // not call a separate setA4() itself.
  const { presentation, start, stop } = useAudioEngine(activeTuning, preferences.a4Frequency);

  // Same deferred start as SimpleTunerScreen (see its ENGINE_START_DELAY_MS comment - audit H3):
  // the footer's 520ms pill animation starts in the same frames this screen mounts, and stacking
  // the engine's getUserMedia/AudioContext/worklet setup into those frames stuttered the animation.
  useEffect(() => {
    const timer = setTimeout(() => void start(), 260);
    return () => {
      clearTimeout(timer);
      stop();
    };
  }, [start, stop]);

  function handleA4Change(delta: number): void {
    const next = preferences.a4Frequency + delta;
    if (next <= 0) return;
    setPreference('a4Frequency', next);
  }

  function handleReset(): void {
    triggerHapticFeedback('light');
    setPreference('a4Frequency', DEFAULT_A4_FREQUENCY);
  }

  const hasTarget = presentation.target !== null;
  const currentNote = presentation.target ? midiToNoteName(presentation.target.midi, preferences.accidental) : null;
  const badgeState: AdvancedStatusBadgeState = presentation.inTune
    ? 'In tune'
    : (presentation.cents ?? 0) > 0
      ? 'Tune down'
      : 'Tune up';

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        {/* Figma's title text reads "Advansed tunind" - a typo, not reproduced here. */}
        <AppHeader variant="Advanced" title={t.advancedTuner.title} frequencyLabel={`${preferences.a4Frequency}Hz`} />
      </div>

      <div className={styles.main}>
        <div
          className={styles.bgPattern}
          style={{ maskImage: `url("${bgPatternMask}")`, WebkitMaskImage: `url("${bgPatternMask}")` }}
        >
          <img src={bgPatternLines} alt="" className={styles.bgPatternImg} />
        </div>

        <button
          type="button"
          className={styles.accidentalLeft}
          onClick={() => setPreference('accidental', 'flat')}
          aria-label={t.tunerHeader.flatAriaLabel}
        >
          <Icon name="flat" size={24} />
        </button>
        <button
          type="button"
          className={styles.accidentalRight}
          onClick={() => setPreference('accidental', 'sharp')}
          aria-label={t.tunerHeader.sharpAriaLabel}
        >
          <Icon name="sharp" size={24} />
        </button>

        <div className={styles.noteArea}>
          <InTuneZone state={hasTarget ? 'Tuning started' : 'Default'} promptText={t.tunerStatus.startPlaying} />
          {hasTarget && currentNote && (
            <div className={styles.noteCircleLayer}>
              <NoteCircle note={currentNote.note} state={presentation.inTune ? 'In tune' : 'Searching'} />
            </div>
          )}
        </div>

        {hasTarget && (
          <div className={styles.statusBadge}>
            <AdvancedStatusBadge
              state={badgeState}
              label={
                badgeState === 'In tune' ? t.tunerStatus.inTune : badgeState === 'Tune up' ? t.tunerStatus.tuneUp : t.tunerStatus.tuneDown
              }
            />
          </div>
        )}

        <div className={styles.calibrateBlock}>
          <div className={styles.stepperRow}>
            <StepperButton type="-" size="large" onClick={() => handleA4Change(-1)} />
            <div className={styles.freqText}>
              <span className={styles.freqValue}>{preferences.a4Frequency}</span>
              <span className={styles.freqUnit}>Hz</span>
            </div>
            <StepperButton type="+" size="large" onClick={() => handleA4Change(1)} />
          </div>
          <Button variant="secondary" size="large" onClick={handleReset}>
            {t.advancedTuner.reset}
          </Button>
        </div>
      </div>
    </div>
  );
}
