import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { getAllTunings, midiToNoteName } from '../../music-theory';
import type { TuningPreset } from '../../music-theory';
import { useNavigation } from '../../navigation';
import { usePreferences } from '../../preferences';
import { classNames } from '../ui/classNames';
import {
  BassIllustrationSmall,
  Button,
  CheckIndicator,
  GuitarIllustrationSmall,
  SegmentedControl,
  StringNoteChip,
} from '../ui';
import bgPatternLines from './assets/bg-pattern-lines.svg';
import bgPatternMask from './assets/bg-pattern-mask.svg';
import styles from './SelectTuningScreen.module.css';
import { TUNING_INSTRUMENT } from './tuningInstrument';

// Select Tuning only supports the two instruments with a real string-count redesign in Figma
// (guitar, bass) - per Stage 3's explicit "no ukulele" instruction, not an oversight.
type PickableInstrument = 'guitar' | 'bass';

const INSTRUMENT_OPTIONS: readonly { value: PickableInstrument; label: string }[] = [
  { value: 'guitar', label: 'Guitar 6-string' },
  { value: 'bass', label: 'Bass 4-string' },
];

// Figma's row label reads "Drop-D" on this screen (hyphenated), distinct from Simple Tuner's
// header subtitle spelling - both are screen-level display strings, not the same constant.
const TUNING_ROW_LABEL: Record<string, string> = {
  'guitar-standard': 'Standard',
  'guitar-drop-d': 'Drop-D',
  'bass-standard': 'Standard',
};

function tuningsForInstrument(allTunings: readonly TuningPreset[], instrument: PickableInstrument): TuningPreset[] {
  return allTunings.filter((tuning) => TUNING_INSTRUMENT[tuning.id] === instrument);
}

export function SelectTuningScreen(): ReactElement {
  const { preferences, setPreference } = usePreferences();
  const { navigateTo } = useNavigation();
  const allTunings = useMemo(() => getAllTunings(), []);

  const initialInstrument: PickableInstrument = preferences.selectedInstrument === 'bass' ? 'bass' : 'guitar';
  const [instrument, setInstrument] = useState<PickableInstrument>(initialInstrument);

  // Tapping a row used to apply + navigate immediately (see CLAUDE.md's Save-button entry for why
  // that changed). Now it only updates this pending choice - `instrument` (the SegmentedControl tab)
  // is a pure view filter for which tuning list is shown and can be browsed freely without touching
  // this; picking a tuning on either tab always overwrites the one pending selection, since tuning
  // ids are already instrument-prefixed and globally unique (no need to track instrument alongside
  // it - TUNING_INSTRUMENT recovers it from the id at Save time). Starts at the already-persisted
  // tuning so the currently-active one still shows checked before anything is tapped.
  const [pendingTuningId, setPendingTuningId] = useState<string>(preferences.selectedTuning);

  const tunings = tuningsForInstrument(allTunings, instrument);

  function handleSave(): void {
    setPreference('selectedInstrument', TUNING_INSTRUMENT[pendingTuningId] ?? instrument);
    setPreference('selectedTuning', pendingTuningId);
    navigateTo(preferences.tunerMode === 'advanced' ? 'advanced-tuner' : 'simple-tuner');
  }

  return (
    // Select Tuning has no Bottom Navigation (removed from Figma) - it's simply absent from
    // AppShell.tsx's SCREENS_WITHOUT_FOOTER exceptions, not something this screen decides itself.
    <div className={styles.screen}>
      <div
        className={styles.bgPattern}
        style={{ maskImage: `url("${bgPatternMask}")`, WebkitMaskImage: `url("${bgPatternMask}")` }}
      >
        <img src={bgPatternLines} alt="" className={styles.bgPatternImg} />
      </div>

      <span className={styles.title}>Select tuning</span>

      <div className={classNames(styles.illustration, instrument === 'bass' && styles.illustrationBass)}>
        {instrument === 'bass' ? <BassIllustrationSmall /> : <GuitarIllustrationSmall />}
      </div>

      <div className={styles.pickerBlock}>
        <SegmentedControl options={INSTRUMENT_OPTIONS} value={instrument} onChange={setInstrument} />

        <div className={styles.card}>
          {tunings.map((tuning, index) => (
            <div key={tuning.id}>
              {index > 0 && <hr className={styles.divider} />}
              <button type="button" className={styles.row} onClick={() => setPendingTuningId(tuning.id)}>
                <span className={styles.rowLabel}>{TUNING_ROW_LABEL[tuning.id] ?? tuning.name}</span>
                <span className={styles.rowRight}>
                  <span className={styles.chips}>
                    {tuning.strings.map((stringTarget) => {
                      const noteName = midiToNoteName(stringTarget.midi, preferences.accidental);
                      return <StringNoteChip key={stringTarget.id} note={noteName.note} octave={noteName.octave} />;
                    })}
                  </span>
                  <CheckIndicator state={pendingTuningId === tuning.id ? 'Active' : 'Default'} />
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Figma: "Frame 1" (174:1392) - a Save button in the same gradient/blur band treatment as
          Bottom Navigation's own footer, sitting at the very bottom of the screen. Commits
          pendingTuningId to preferences and navigates - the same two setPreference calls +
          navigateTo that used to fire on every row tap, now gated behind this press instead. */}
      <div className={styles.saveBar}>
        <div className={styles.saveButton}>
          <Button variant="primary" size="large" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
