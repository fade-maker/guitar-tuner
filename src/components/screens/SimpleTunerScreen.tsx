import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';
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
import { useSmoothedCents } from './useSmoothedCents';

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

// SimplePitchBadge's horizontal position tracks how far off-pitch the current reading is.
// Confirmed directly from Figma's Main Screen page: two demo screens were added there (below the
// original In-tune one) specifically to show the circle's position at -200 and +200 cents. Both
// place the circle's own outer edge exactly 16px from the corresponding screen edge (the label
// extends toward screen center in both directions, and the master component itself reverses
// circle/label order for Tune down specifically so the circle stays the edge-flush element - see
// SimplePitchBadge.tsx). -200/+200 is where the badge stops moving entirely ("не будет двигаться"
// per spec) - a hard stop, not an asymptote, so this is a straight linear clamp, replacing the
// previous tanh soft-saturation curve (which had no Figma basis and saturated far too early).
//
// Derivation (402px reference width, matching every other screen-level percentage here):
//   base (0 cents, unchanged from the original In-tune anchor): circle left edge = 179px
//   min (-200 cents): circle left edge = 16px -> offset = 179 - 16 = 163px
//   max (+200 cents): circle right edge = 402 - 16 = 386px -> circle left edge = 342px
//                      -> offset = 342 - 179 = 163px (symmetric, confirming a single linear slope)
const BADGE_BASE_LEFT_PERCENT = 44.527; // 179 / 402
const BADGE_MAX_OFFSET_PERCENT = 40.547; // 163 / 402
const BADGE_MAX_CENTS = 200;
// The circle's own width - needed to convert its desired *left* edge into a *right* edge distance
// for the Tune down case, where the badge is anchored from the screen's right edge instead (see
// the `right`/`left` style switch below).
const BADGE_CIRCLE_WIDTH_PERCENT = 10.945; // 44 / 402

function badgeCircleLeftPercent(cents: number): number {
  const clamped = Math.max(-BADGE_MAX_CENTS, Math.min(BADGE_MAX_CENTS, cents));
  return BADGE_BASE_LEFT_PERCENT + (clamped / BADGE_MAX_CENTS) * BADGE_MAX_OFFSET_PERCENT;
}

// Tune down renders label-then-circle (see SimplePitchBadge.tsx), so the circle sits flush with
// the badge container's own *right* edge instead of its left - positioning via `left` there would
// anchor the label's edge, not the circle's, and the circle would drift as the label's text width
// changes. Every other state keeps the circle-first order, so `left` continues to anchor the
// circle directly, unchanged from before.
function pitchBadgeStyle(state: SimplePitchBadgeState, cents: number): CSSProperties {
  const circleLeftPercent = badgeCircleLeftPercent(cents);
  if (state === 'Tune down') {
    return { left: 'auto', right: `${100 - circleLeftPercent - BADGE_CIRCLE_WIDTH_PERCENT}%` };
  }
  return { left: `${circleLeftPercent}%`, right: 'auto' };
}

// 1€ Filter tuning for the badge's position/number (see useSmoothedCents / oneEuroFilter.ts) -
// engineering/motion-feel choices, not Figma values (Figma has no motion/animation spec anywhere in
// this project - see the Stage 6 motion-architecture log entry). minCutoffHz is the smoothing
// strength while the reading is ~still (lower = more stable, less micro-jitter around In Tune);
// beta controls how quickly the filter opens up (less lag) once the reading is genuinely moving
// fast, so a real pitch change still reads as prompt rather than sluggish; derivativeCutoffHz is the
// standard default from the original 1€ Filter paper for smoothing the speed estimate itself.
const BADGE_SMOOTHING_MIN_CUTOFF_HZ = 1.0;
const BADGE_SMOOTHING_BETA = 0.01;
const BADGE_SMOOTHING_DERIVATIVE_CUTOFF_HZ = 1.0;

export function SimpleTunerScreen(): ReactElement {
  const { preferences, setPreference } = usePreferences();
  const { navigateTo } = useNavigation();
  const allTunings = useMemo(() => getAllTunings(), []);
  const activeTuning: TuningPreset = allTunings.find((t) => t.id === preferences.selectedTuning) ?? allTunings[0];

  const { presentation, pinTarget, unpinTarget, reset, start, stop } = useAudioEngine(activeTuning);
  const [manualStringId, setManualStringId] = useState<string | null>(null);
  const smoothedCents = useSmoothedCents(
    presentation.cents,
    presentation.target?.id ?? null,
    BADGE_SMOOTHING_MIN_CUTOFF_HZ,
    BADGE_SMOOTHING_BETA,
    BADGE_SMOOTHING_DERIVATIVE_CUTOFF_HZ,
  );

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
  // Tune-direction state is deliberately read from the raw (unsmoothed) presentation values, not
  // smoothedCents - correctness of "which way to turn" must never lag behind the real signal, only
  // the badge's continuous position/number are smoothed for visual weight.
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
            style={pitchBadgeStyle(badgeState, smoothedCents ?? 0)}
            data-testid="pitch-badge-position"
          >
            <SimplePitchBadge state={badgeState} cents={Math.abs(Math.round(smoothedCents ?? 0))} />
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
