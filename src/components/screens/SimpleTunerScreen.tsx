import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useAudioEngine } from '../../hooks';
import { getAllTunings, midiToNoteName } from '../../music-theory';
import type { StringTarget, TuningPreset } from '../../music-theory';
import { useNavigation } from '../../navigation';
import { usePreferences } from '../../preferences';
import { classNames } from '../ui/classNames';
import {
  AppHeader,
  BassIllustration,
  CurrentTargetNote,
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
// half, forward, on the right (e.g. 6-string -> left [D,A,E], right [G,B,E]).
//
// Bass is a real, separate Figma layout, not this same split generalized to 4 strings: the "Guitar
// tuner - Bass" frame (144:1976, still the pre-redesign raw-shape mockup per the Stage 2 report,
// but confirmed by explicit request as the layout to match) shows all 4 strings in a single left
// column, highest string at top - strings[] is stored low-to-high (E,A,D,G), so this is the full
// array reversed into `left`, with `right` empty.
function splitStringColumns(
  strings: readonly StringTarget[],
  instrument: string,
): {
  left: readonly StringTarget[];
  right: readonly StringTarget[];
} {
  if (instrument === 'bass') {
    return { left: [...strings].reverse(), right: [] };
  }
  const half = Math.ceil(strings.length / 2);
  return { left: [...strings.slice(0, half)].reverse(), right: strings.slice(half) };
}

// SimplePitchBadge's horizontal position tracks how far off-pitch the current reading is, rather
// than staying fixed - confirmed from Figma, which shows the badge at 3 different x-positions
// across its In-tune/Tune-up/Tune-down demo states. Those 3 samples don't give an exact px-per-cent
// slope (their cents values aren't known), so this is a bounded linear approximation over ±50 cents,
// unchanged - only BADGE_MAX_OFFSET_PERCENT (how far that same ±50-cent range travels) changed.
const BADGE_BASE_LEFT_PERCENT = 44.527; // 179 / 402, same anchor as .currentNote
// 163 / 402 = the circle's own left edge reaching 16px from the screen's left edge (and,
// symmetrically, its right edge reaching 16px from the right edge) - the same 16px margin this
// screen already uses elsewhere (.stringContainer's padding is var(--space-16)), not a new number
// invented for this badge. This is the physical maximum this badge can travel before running past
// that established margin; ±50 cents (unchanged) now reaches that maximum instead of stopping at a
// small fraction of it, per an explicit request to make the same cents range travel further without
// touching the clamp bound, the linear formula, or anything else about the mechanic.
const BADGE_MAX_OFFSET_PERCENT = 40.547; // 163 / 402
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

  const { presentation, pinTarget, unpinTarget, reset, start, stop } = useAudioEngine(
    activeTuning,
    preferences.a4Frequency,
  );
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
    // Manual mode's currently-picked string had no visual feedback at all before a reading actually
    // confirmed it - clicking a string just silently pinned it. 'Selected' (Figma's new "Stelected"
    // state) fills that gap: shown for the picked string as long as it isn't already In tune/Tuned.
    if (!preferences.autoMode && manualStringId === target.id) return 'Selected';
    return 'Default';
  }

  const { left, right } = splitStringColumns(activeTuning.strings, instrument);
  // 3-per-column (guitar) fills the band top-down, matching Figma. Bass's single 4-string column is
  // vertically centered in the same band (confirmed from 144:1976: its column sits 10px from both
  // the top and bottom of its 276px-tall container - symmetric, i.e. centered) with its own 16px
  // gap (68px between string centers - 52px button height = 16px), not guitar's 24px.
  const columnClassName = classNames(
    styles.column,
    right.length === 0 && styles.columnCentered,
    instrument === 'bass' && styles.columnBass,
  );

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
          style={{ maskImage: `url("${bgPatternMask}")`, WebkitMaskImage: `url("${bgPatternMask}")` }}
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

        <div className={classNames(styles.stringContainer, instrument === 'bass' && styles.stringContainerBass)}>
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
          {right.length > 0 && (
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
          )}
        </div>
      </div>
    </div>
  );
}
