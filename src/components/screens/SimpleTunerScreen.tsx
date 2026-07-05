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

// SimplePitchBadge's horizontal position tracks how far off-pitch the current reading is, rather
// than staying fixed - confirmed from Figma, which shows the badge at 3 different x-positions
// across its In-tune/Tune-up/Tune-down demo states. Those 3 samples don't give an exact px-per-cent
// slope (their cents values aren't known) or an exact max-travel bound for extreme readings, so the
// ~35px max travel itself (the physical excursion Figma's demo states actually show) is kept as-is
// - only the curve mapping cents to a fraction of that travel changed.
const BADGE_BASE_LEFT_PERCENT = 44.527; // 179 / 402, same anchor as .currentNote
const BADGE_MAX_OFFSET_PERCENT = 8.706; // ~35px / 402px, unchanged from Figma's demo states

// A hard linear clamp at +-50 cents (the original approximation) meant any reading beyond +-50
// landed on the exact same pixel - e.g. -60 and -300 cents were visually indistinguishable, which
// is the "почти в одном месте" defect this replaces. tanh gives a smooth, monotonic soft-saturation
// instead: near 0 it behaves close to linear (fine near-zero sensitivity is preserved), and for
// large |cents| it keeps inching toward the same +-35px bound without ever hard-stopping at one
// specific value, so different "very out of tune" readings stay distinguishable further out. 70 was
// chosen so a +-50 cent reading (the old clamp point) now lands at ~61% of full travel rather than
// 100% - deliberately leaving room for larger deviations to keep moving, per GuitarTuna's own feel.
const BADGE_CENTS_SOFTNESS = 70;

function badgeLeftPercent(cents: number): number {
  const normalized = Math.tanh(cents / BADGE_CENTS_SOFTNESS);
  return BADGE_BASE_LEFT_PERCENT + normalized * BADGE_MAX_OFFSET_PERCENT;
}

// Smoothing time constant for the badge's position/number (see useSmoothedCents) - large enough to
// average out the pitch pipeline's frame-to-frame noise near In Tune (the "дрожание" this fixes),
// small enough that a real, sustained pitch change still reads as prompt rather than sluggish.
const BADGE_SMOOTHING_TAU_MS = 120;

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
    BADGE_SMOOTHING_TAU_MS,
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
    <ViewportScreen className={styles.screen}>
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
            style={{ left: `${badgeLeftPercent(smoothedCents ?? 0)}%` }}
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

      <div className={styles.footer}>
        <FooterNavigation active="Tuner" onSelect={(tab) => tab === 'Settings' && navigateTo('settings')} />
      </div>
    </ViewportScreen>
  );
}
