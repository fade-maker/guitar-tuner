import { useEffect, useMemo, useRef, useState } from 'react';
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
  Icon,
  SegmentedControl,
  StringNoteChip,
} from '../ui';
import bgPatternLines from './assets/bg-pattern-lines.svg';
import bgPatternMask from './assets/bg-pattern-mask.svg';
import styles from './SelectTuningScreen.module.css';
import { CATEGORY_ORDER, TUNING_CATEGORY } from './tuningCategory';
import type { TuningCategory } from './tuningCategory';
import { TUNING_INSTRUMENT } from './tuningInstrument';

// Select Tuning only supports the two instruments with a real string-count redesign in Figma
// (guitar, bass) - per Stage 3's explicit "no ukulele" instruction, not an oversight.
type PickableInstrument = 'guitar' | 'bass';

const INSTRUMENT_OPTIONS: readonly { value: PickableInstrument; label: string }[] = [
  { value: 'guitar', label: 'Guitar 6-string' },
  { value: 'bass', label: 'Bass 4-string' },
];

// Figma's row label reads "Drop-D" on this screen (hyphenated), distinct from Simple Tuner's
// header subtitle spelling - both are screen-level display strings, not the same constant. The
// Power/Open/Extras entries below have no Figma-confirmed row text of their own (that catalog is
// new) - transcribed from the same user-supplied reference used for the tuning data itself, title
// case, matching the short names actually used there. The two Extras entries with a long composite
// name in the reference ("-1; Eb; 'Half step down'" / "-2; 'Whole step down'") show only the
// descriptive phrase here, per explicit instruction - .rowLabel has no room for the rest.
const TUNING_ROW_LABEL: Record<string, string> = {
  'guitar-standard': 'Standard',
  'guitar-drop-d': 'Drop-D',
  'bass-standard': 'Standard',
  'guitar-double-drop-d': 'Double Drop D',
  'guitar-d-modal': 'D modal',
  'guitar-double-daddy': 'Double Daddy',
  'guitar-drop-c-sharp': 'Drop C#',
  'guitar-drop-c': 'Drop C',
  'guitar-drop-b': 'Drop B',
  'guitar-drop-a': 'Drop A',
  'guitar-open-c': 'Open C',
  'guitar-open-e': 'Open E',
  'guitar-open-f': 'Open F',
  'guitar-open-g': 'Open G',
  'guitar-open-a': 'Open A',
  'guitar-open-a-2': 'Open A 2',
  'guitar-open-am': 'Open Am',
  'guitar-open-em': 'Open Em',
  'guitar-open-d': 'Open D',
  'guitar-open-dm': 'Open Dm',
  'guitar-dmaj69': 'Dmaj6/9',
  'guitar-half-step-down': 'Half step down',
  'guitar-whole-step-down': 'Whole step down',
  'guitar-plus-1': '+1',
  'guitar-plus-2': '+2',
  'guitar-g-modal': 'G modal',
  'guitar-all-4th': 'All 4th',
  'guitar-nst': 'NST',
  'bass-drop-d': 'Drop D',
  'bass-e-flat': 'E flat',
  'bass-drop-c': 'Drop C',
  'bass-low-c': 'Low C',
  'bass-low-b': 'Low B',
};

function tuningsForInstrument(allTunings: readonly TuningPreset[], instrument: PickableInstrument): TuningPreset[] {
  return allTunings.filter((tuning) => TUNING_INSTRUMENT[tuning.id] === instrument);
}

// One flat list mixing catalog headers and (only for the expanded catalog) its tunings, in render
// order - lets the existing index>0 "divider before every row but the first" pattern already used
// for Standard's own list apply here too, instead of separately tracking divider state per catalog.
type CatalogRow =
  | { readonly kind: 'header'; readonly category: TuningCategory }
  | { readonly kind: 'tuning'; readonly tuning: TuningPreset };

function buildCatalogRows(
  tunings: readonly TuningPreset[],
  expandedCategory: TuningCategory | null,
): readonly CatalogRow[] {
  const rows: CatalogRow[] = [];
  for (const category of CATEGORY_ORDER) {
    const items = tunings.filter((tuning) => TUNING_CATEGORY[tuning.id] === category);
    if (items.length === 0) continue;
    rows.push({ kind: 'header', category });
    if (expandedCategory === category) {
      for (const tuning of items) rows.push({ kind: 'tuning', tuning });
    }
  }
  return rows;
}

interface TuningRowProps {
  readonly tuning: TuningPreset;
  readonly isPending: boolean;
  readonly accidental: Parameters<typeof midiToNoteName>[1];
  readonly onClick: () => void;
}

// Shared by both the nested rows inside a guitar catalog and Bass's own flat list below (140:1289
// has no catalogs at all - every non-Standard bass tuning is just a plain list, but its rows use
// this exact same "chips under the name" shape, not the old side-by-side one). Chips-under-name is
// only for these non-Standard rows - see .subRow/.subRowContent's own comments for why Standard and
// the catalog headers stay on the old single-line layout.
function TuningRow({ tuning, isPending, accidental, onClick }: TuningRowProps): ReactElement {
  return (
    <button type="button" className={styles.subRow} onClick={onClick}>
      <span className={styles.subRowContent}>
        <span className={styles.rowLabel}>{TUNING_ROW_LABEL[tuning.id] ?? tuning.name}</span>
        <span className={styles.chips}>
          {tuning.strings.map((stringTarget) => {
            const noteName = midiToNoteName(stringTarget.midi, accidental);
            return <StringNoteChip key={stringTarget.id} note={noteName.note} octave={noteName.octave} />;
          })}
        </span>
      </span>
      <CheckIndicator state={isPending ? 'Active' : 'Default'} />
    </button>
  );
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

  // Only one catalog (Power/Open/Extras) open at a time - opening a different one closes whichever
  // was open. Deliberately independent of the scroll/raise position below (see handleCategoryToggle).
  const [expandedCategory, setExpandedCategory] = useState<TuningCategory | null>(null);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const pickerBlockRef = useRef<HTMLDivElement>(null);

  const tunings = tuningsForInstrument(allTunings, instrument);
  // Matched by id suffix, not "absent from TUNING_CATEGORY" - that was only ever true by
  // coincidence for Bass (its own presets just never got added to that guitar-only catalog map),
  // and would have silently broken the moment Bass gained a real catalog of its own.
  const standardTuning = tunings.find((tuning) => tuning.id.endsWith('-standard')) ?? null;
  // Guitar groups everything else into the Power/Open/Extras catalog; Bass has no catalog structure
  // at all yet (140:1289) - its own non-Standard tunings render as one plain list instead (see
  // bassTunings below).
  const catalogRows = instrument === 'guitar' ? buildCatalogRows(tunings, expandedCategory) : [];
  const bassTunings = instrument === 'bass' ? tunings.filter((tuning) => tuning.id !== standardTuning?.id) : [];

  function handleSave(): void {
    setPreference('selectedInstrument', TUNING_INSTRUMENT[pendingTuningId] ?? instrument);
    setPreference('selectedTuning', pendingTuningId);
    navigateTo(preferences.tunerMode === 'advanced' ? 'advanced-tuner' : 'simple-tuner');
  }

  // The screen has exactly two resting scroll positions (CSS scroll-snap, see the module.css) -
  // "idle" (illustration visible) and "raised" (catalog card flush to the top). Expanding a catalog
  // must raise the screen if it isn't already, but per explicit instruction: collapsing a catalog
  // never lowers it back, and expanding a *different* catalog while already raised must not move the
  // scroll position again (checked via scrollTop, not a separate tracked "raised" boolean, so this
  // stays in sync with whatever the user just did manually via swipe).
  //
  // behavior: 'auto' (instant), not 'smooth' - verified directly (real Chromium, not a guess) that
  // scrollIntoView({behavior:'smooth'}) combined with this container's own scroll-snap-type:
  // mandatory reliably stops short of the actual target (~28px into a needed ~368px scroll) instead
  // of completing the scroll - a real, confirmed interaction bug between native smooth-scroll
  // animation and mandatory snap, not something tunable away with a delay or a different easing.
  // 'auto' reaches the exact target every time. Manual swiping between the two positions (the CSS
  // scroll-snap itself) is untouched by this and still animates natively.
  function handleCategoryToggle(category: TuningCategory): void {
    const willExpand = expandedCategory !== category;
    setExpandedCategory(willExpand ? category : null);
    if (willExpand && (scrollAreaRef.current?.scrollTop ?? 0) <= 0) {
      pickerBlockRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  }

  // Trial fix (see CLAUDE.md's "third scroll state" entry) - `scroll-snap-type: proximity` only
  // pulls toward idle/raised when a gesture already ends near one of them, so a slow/gentle swipe
  // can park the scroll at neither: title half-hidden, illustration half-clipped, catalog cards
  // half-raised. This corrects that ~120ms after scrolling actually stops.
  //
  // Correction only ever applies to scrollTop strictly between 0 and raisedScrollTop - `.topBlock`
  // (368px, scroll-snap-align:start) ends exactly where `.pickerBlock` (also scroll-snap-align:
  // start) begins, so that open interval has no legitimate resting content of its own; it's purely
  // "in transit" between the two real states. `.pickerBlock`'s own `min-height: 100%` (see its
  // comment in the module.css) guarantees it - and everything below it - is always at least one
  // full viewport tall, so scrollTop >= raisedScrollTop is *always* real, independently scrollable
  // catalog content, never another ambiguous gap - deliberately left untouched here so scrolling
  // through a long expanded catalog (e.g. Open's 11 tunings) keeps working exactly as before,
  // without reproducing the "mandatory blocks scrolling a long catalog" bug proximity was chosen to
  // avoid in the first place (see .scrollArea's own comment). An earlier version of this fix tried
  // to gate on comparing scrollHeight/clientHeight instead - that condition was always false because
  // of the same min-height:100% (plus `.scrollSpacer`'s constant 180px), so the correction never
  // actually ran; this scrollTop-range check is what replaced it.
  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    const pickerBlock = pickerBlockRef.current;
    if (!scrollArea || !pickerBlock) return;

    let timeoutId: number | undefined;

    function correctSnap(): void {
      if (!scrollArea || !pickerBlock) return;
      const raisedScrollTop = pickerBlock.offsetTop;
      const current = scrollArea.scrollTop;
      if (current <= 0 || current >= raisedScrollTop) return;

      const nearest = current < raisedScrollTop / 2 ? 0 : raisedScrollTop;
      // 'auto' (instant), not 'smooth' - handleCategoryToggle's own comment above documents why:
      // smooth scroll combined with this container's scroll-snap reliably stops short of target.
      scrollArea.scrollTo({ top: nearest, behavior: 'auto' });
    }

    function handleScroll(): void {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(correctSnap, 120);
    }

    scrollArea.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      scrollArea.removeEventListener('scroll', handleScroll);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    // Select Tuning has no Bottom Navigation (removed from Figma) - it's simply absent from
    // AppShell.tsx's SCREENS_WITHOUT_FOOTER exceptions, not something this screen decides itself.
    <div className={styles.screen}>
      {/* Fixed above everything (including the scrolling content below), per Figma's own "Rectangle
          8" node - present at the same position whether the screen is idle or raised, so scrolled
          content fades smoothly under it instead of cutting off sharply. */}
      <div className={styles.topScrim} aria-hidden="true" />

      <div className={styles.scrollArea} ref={scrollAreaRef}>
        <div className={styles.topBlock}>
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
        </div>

        <div className={styles.pickerBlock} ref={pickerBlockRef}>
          <SegmentedControl options={INSTRUMENT_OPTIONS} value={instrument} onChange={setInstrument} />

          {/* Standard is its own card now, not the first row of a flat list - Figma split it out
              (74:4406) once the catalog below grew large enough to need its own collapsible
              structure. Never expands/collapses; behaves exactly like it always did. */}
          {standardTuning && (
            <div className={styles.card}>
              <button
                type="button"
                className={styles.row}
                onClick={() => setPendingTuningId(standardTuning.id)}
              >
                <span className={styles.rowLabel}>{TUNING_ROW_LABEL[standardTuning.id] ?? standardTuning.name}</span>
                <span className={styles.rowRight}>
                  <span className={styles.chips}>
                    {standardTuning.strings.map((stringTarget) => {
                      const noteName = midiToNoteName(stringTarget.midi, preferences.accidental);
                      return <StringNoteChip key={stringTarget.id} note={noteName.note} octave={noteName.octave} />;
                    })}
                  </span>
                  <CheckIndicator state={pendingTuningId === standardTuning.id ? 'Active' : 'Default'} />
                </span>
              </button>
            </div>
          )}

          {/* Power/Open/Extras - a second card, only rendered once there's at least one catalog with
              data for the current instrument. */}
          {catalogRows.length > 0 && (
            <div className={styles.card}>
              {catalogRows.map((row, index) => (
                <div key={row.kind === 'header' ? row.category : row.tuning.id}>
                  {index > 0 && <hr className={styles.divider} />}
                  {row.kind === 'header' ? (
                    <button
                      type="button"
                      className={styles.row}
                      onClick={() => handleCategoryToggle(row.category)}
                      aria-expanded={expandedCategory === row.category}
                    >
                      <span className={styles.rowLabel}>{row.category}</span>
                      <span
                        className={classNames(
                          styles.chevron,
                          expandedCategory !== row.category && styles.chevronCollapsed,
                        )}
                      >
                        <Icon name="arrow-down" size={16} />
                      </span>
                    </button>
                  ) : (
                    <TuningRow
                      tuning={row.tuning}
                      isPending={pendingTuningId === row.tuning.id}
                      accidental={preferences.accidental}
                      onClick={() => setPendingTuningId(row.tuning.id)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Bass's own tuning list (140:1289) - a plain list, no catalogs/headers at all, always
              fully visible (nothing to expand) - same row shape as a guitar catalog's nested
              tunings (TuningRow), just without any accordion state driving it. */}
          {bassTunings.length > 0 && (
            <div className={styles.card}>
              {bassTunings.map((tuning, index) => (
                <div key={tuning.id}>
                  {index > 0 && <hr className={styles.divider} />}
                  <TuningRow
                    tuning={tuning}
                    isPending={pendingTuningId === tuning.id}
                    accidental={preferences.accidental}
                    onClick={() => setPendingTuningId(tuning.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.scrollSpacer} aria-hidden="true" />
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
