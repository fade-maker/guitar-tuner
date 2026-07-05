import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { getAllTunings, midiToNoteName } from '../../music-theory';
import type { TuningPreset } from '../../music-theory';
import { useNavigation } from '../../navigation';
import { usePreferences } from '../../preferences';
import type { InstrumentId } from '../../preferences';
import {
  BassIllustration,
  CheckIndicator,
  FooterNavigation,
  GuitarIllustration,
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

// Figma shows each instrument's headstock photo at a different box size within this screen
// (guitar 155x290, bass 173x307) than the smaller Simple Tuner illustration slot (253x474 native).
// Rather than duplicating GuitarIllustration/BassIllustration's photo assets at a second size,
// these scale the same 253x474 native render down to Figma's box here.
const INSTRUMENT_VISUAL: Record<PickableInstrument, { top: string; scale: number }> = {
  guitar: { top: '20.595%', scale: 155.302 / 253 },
  bass: { top: '18.764%', scale: 173 / 253 },
};

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
  const visual = INSTRUMENT_VISUAL[instrument];

  function handleSelectTuning(tuning: TuningPreset): void {
    setPreference('selectedInstrument', instrument as InstrumentId);
    setPreference('selectedTuning', tuning.id);
    navigateTo(preferences.tunerMode === 'advanced' ? 'advanced-tuner' : 'simple-tuner');
  }

  return (
    <div className={styles.screen}>
      <div
        className={styles.bgPattern}
        style={{ maskImage: `url(${bgPatternMask})`, WebkitMaskImage: `url(${bgPatternMask})` }}
      >
        <img src={bgPatternLines} alt="" className={styles.bgPatternImg} />
      </div>

      <span className={styles.title}>Select tuning</span>

      <div className={styles.illustration} style={{ top: visual.top }}>
        <div className={styles.illustrationScale} style={{ transform: `scale(${visual.scale})` }}>
          {instrument === 'bass' ? <BassIllustration /> : <GuitarIllustration />}
        </div>
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

      <div className={styles.footer}>
        <FooterNavigation
          active="Tuner"
          onSelect={(tab) => tab === 'Settings' && navigateTo('settings')}
        />
      </div>
    </div>
  );
}
