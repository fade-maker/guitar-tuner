import { useEffect, useMemo } from 'react';
import type { ReactElement } from 'react';
import { useAudioEngine } from '../../hooks';
import { DEFAULT_A4_FREQUENCY, getAllTunings, midiToNoteName } from '../../music-theory';
import type { TuningPreset } from '../../music-theory';
import { usePreferences } from '../../preferences';
import { AdvancedStatusBadge, AppHeader, Button, Icon, InTuneZone, NoteCircle, StepperButton } from '../ui';
import type { AdvancedStatusBadgeState } from '../ui';
import bgPatternLines from './assets/bg-pattern-lines.svg';
import bgPatternMask from './assets/bg-pattern-mask.svg';
import styles from './AdvancedTunerScreen.module.css';

export function AdvancedTunerScreen(): ReactElement {
  const { preferences, setPreference } = usePreferences();
  const allTunings = useMemo(() => getAllTunings(), []);
  const activeTuning: TuningPreset = allTunings.find((t) => t.id === preferences.selectedTuning) ?? allTunings[0];

  // Advanced Tuner always auto-detects the nearest string - Figma's header for this screen has no
  // Auto switch (unlike Simple Tuner's), and no manual per-string picker exists on this screen, so
  // pinTarget/unpinTarget are never called here.
  const { presentation, setA4, start, stop } = useAudioEngine(activeTuning);

  // Same temporary responsibility as SimpleTunerScreen - see that screen's note on PermissionGate.
  useEffect(() => {
    void start();
    return () => stop();
  }, [start, stop]);

  function handleA4Change(delta: number): void {
    const next = preferences.a4Frequency + delta;
    if (next <= 0) return;
    setPreference('a4Frequency', next);
    setA4(next);
  }

  function handleReset(): void {
    setPreference('a4Frequency', DEFAULT_A4_FREQUENCY);
    setA4(DEFAULT_A4_FREQUENCY);
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
        <AppHeader variant="Advanced" title="Advanced tuning" frequencyLabel={`${preferences.a4Frequency}Hz`} />
      </div>

      <div className={styles.main}>
        <div
          className={styles.bgPattern}
          style={{ maskImage: `url(${bgPatternMask})`, WebkitMaskImage: `url(${bgPatternMask})` }}
        >
          <img src={bgPatternLines} alt="" className={styles.bgPatternImg} />
        </div>

        <button
          type="button"
          className={styles.accidentalLeft}
          onClick={() => setPreference('accidental', 'flat')}
          aria-label="Use flat notation"
        >
          <Icon name="flat" size={24} />
        </button>
        <button
          type="button"
          className={styles.accidentalRight}
          onClick={() => setPreference('accidental', 'sharp')}
          aria-label="Use sharp notation"
        >
          <Icon name="sharp" size={24} />
        </button>

        <div className={styles.noteArea}>
          <InTuneZone state={hasTarget ? 'Tuning started' : 'Default'} />
          {hasTarget && currentNote && (
            <div className={styles.noteCircleLayer}>
              <NoteCircle note={currentNote.note} state={presentation.inTune ? 'In tune' : 'Searching'} />
            </div>
          )}
        </div>

        {hasTarget && (
          <div className={styles.statusBadge}>
            <AdvancedStatusBadge state={badgeState} />
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
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}
