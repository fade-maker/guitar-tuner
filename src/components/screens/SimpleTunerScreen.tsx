import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useAudioEngine } from '../../hooks';
import { getAllTunings, midiToNoteName } from '../../music-theory';
import type { StringTarget, TuningPreset } from '../../music-theory';
import { useNavigation } from '../../navigation';
import { usePreferences } from '../../preferences';
import { ViewportScreen } from '../layout';
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
import { TUNING_INSTRUMENT } from './tuningInstrument';

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

// SimplePitchBadge's horizontal position tracks how far off-pitch the current reading is, rather
// than staying fixed - confirmed from Figma, which shows the badge at 3 different x-positions
// across its In-tune/Tune-up/Tune-down demo states. Those 3 samples don't give an exact px-per-cent
// slope (their cents values aren't known), so this is a bounded linear approximation: ±50 cents
// reuses the same "far off" bound the project's original debug harness used for its needle, and
// the ~35px max travel is the average offset observed across the 2 off-pitch samples.
const BADGE_BASE_LEFT_PERCENT = 44.527; // 179 / 402, same anchor as .currentNote
const BADGE_MAX_OFFSET_PERCENT = 8.706; // ~35px / 402px
const BADGE_CENTS_RANGE = 50;

function badgeLeftPercent(cents: number): number {
  const clamped = Math.max(-BADGE_CENTS_RANGE, Math.min(BADGE_CENTS_RANGE, cents));
  return BADGE_BASE_LEFT_PERCENT + (clamped / BADGE_CENTS_RANGE) * BADGE_MAX_OFFSET_PERCENT;
}

export function SimpleTunerScreen(): ReactElement {
  const { preferences, setPreference } = usePreferences();
  const { navigateTo } = useNavigation();
  const allTunings = useMemo(() => getAllTunings(), []);
  const activeTuning: TuningPreset = allTunings.find((t) => t.id === preferences.selectedTuning) ?? allTunings[0];

  const { presentation, pinTarget, unpinTarget, reset, start, stop } = useAudioEngine(activeTuning);
  const [manualStringId, setManualStringId] = useState<string | null>(null);

  // Figma's screen has no visible Start control - the real flow is PermissionGate requesting mic
  // access upstream, then this screen just listens. PermissionGate isn't wired into the app shell
  // yet (see CLAUDE.md), so this screen starts the engine itself for now; that responsibility
  // moves to PermissionGate once it exists, not duplicated here.
  useEffect(() => {
    void start();
    return () => stop();
  }, [start, stop]);

  const instrument = TUNING_INSTRUMENT[activeTuning.id] ?? 'guitar';
  const title = `${instrument === 'bass' ? 'Bass' : 'Guitar'} ${activeTuning.strings.length}-string`;
  const subtitle = TUNING_SUBTITLE[activeTuning.id] ?? 'Standard';

  function handleAutoModeChange(auto: boolean): void {
    setPreference('autoMode', auto);
    if (auto) {
      unpinTarget();
    } else {
      // Entering Manual is a fresh session, not a continuation of Auto's progress - every string's
      // Tuned badge resets, matching manual tuning's expected "start clean" behavior.
      reset();
      if (manualStringId) {
        pinTarget(manualStringId);
      }
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
    <ViewportScreen
      className={styles.screen}
      footer={<FooterNavigation active="Tuner" onSelect={(tab) => tab === 'Settings' && navigateTo('settings')} />}
    >
      <div className={styles.header}>
        <AppHeader
          variant="Default"
          title={title}
          subtitle={subtitle}
          frequencyLabel={`${preferences.a4Frequency}Hz`}
          autoMode={preferences.autoMode}
          onAutoModeChange={handleAutoModeChange}
          onAccidentalSelect={(accidental) => setPreference('accidental', accidental)}
          onTitlePress={() => navigateTo('select-tuning')}
        />
      </div>

      <div className={styles.main}>
        <div
          className={styles.bgPattern}
          style={{ maskImage: `url(${bgPatternMask})`, WebkitMaskImage: `url(${bgPatternMask})` }}
        >
          <img src={bgPatternLines} alt="" className={styles.bgPatternImg} />
        </div>

        <div className={styles.tuneLineWrap}>
          <div className={styles.tuneLine}>
            <img src={tuneLineAsset} alt="" className={styles.tuneLineImg} />
          </div>
        </div>

        <div className={styles.illustration}>
          {instrument === 'bass' ? <BassIllustration /> : <GuitarIllustration />}
        </div>

        {showPitchInfo && (
          <div
            className={styles.pitchBadge}
            style={{ left: `${badgeLeftPercent(presentation.cents ?? 0)}%` }}
            data-testid="pitch-badge-position"
          >
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
      </div>
    </ViewportScreen>
  );
}
