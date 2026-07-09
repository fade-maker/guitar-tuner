import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useAudioEngine } from '../hooks';
import { getAllTunings, midiToNoteName } from '../music-theory';
import type { Accidental, StringTarget, TuningPreset } from '../music-theory';
import { usePreferences } from '../preferences';
import type { InstrumentId } from '../preferences';

// Temporary. This mapping belongs on TuningPreset itself (or a real lookup) once Select Tuning is
// actually implemented - it's hand-rolled here only so this throwaway panel can group tunings by
// instrument, per Stage 1's note that this data-model question wasn't the settings layer's to solve.
const TUNING_INSTRUMENT: Record<string, InstrumentId> = {
  'guitar-standard': 'guitar',
  'guitar-drop-d': 'guitar',
  'bass-standard': 'bass',
  'ukulele-standard': 'ukulele',
};

const INSTRUMENTS: readonly InstrumentId[] = ['guitar', 'bass', 'ukulele'];

export function DebugSettingsPanel(): ReactElement {
  const { preferences, setPreference } = usePreferences();
  const allTunings = useMemo(() => getAllTunings(), []);

  const tuningsForInstrument = useMemo(
    () => allTunings.filter((tuning) => TUNING_INSTRUMENT[tuning.id] === preferences.selectedInstrument),
    [allTunings, preferences.selectedInstrument],
  );

  const activeTuning: TuningPreset =
    tuningsForInstrument.find((tuning) => tuning.id === preferences.selectedTuning) ??
    tuningsForInstrument[0] ??
    allTunings[0];

  const { presentation, engineStatus, error, frequency, isRunning, start, stop, pinTarget, unpinTarget } =
    useAudioEngine(activeTuning, preferences.a4Frequency);

  // Independent of presentation.target on purpose: pinTarget() only takes effect once the engine
  // is running and a reading/tick arrives, but this control must always show what was selected so
  // it can be compared against the live output below to verify the presenter actually applied it.
  const [manualStringId, setManualStringId] = useState<string>(activeTuning.strings[0]?.id ?? '');

  function handleInstrumentChange(instrument: InstrumentId): void {
    setPreference('selectedInstrument', instrument);
    const firstTuning = allTunings.find((tuning) => TUNING_INSTRUMENT[tuning.id] === instrument);
    if (firstTuning) {
      setPreference('selectedTuning', firstTuning.id);
      setManualStringId(firstTuning.strings[0]?.id ?? '');
    }
  }

  function handleTuningChange(tuningId: string): void {
    setPreference('selectedTuning', tuningId);
    const tuning = allTunings.find((t) => t.id === tuningId);
    setManualStringId(tuning?.strings[0]?.id ?? '');
  }

  function handleAutoModeChange(auto: boolean): void {
    setPreference('autoMode', auto);
    if (auto) {
      unpinTarget();
    } else {
      pinTarget(manualStringId);
    }
  }

  function handleManualStringChange(stringId: string): void {
    setManualStringId(stringId);
    if (!preferences.autoMode) {
      pinTarget(stringId);
    }
  }

  function handleA4Change(value: number): void {
    if (!Number.isFinite(value) || value <= 0) return;
    setPreference('a4Frequency', value);
  }

  const displayedStrings = preferences.leftHanded ? [...activeTuning.strings].reverse() : activeTuning.strings;

  return (
    <main style={{ fontFamily: 'monospace', padding: 16, maxWidth: 720 }}>
      <h1>Debug Settings Panel</h1>
      <p>
        Throwaway validation harness for presenter/business logic - no Figma components, no styling. Delete{' '}
        <code>debug.html</code> and <code>src/debug/</code> when the real UI replaces this.
      </p>

      <fieldset>
        <legend>Engine</legend>
        <button onClick={isRunning ? stop : start} disabled={engineStatus === 'requesting-permission'}>
          {engineStatus === 'requesting-permission' ? 'Requesting mic access…' : isRunning ? 'Stop' : 'Start'}
        </button>{' '}
        status: <b>{engineStatus}</b>
        {error && (
          <p style={{ color: 'red' }}>
            error: {error.reason} - {error.message}
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend>Instrument</legend>
        {INSTRUMENTS.map((instrument) => (
          <label key={instrument} style={{ marginRight: 12 }}>
            <input
              type="radio"
              name="instrument"
              checked={preferences.selectedInstrument === instrument}
              onChange={() => handleInstrumentChange(instrument)}
            />
            {instrument}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Tuning</legend>
        <select value={activeTuning.id} onChange={(e) => handleTuningChange(e.target.value)}>
          {tuningsForInstrument.map((tuning) => (
            <option key={tuning.id} value={tuning.id}>
              {tuning.name}
            </option>
          ))}
        </select>
      </fieldset>

      <fieldset>
        <legend>Auto / Manual</legend>
        <label style={{ marginRight: 12 }}>
          <input type="radio" name="automode" checked={preferences.autoMode} onChange={() => handleAutoModeChange(true)} />
          Auto
        </label>
        <label>
          <input
            type="radio"
            name="automode"
            checked={!preferences.autoMode}
            onChange={() => handleAutoModeChange(false)}
          />
          Manual
        </label>
        {!preferences.autoMode && (
          <div>
            manual string:{' '}
            <select value={manualStringId} onChange={(e) => handleManualStringChange(e.target.value)}>
              {activeTuning.strings.map((target: StringTarget) => (
                <option key={target.id} value={target.id}>
                  {target.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </fieldset>

      <fieldset>
        <legend>A4 calibration</legend>
        <button onClick={() => handleA4Change(preferences.a4Frequency - 1)}>−</button>{' '}
        <input
          type="number"
          value={preferences.a4Frequency}
          onChange={(e) => handleA4Change(Number(e.target.value))}
          style={{ width: 60 }}
        />{' '}
        Hz <button onClick={() => handleA4Change(preferences.a4Frequency + 1)}>+</button>{' '}
        <button onClick={() => handleA4Change(440)}>Reset</button>
      </fieldset>

      <fieldset>
        <legend>Notation</legend>
        {(['sharp', 'flat'] as const satisfies readonly Accidental[]).map((accidental) => (
          <label key={accidental} style={{ marginRight: 12 }}>
            <input
              type="radio"
              name="accidental"
              checked={preferences.accidental === accidental}
              onChange={() => setPreference('accidental', accidental)}
            />
            {accidental}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Tuner mode (stored only - no computed effect yet)</legend>
        <label style={{ marginRight: 12 }}>
          <input
            type="radio"
            name="tunerMode"
            checked={preferences.tunerMode === 'simple'}
            onChange={() => setPreference('tunerMode', 'simple')}
          />
          Simple
        </label>
        <label>
          <input
            type="radio"
            name="tunerMode"
            checked={preferences.tunerMode === 'advanced'}
            onChange={() => setPreference('tunerMode', 'advanced')}
          />
          Advanced
        </label>
      </fieldset>

      <fieldset>
        <legend>Left-handed (stored only - reverses the string list below)</legend>
        <label>
          <input
            type="checkbox"
            checked={preferences.leftHanded}
            onChange={(e) => setPreference('leftHanded', e.target.checked)}
          />
          left-handed
        </label>
      </fieldset>

      <fieldset>
        <legend>Live output</legend>
        <table>
          <tbody>
            <tr>
              <td>frequency</td>
              <td>{frequency !== null ? `${frequency.toFixed(2)} Hz` : '—'}</td>
            </tr>
            <tr>
              <td>state</td>
              <td>{presentation.state}</td>
            </tr>
            <tr>
              <td>target</td>
              <td>
                {presentation.target
                  ? `${presentation.target.label} (${midiToNoteName(presentation.target.midi, preferences.accidental).note}${midiToNoteName(presentation.target.midi, preferences.accidental).octave})`
                  : '—'}
              </td>
            </tr>
            <tr>
              <td>cents</td>
              <td>{presentation.cents !== null ? presentation.cents.toFixed(1) : '—'}</td>
            </tr>
            <tr>
              <td>inTune</td>
              <td>{String(presentation.inTune)}</td>
            </tr>
            <tr>
              <td>hapticTrigger</td>
              <td>{String(presentation.hapticTrigger)}</td>
            </tr>
            <tr>
              <td>tunedTargetIds</td>
              <td>{Array.from(presentation.tunedTargetIds).join(', ') || '—'}</td>
            </tr>
          </tbody>
        </table>

        <p>strings in {activeTuning.name}:</p>
        <ul>
          {displayedStrings.map((target: StringTarget) => (
            <li key={target.id}>
              {target.label} (id {target.id}){target.id === presentation.target?.id ? ' ← current target' : ''}
              {presentation.tunedTargetIds.has(target.id) ? ' [tuned]' : ''}
            </li>
          ))}
        </ul>
      </fieldset>
    </main>
  );
}
