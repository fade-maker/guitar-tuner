import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useAudioEngine } from '../../hooks';
import { getAllTunings, midiToNoteName } from '../../music-theory';
import type { StringTarget, TuningPreset } from '../../music-theory';
import { useNavigation } from '../../navigation';
import { usePreferences } from '../../preferences';
import {
  AppHeader,
  BassIllustration,
  CurrentTargetNote,
  FooterNavigation,
  GuitarIllustration,
  SimplePitchBadge,
  StringControl,
} from '../ui';
import type { SimplePitchBadgeState, StringControlState } from '../ui';
import bgPatternLines from './assets/bg-pattern-lines.svg';
import bgPatternMask from './assets/bg-pattern-mask.svg';
import tuneLineAsset from './assets/tune-line.svg';
import styles from './SimpleTunerScreen.module.css';

type Instrument = 'guitar' | 'bass' | 'ukulele';

// Screen-level only, not a music-theory change (see Stage 1's AppPreferences note on the same
// gap): groups tunings by instrument for the header text and illustration choice.
const TUNING_INSTRUMENT: Record<string, Instrument> = {
  'guitar-standard': 'guitar',
  'guitar-drop-d': 'guitar',
  'bass-standard': 'bass',
  'ukulele-standard': 'ukulele',
};

// Screen-level formatting only: Figma's header splits a tuning into an "instrument + string count"
// title and a variant subtitle, but TuningPreset.name is one combined descriptive string - this maps
// id -> the subtitle Figma actually shows, without changing TuningPreset itself.
const TUNING_SUBTITLE: Record<string, string> = {
  'guitar-standard': 'Standard',
  'guitar-drop-d': 'Drop D',
  'bass-standard': 'Standard',
  'ukulele-standard': 'Standard',
};

// Guitar's confirmed Figma layout: first half of the string array, reversed, on the left; second
// half, forward, on the right (e.g. 6-string -> left [D,A,E], right [G,B,E]). Generalized to any
// string count since Bass has no current Figma reference with the new component set - see the
// Stage 2 report for that caveat.
function splitStringColumns(strings: readonly StringTarget[]): {
  left: readonly StringTarget[];
  right: readonly StringTarget[];
} {
  const half = Math.ceil(strings.length / 2);
  return { left: [...strings.slice(0, half)].reverse(), right: strings.slice(half) };
}

export function SimpleTunerScreen(): ReactElement {
  const { preferences, setPreference } = usePreferences();
  const { navigateTo } = useNavigation();
  const allTunings = useMemo(() => getAllTunings(), []);
  const activeTuning: TuningPreset = allTunings.find((t) => t.id === preferences.selectedTuning) ?? allTunings[0];

  const { presentation, pinTarget, unpinTarget } = useAudioEngine(activeTuning);
  const [manualStringId, setManualStringId] = useState<string | null>(null);

  const instrument = TUNING_INSTRUMENT[activeTuning.id] ?? 'guitar';
  const title = `${instrument === 'bass' ? 'Bass' : 'Guitar'} ${activeTuning.strings.length}-string`;
  const subtitle = TUNING_SUBTITLE[activeTuning.id] ?? 'Standard';

  function handleAutoModeChange(auto: boolean): void {
    setPreference('autoMode', auto);
    if (auto) {
      unpinTarget();
    } else if (manualStringId) {
      pinTarget(manualStringId);
    }
  }

  function handleStringClick(target: StringTarget): void {
    setManualStringId(target.id);
    if (!preferences.autoMode) {
      pinTarget(target.id);
    }
  }

  function stringLabel(target: StringTarget): string {
    return midiToNoteName(target.midi, preferences.accidental).note;
  }

  function stringState(target: StringTarget): StringControlState {
    if (presentation.target?.id === target.id && presentation.inTune) return 'In tune';
    if (presentation.tunedTargetIds.has(target.id)) return 'Tuned';
    return 'Default';
  }

  const { left, right } = splitStringColumns(activeTuning.strings);
  // 3-per-column (guitar) fills the band top-down, matching Figma; fewer strings per column
  // (bass) are centered in the same band - see the Stage 2 report for why that's an inferred
  // choice rather than a confirmed one.
  const columnClassName = activeTuning.strings.length > 4 ? styles.column : `${styles.column} ${styles.columnCentered}`;

  const showPitchInfo = presentation.cents !== null && presentation.target !== null;
  const badgeState: SimplePitchBadgeState = presentation.inTune
    ? 'In tune'
    : (presentation.cents ?? 0) > 0
      ? 'Tune down'
      : 'Tune up';
  const currentNote = presentation.target
    ? midiToNoteName(presentation.target.midi, preferences.accidental)
    : null;

  return (
    <div className={styles.screen}>
      <div
        className={styles.bgPattern}
        style={{ maskImage: `url(${bgPatternMask})`, WebkitMaskImage: `url(${bgPatternMask})` }}
      >
        <img src={bgPatternLines} alt="" className={styles.bgPatternImg} />
      </div>

      <div className={styles.header}>
        <AppHeader
          variant="Default"
          title={title}
          subtitle={subtitle}
          frequencyLabel={`${preferences.a4Frequency}Hz`}
          autoMode={preferences.autoMode}
          onAutoModeChange={handleAutoModeChange}
          onAccidentalSelect={(accidental) => setPreference('accidental', accidental)}
        />
      </div>

      <div className={styles.tuneLineWrap}>
        <div className={styles.tuneLine}>
          <img src={tuneLineAsset} alt="" className={styles.tuneLineImg} />
        </div>
      </div>

      <div className={styles.illustration}>{instrument === 'bass' ? <BassIllustration /> : <GuitarIllustration />}</div>

      {showPitchInfo && (
        <div className={styles.pitchBadge}>
          <SimplePitchBadge state={badgeState} cents={Math.abs(Math.round(presentation.cents ?? 0))} />
        </div>
      )}

      {currentNote && (
        <div className={styles.currentNote}>
          <CurrentTargetNote note={currentNote.note} octave={currentNote.octave} />
        </div>
      )}

      <div className={styles.stringContainer}>
        <div className={columnClassName}>
          {left.map((target) => (
            <StringControl
              key={target.id}
              label={stringLabel(target)}
              state={stringState(target)}
              onClick={() => handleStringClick(target)}
            />
          ))}
        </div>
        <div className={columnClassName}>
          {right.map((target) => (
            <StringControl
              key={target.id}
              label={stringLabel(target)}
              state={stringState(target)}
              onClick={() => handleStringClick(target)}
            />
          ))}
        </div>
      </div>

      <div className={styles.footer}>
        <FooterNavigation active="Tuner" onSelect={(tab) => tab === 'Settings' && navigateTo('settings')} />
      </div>
    </div>
  );
}
