import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { getAllTunings, midiToNoteName } from '../../music-theory';
import type { TuningPreset } from '../../music-theory';
import { useNavigation } from '../../navigation';
import { usePreferences } from '../../preferences';
import type { InstrumentId } from '../../preferences';
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

  const tunings = tuningsForInstrument(allTunings, instrument);

  function handleSelectTuning(tuning: TuningPreset): void {
    setPreference('selectedInstrument', instrument as InstrumentId);
    setPreference('selectedTuning', tuning.id);
    navigateTo(preferences.tunerMode === 'advanced' ? 'advanced-tuner' : 'simple-tuner');
  }

  return (
    // Select Tuning has no Bottom Navigation (removed from Figma) - it's simply absent from
    // AppShell.tsx's SCREENS_WITHOUT_FOOTER exceptions, not something this screen decides itself.
    <div className={styles.screen}>
      <div
        className={styles.bgPattern}
        style={{ maskImage: `url(${bgPatternMask})`, WebkitMaskImage: `url(${bgPatternMask})` }}
      >
        <img src={bgPatternLines} alt="" className={styles.bgPatternImg} />
      </div>

      <span className={styles.title}>Select tuning</span>

      <div className={styles.illustration}>
        {instrument === 'bass' ? <BassIllustrationSmall /> : <GuitarIllustrationSmall />}
      </div>

      <div className={styles.pickerBlock}>
        <SegmentedControl options={INSTRUMENT_OPTIONS} value={instrument} onChange={setInstrument} />

        <div className={styles.card}>
          {tunings.map((tuning, index) => (
            <div key={tuning.id}>
              {index > 0 && <hr className={styles.divider} />}
              <button type="button" className={styles.row} onClick={() => handleSelectTuning(tuning)}>
                <span className={styles.rowLabel}>{TUNING_ROW_LABEL[tuning.id] ?? tuning.name}</span>
                <span className={styles.rowRight}>
                  <span className={styles.chips}>
                    {tuning.strings.map((stringTarget) => {
                      const noteName = midiToNoteName(stringTarget.midi, preferences.accidental);
                      return <StringNoteChip key={stringTarget.id} note={noteName.note} octave={noteName.octave} />;
                    })}
                  </span>
                  <CheckIndicator state={preferences.selectedTuning === tuning.id ? 'Active' : 'Default'} />
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Figma: "Frame 1" (174:1392), added after this screen's earlier stages shipped - a Save
          button in the same gradient/blur band treatment as Bottom Navigation's own footer, sitting
          at the very bottom of the screen. Visual only for now, per instruction: rows still apply
          + navigate immediately on tap (handleSelectTuning, unchanged above) - this button doesn't
          gate that yet. Wiring it to actually hold a pending selection until Save is pressed is
          deferred to its own pass. */}
      <div className={styles.saveBar}>
        <div className={styles.saveButton}>
          <Button variant="primary" size="large" onClick={() => {}}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
