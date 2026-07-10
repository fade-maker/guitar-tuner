# Guitar Tuner Project

## Goal

Build a premium-quality Telegram Mini App guitar tuner comparable in UX quality to GuitarTuna.

## Tech Stack

- React
- TypeScript
- Vite
- Web Audio API

## Architecture

Keep business logic separate from React UI.

Never mix audio processing with UI rendering.

There are two tuner experiences.

Simple Tuner
- Headstock
- CurrentNote
- PitchLabel

Advanced Tuner
- Circular Gauge
- StatusLabel

These are different interfaces.

Components are intentionally different and must not be merged simply because they display similar information.

## Code Style

- TypeScript strict
- Small focused files
- Single responsibility
- No unnecessary dependencies

## Priorities

1. Audio quality
2. Stable pitch detection
3. Smooth animations
4. Clean architecture
5. Beautiful UI

## Rules

Do not generate large implementations without discussing the architecture first.

Always explain the plan before writing code.

Avoid rewriting unrelated files.

The goal is not to recreate the Telegram Mini App shell.

Only implement the application UI itself.

The Telegram header, navigation, safe areas, status bar and surrounding interface shown in Figma are reference only and must never be recreated in React.

Treat every frame named:
- system
- telegram
- ios
- don't copy
- reference
- shell

as non-exportable reference material.

Figma is the single source of truth for every UI component.

- Never recreate or approximate a component from memory - always inspect Figma directly.
- Before modifying any UI component, inspect the master component in Figma, not only the instance
  placed on a screen.
- Never "improve" the design unilaterally.
- If the master component is inconsistent, incomplete, missing states, missing tokens, has
  conflicting values, or appears incorrectly built in Figma, stop and report it instead of
  implementing your own version.
- If MCP cannot extract a value, or Figma does not specify one, do not guess - report exactly what
  is missing.
- If a Figma-side change is what's actually needed, explain exactly which component, which
  property, and why, then wait for that change instead of compensating for it in code.
- Never compensate for a design issue with CSS tricks, invented spacing, gradients, blur values,
  animations, or any other visual behavior not defined in Figma.
- Never claim a component matches Figma until re-checking the current master component after
  implementing.

## Architecture log

### Stage 1 — AppPreferences (`src/preferences/`)

What: a settings layer independent of the audio engine - `tunerMode`, `accidental`,
`selectedInstrument`, `selectedTuning`, `autoMode`, `a4Frequency`, `leftHanded`, `haptics`,
`animations`. Exposed via `PreferencesProvider` (Context) + `usePreferences()` (hook), persisted to
`localStorage` under a versioned envelope (`{ version, preferences }`).

Why: every mockup behaviour (Simple/Advanced switch, ♭/♯, Auto/Manual, A4 calibration,
left-handed, haptics, animations) needs one durable place to live that neither the DSP pipeline nor
any particular screen owns.

Decisions:
- `accidental` reuses `music-theory`'s existing `Accidental` type rather than redeclaring it.
- `selectedInstrument`/`selectedTuning` are typed here, not added onto `TuningPreset` in
  `music-theory` - whether a tuning preset should carry its own `instrument` field is a Select
  Tuning implementation question, not a settings-layer one. Revisit when that screen is built.
- Migrations are schema-version-gated (`PREFERENCES_SCHEMA_VERSION`), but a merge over
  `DEFAULT_PREFERENCES` already backfills any newly-added field for existing users without a
  migration entry - the `MIGRATIONS` array is only for shape changes a spread can't repair
  (renames, reshapes), and is empty today since this is the first schema version.
- Context and Provider live in separate files (`context.ts` / `PreferencesContext.tsx`) - required
  by `react-refresh/only-export-components`, not a style preference.

Not yet done: not wired into `App.tsx`/`main.tsx` - nothing reads or writes these preferences yet.
That wiring happens once a screen actually needs a given field.

### Stage 2 — Presentation API extension (`src/presentation/tunerPresenter.ts`)

What: `TunerPresenterConfig` gained an optional `a4` (defaults to `DEFAULT_A4_FREQUENCY`);
`TunerPresenter` gained `setA4()`, `pinTarget(id)`, `unpinTarget()`; `TunerPresentationState`
gained `tunedTargetIds: ReadonlySet<string>`. `useAudioEngine()`'s return value passes
`setA4`/`pinTarget`/`unpinTarget` straight through to the presenter.

Why: A4 calibration, Manual string-pinning and the "Tuned" StringControl state are all mockup
requirements with no DSP dependency - `findNearestTarget`/`midiToFrequency`/`centsBetween` in
`music-theory` already accepted an `a4` parameter before this stage, so calibration is a
pass-through, not new math. Nothing in `audio-engine/` (microphone, worklets, pitch detection,
signal/*) changed.

Decisions and one bug caught while implementing:
- `tunedTargetIds` survives brief signal loss (`tick()`'s `lost`/`searching` transitions) and is
  only cleared by `reset()` or `setTargets()` - a guitarist pausing between strings must not lose
  "already tuned" progress just because `tick()` briefly reports `lost`.
- **Found while writing tests, not asked for**: `StringTarget.id` is a string-position slot
  (`'1'..'6'`), not a globally unique id - the same id means a different physical string in a
  guitar preset than in a bass preset. A pin or a tuned-id surviving a `setTargets()` preset switch
  would silently resolve against the wrong string. Fixed by having `setTargets()` clear both the
  pin and `tunedTargetIds`, and by refreshing `cachedState.tunedTargetIds` immediately inside
  `setTargets()` (unlike `target`/`cents`, which intentionally still take effect only on the next
  reading, per the existing `setTargets` test).
- `pinTarget()`/`unpinTarget()` are the two explicit methods (not a single `pinTarget(id | null)`)
  to match the requested API shape. `resolveMatch()` falls back to auto-detection if the pinned id
  doesn't match any current target - a real input-boundary guard (caller error), not defensive code
  for an unreachable case.
- Test suite extended (`tunerPresenter.test.ts`) to cover all of the above; 221 tests passing.

Not yet done: nothing reads `AppPreferences.autoMode`/`a4Frequency` to call these - no screen exists
yet to drive them.

### Stage 3 — Project structure (`src/components/{ui,layout}/`, `src/providers/`)

What: added `components/ui/` and `components/layout/` as empty, documented scaffolds; added
`providers/` with `AppProviders` - a single composition root that nests every app-level context
provider (currently just `PreferencesProvider`) so `App.tsx` never has to know the wrapping order.

Why: gives Stage 0+ of the implementation roadmap (see the UI spec artifact) a home to land in
without inventing folder structure mid-build.

Decisions:
- Existing component folders (`components/TunerGauge`, `StringSelector`, `Header`,
  `PermissionGate`) were left exactly where they are - moving already-placed code without a reason
  was explicitly out of scope for this pass.
- `components/screens/` was deliberately not created empty here - it gets created already-populated
  in the routing stage (Stage 5) instead of as a two-step empty-then-filled scaffold.

Not yet done: `AppProviders` is not mounted in `main.tsx` - `App.tsx` is untouched, on purpose, so
the existing debug harness for manually testing the real audio engine keeps working until a real
screen is ready to replace it.

Next: routing stubs, motion architecture.

### Stage 4 — Theme layer (`src/theme/`)

What: `colors.ts`, `radius.ts`, `spacing.ts`, `typography.ts`, `shadows.ts`, `animation.ts`, plus an
aggregate `ThemeTokens` interface in `index.ts`. Every file is types only - no default values, no
CSS, no components.

Why: gives Figma tokens a typed destination to land in later, without guessing at values the UI
spec's punch list already flagged as unresolved (six near-black surfaces with no elevation system,
no named spacing scale, 4 mis-scaled type line-heights, an unnamed shadow/blur composite effect,
zero animation designs in Figma at all).

Decisions:
- Deliberately populated with **zero** real values, including ones that look "safe" (e.g.
  `radius.full` is a real bound Figma variable already) - keeping every token file the same
  shape-only treatment avoids an inconsistent "why does this one have data and this one doesn't."
- `theme/animation.ts` holds only raw primitives (durations, easing curves). Composed, reusable
  presets (fade/scale/slide/spring) are Stage 6's `src/motion/`, which will consume these tokens
  rather than duplicate them - this is the resolution to the overlap between "theme → animation"
  and "motion architecture" in the request, called out explicitly since it wasn't specified which
  one should own what.

Not yet done: no component reads from `theme/` yet - there's nothing to read, on purpose.

### Stage 5 — Routing (`src/navigation/`, `src/components/screens/`)

What: `NavigationProvider` + `useNavigation()` (Context + hook, same split-file shape as
`preferences/` for the `react-refresh` lint rule) holding one of 5 `ScreenId`s
(`simple-tuner | advanced-tuner | select-tuning | settings | permission`); `AppRouter` renders the
matching stub; 5 placeholder screen components in `components/screens/`. `AppProviders` now nests
`NavigationProvider` inside `PreferencesProvider`.

Why: gives every future screen a mount point and a way to navigate between them without inventing
a routing library - a plain `switch` is enough for 5 flat, non-nested screens.

Decisions:
- No routing library added (e.g. react-router) - unnecessary dependency for an in-memory,
  single-view Telegram Mini App with no deep-linkable URLs.
- Default screen is `'simple-tuner'`, not `'permission'`, even though `PermissionGate` conceptually
  wraps everything per the UI spec's dependency map. Reconciling "which screen renders while the
  permission gate is closed" is a real integration decision for whenever `PermissionGate` is wired
  up - not invented here. `initialScreen` is an explicit, overridable prop for exactly this reason.
- Screens are plain placeholder markup (e.g. `<div>Simple Tuner (stub)</div>`) - no layout, no
  styling, no Figma content, per this stage's explicit scope.

Not yet done: `AppRouter`/`AppProviders` are not mounted in `main.tsx` - same reasoning as Stage 3,
the existing debug harness in `App.tsx` stays untouched.

### Stage 6 — Motion architecture (`src/motion/`)

What: `fade.ts`, `scale.ts`, `slide.ts`, `spring.ts` - one composed preset shape each - plus an
aggregate `MotionTokens` interface in `index.ts`. Types only, no values, no animation library
dependency, no actual animations.

Why: a single, typed home for every future animation so later stages don't invent ad hoc timing
per component.

Decisions:
- Resolves the overlap between the request's "theme → animation" and "motion architecture": raw
  primitives (durations, easing curves) stay in `theme/animation.ts` (Stage 4); `fade`/`scale`/
  `slide` presets here reference those tokens by key (`keyof DurationTokens`/`keyof EasingTokens`)
  instead of duplicating or re-declaring them.
- `spring.ts` doesn't reference duration/easing tokens at all - a spring's feel comes from
  stiffness/damping/mass, not a duration+curve pair - and is kept library-agnostic (no
  framer-motion or similar dependency) so whichever animation approach a later stage picks can
  consume the same shape.
- No default preset values anywhere: Figma has no animation designs yet (every screen audited is
  static), so populating this now would be inventing motion design, not preparing architecture for it.

Not yet done: nothing produces or consumes a `MotionTokens` instance yet.

## Current state (all stages)

Every module above (`preferences/`, the `tunerPresenter` extension, `components/{ui,layout,screens}/`,
`providers/`, `theme/`, `navigation/`, `motion/`) is additive and fully unit-tested (231 tests
passing across 21 files), but **none of it is wired into `main.tsx`/`App.tsx` yet**. The running app
is still the original debug harness in `App.tsx`, on purpose - it's the only way to manually verify
the real audio engine right now, and swapping it for `AppProviders` + `AppRouter` is a deliberate
later step, not an oversight.

Next steps, in order: close the Critical/Important items in the UI spec's Figma punch list → fill
in real `theme/` token values from the finalized Figma file → build the actual UI primitives in
`components/ui/` → replace the placeholder screens in `components/screens/` with real,
Figma-matched implementations → mount `AppProviders`/`AppRouter` in `main.tsx`, retiring the debug
harness.

### Stage 7 — UI component library (`src/components/ui/`)

What: real values populated in every `theme/` token file (colors/radius/spacing/typography/shadows,
transcribed exactly from Figma's `get_variable_defs`/`get_design_context`, including the 4
mis-scaled type line-heights - reproduced as-is, not silently corrected); `theme/tokens.css`
mirroring the same values as CSS custom properties, imported per-component (no central wiring). 14
pixel-perfect primitives built bottom-up: `Icon`, `Button`, `ToggleSwitch`, `CheckIndicator`,
`StringControl`, `SimplePitchBadge`, `AdvancedStatusBadge`, `CurrentTargetNote`, `StringNoteChip`,
`NoteCircle`, `InTuneZone`, `AppHeader` (Default/Advanced), `FooterNavigation`,
`GuitarIllustration`/`BassIllustration`. CSS Modules throughout - no styling library added.

Why: gives Stage 4-8 of the implementation roadmap real, tested building blocks instead of
placeholders, without touching `audio-engine/`, `presentation/`, or `music-theory/` at all.

Decisions:
- Styling approach: CSS Modules + a hand-written `theme/tokens.css` (CSS custom properties). No new
  dependency (no Tailwind, no CSS-in-JS, no `clsx` - a 4-line local `classNames()` helper covers
  conditional classes).
- Every color/radius/spacing value picks **one** canonical name/value where Figma itself binds the
  same role under several overlapping names (`bg/secondary` vs `Background/inverse`, etc.) - see
  `theme/colors.ts`'s comments for which name won and why.
- `text/tertiary` resolved to `#7b7a82` (the value actually bound on real screens), not `#73726c`
  (which only colors the Typography page's own internal dev-annotation captions).
- Known Figma bugs (the 4 mis-scaled line-heights, "Advanced tunind"'s master-component typo) are
  **not** silently fixed inside components - `AppHeader`'s title/frequency are plain props, so the
  typo never actually reaches rendered output; the typography values are transcribed exactly as
  Figma has them, bugs included, since "pixel perfect" means transcription, not correction.
- `AppHeader`'s Advanced variant intentionally has no Auto switcher, no dropdown, no accidental
  icons - matches the architecture decision that Simple and Advanced Tuner are different products
  (see the "Advanced Tuner stabilization" memory/decision log).
- `NoteCircle` maps to Figma's current "AdvancedPitchIndicator" component (states renamed to
  `In tune`/`Searching`); `StringControl` maps to "StringSelectorButton" - built under the names
  requested here, Figma's internal names noted in comments.
- Verified visually, not just by transcription: built a temporary `gallery.html` +
  `src/debug/ComponentGallery.tsx` (same throwaway-QA pattern as `debug.html`), built it statically,
  and screenshotted it via Playwright at `file://` (the sandbox's networking blocks `localhost`
  dev-server requests from external tools - `file://` sidesteps that entirely). Screenshot matched
  Figma on every component; no fixes were needed after the comparison.

Not yet done: no screens assembled - these are still unconnected primitives. `components/screens/`
placeholders are untouched. `gallery.html`/`ComponentGallery.tsx` are a permanent-but-optional QA
aid (same deletable pattern as `debug.html`), not wired into any build config.

Next: build the actual screens (Simple Tuner, Advanced Tuner, Settings, Select Tuning) from these
primitives, per the implementation roadmap.

### Stage 8 — Simple Tuner screen (`src/components/screens/SimpleTunerScreen.tsx`)

What: the first real screen, assembled entirely from Stage 7's primitives (`AppHeader`,
`SimplePitchBadge`, `CurrentTargetNote`, `GuitarIllustration`/`BassIllustration`, `StringControl`,
`FooterNavigation`) - no new UI components, no design-token changes. Wired to the real
`useAudioEngine()`/`TunerPresenter`/`TunerPresentationState` - their APIs are untouched, the screen
just consumes them (plus `usePreferences()` and `useNavigation()`, both already-existing
architecture).

Why: proves the component library and the presentation layer compose into a working screen without
needing to touch business logic.

Layout: absolutely positioned to match Figma's exact coordinates (`get_design_context` on
`74:4342`), not a responsive flow layout - a 402px-wide screen container with each element placed
at its transcribed `left`/`top`. The background wave pattern and the vertical center guide line are
reproduced as plain screen-level decoration (not new reusable components) using the exact Figma
SVG assets, since neither is one of the six named components and turning either into a
"component" would go beyond what was asked.

Decisions:
- `SimplePitchBadge` and `CurrentTargetNote` both anchor at `left: 179px` - not a guess: Figma's own
  calc()-based position for the badge looked asymmetric until cross-checked against
  `CurrentTargetNote`'s plain `left: 179px` and the tune-line's center - all three share one
  horizontal center (201px, mid-screen), and the badge's own first child (its 44px indicator
  circle) is what's meant to sit on that center, with its text label free to extend further right.
  Anchoring the whole component at `left: 179px` reproduces that without needing the calc().
  Both are only rendered once `presentation.target`/`presentation.cents` are non-null - before any
  reading, neither exists in Figma's "waiting" state either.
- String→column split: confirmed from Figma for 6 strings (first half reversed on the left, second
  half forward on the right - e.g. `[D,A,E]` / `[G,B,E]`), generalized to any string count since
  it's the only confirmed data point. **Bass's exact layout is unconfirmed** - Figma's Bass screen
  (`144:1976`) still uses the pre-redesign raw-shape mockup, not the current component set - so the
  2-per-column, vertically-centered bass layout here is inferred by generalizing the guitar
  pattern, not verified against a current design. Flagged, not silently assumed away.
- The outer frame's 56px corner radius + overflow-clip (from Figma's `74:4342` root) was **not**
  reproduced - treated as phone-mockup framing (like the excluded `system(ios)` chrome), not real
  app chrome, since a Mini App's actual viewport isn't clipped to a rounded phone bezel. A judgment
  call, called out rather than silently applied.
- Screen-level, not-a-business-logic-change formatting: `TUNING_INSTRUMENT`/`TUNING_SUBTITLE` local
  lookups derive the header's "Guitar 6-string"/"Standard" two-line text from
  `TuningPreset.id`/`.strings.length`, since `TuningPreset.name` is one combined descriptive string
  and Figma expects two separate labels. Same stopgap already noted in `DebugSettingsPanel` - still
  belongs on `TuningPreset` itself once Select Tuning is implemented, not invented as permanent
  architecture here.
- Manual string pinning: clicking a `StringControl` calls `pinTarget()` only when
  `preferences.autoMode` is already false; toggling Auto off calls `pinTarget()` with whatever was
  last clicked (or does nothing yet if nothing has been clicked this session) - toggling Auto back
  on calls `unpinTarget()`. No presenter changes needed; this is exactly the API Stage 2's
  extension was built for.
- Footer's Settings tab calls `useNavigation().navigateTo('settings')` - lands on the existing
  stub, since building the Settings screen itself is explicitly out of scope for this stage.

Verification: re-opened Figma via MCP (`get_design_context` + `get_screenshot` on `74:4342`) after
assembly and compared side-by-side against a screenshot of the real assembled screen (added
temporarily to `gallery.html`, built statically, screenshotted via Playwright at a `file://` URL -
same technique as Stage 7). **No pixel discrepancies found** requiring a fix - header text/layout,
icon positions, string button order/labels, footer, and background pattern all matched. The one
thing not visually re-verified is `SimplePitchBadge`/`CurrentTargetNote` positioning in a populated
state (the gallery has no real pitch reading to trigger them) - confidence there rests on their
`left: 179px` coordinates being transcribed directly from Figma's own generated markup, not
estimated.

Not yet done: Advanced Tuner, Settings, and Select Tuning screens are still stubs, per this stage's
explicit scope. `AppRouter` unconditionally renders `SimpleTunerScreen` for the `simple-tuner`
route regardless of `preferences.tunerMode` - switching to `AdvancedTunerScreen` based on that
preference is a later wiring task. `AppProviders`/`AppRouter` are still not mounted in `main.tsx` -
`App.tsx` remains the debug harness.

Next: Advanced Tuner screen (blocked on the deferred stabilization-sharing architecture discussion
and the remaining Figma gauge-behavior gap - see the "Advanced Tuner stabilization" memory), or
Settings/Select Tuning if tackled first.

### Post-Stage-8 addition — auto-start + live manual test entry (`tuner.html`)

What: `SimpleTunerScreen` now calls `start()` on mount and `stop()` on unmount (both already exposed
by `useAudioEngine()` - no API change). A third temporary entry point, `tuner.html` +
`src/debug/tuner-main.tsx`, mounts the real screen full-page for manually testing it against a live
microphone - same disposable pattern as `debug.html`/`gallery.html`.

Why: Figma's screen has no visible Start control, so auto-start on mount is the intended real
behavior once `PermissionGate` requests mic access upstream. `PermissionGate` isn't wired into the
app shell yet, so the screen starts the engine itself for now - that responsibility moves to
`PermissionGate`, not duplicated, once it exists.

### UI polish pass — Simple Tuner (5 named issues)

Fixed exactly the 5 issues raised after Stage 8, nothing else:

1. **SimplePitchBadge now moves horizontally with `presentation.cents`**, instead of sitting at a
   fixed position. Figma shows it at 3 different x-positions across its In-tune/Tune-up/Tune-down
   demo states, confirming it's meant to track deviation, not stay centered. Those 3 samples don't
   give an exact px-per-cent slope (their cents values aren't recoverable from Figma), so
   `badgeLeftPercent()` in `SimpleTunerScreen.tsx` is a bounded linear approximation: ±50 cents
   (reusing the same bound the project's original debug harness used for its needle) mapped to
   ±8.706% of the screen width (≈35px at the reference 402px, averaged from the 2 off-pitch
   samples). Approximated, not exact - flagged as such in code.
2. **SimplePitchBadge's circle was deforming into an oval.** Root cause:
   `.indicator` sized itself via `width: 100%` + `aspect-ratio: 1`, which only sets a *preferred*
   size - the "-11"/"+11" cents text is wider than the resulting content-box in some font
   fallbacks, and a flex item can grow past its aspect-ratio to fit that content. Fixed by giving
   `.indicator` explicit `width: 44px; height: 44px` instead of a percentage+ratio, plus
   `overflow: hidden` so oversized text clips instead of reshaping the circle. It's now
   structurally impossible for it to be anything but a circle, regardless of font/content.
3. **Mobile-first responsive layout.** `SimpleTunerScreen`'s container was a hardcoded
   `width: 402px` - narrower than iPhone 13 (390px CSS width) and iPhone 15 Pro (393px), so it
   overflowed and forced horizontal scroll on exactly the target devices. Fixed: `.screen` is now
   `width: 100%; max-width: 402px; aspect-ratio: 402 / 874`, and every absolutely-positioned
   child's `top`/`left` was converted from a fixed px value to a percentage of that same 402×874
   reference (e.g. `top: 13.844%` = `121 / 874`) - proportions stay identical to Figma at any
   width, only the absolute pixel scale changes. `AppHeader`/`FooterNavigation`'s own internal
   `width: 402px` was changed to `width: 100%` for the same reason. The BG pattern was
   deliberately left as fixed px (see item 5). Verified via Playwright at iPhone 13 (390×844),
   iPhone 15 Pro (393×852), Pixel 8 (412×915), and a constrained Telegram-viewport-like size
   (400×700) - `scrollWidth === clientWidth` at all four (no horizontal overflow), screenshots
   confirm no visual breakage. Note: at the intentionally-short 700px-tall test viewport, the
   footer requires a normal vertical scroll to reach - that's correct responsive behavior, not a
   defect (real Telegram viewport heights are typically taller).
4. **Footer border is now a top-to-bottom gradient**, not flat white. Figma's own tooling can't
   resolve the "Footer Border" style to a color (`get_variable_defs` returns it empty) - it's a
   gradient paint that the reference-code generator had flattened to a solid white approximation,
   which is what got transcribed originally. Re-inspected via a close-up Figma screenshot (visibly
   bright at the top, fading by the bottom) and rebuilt using the standard `mask-composite: exclude`
   ring technique on `.pill::after`, since a flat `border-color` can't itself be a gradient. The
   exact opacity stops (`0.9` → `0.05`) are a close visual match, not recovered Figma values.
5. **BG pattern intentionally untouched** - deferred to its own UI-polish pass, per instruction.

Not yet done: same as Stage 8 - Advanced Tuner/Settings/Select Tuning remain stubs; `AppProviders`/
`AppRouter` still not mounted in `main.tsx`.

### Stage 1 completion pass — Simple Tuner (3 named issues, 1 explicitly deferred)

Fixed:
- **SimplePitchBadge's pointer/tail looked detached from the circle.** Root cause found via a
  zoomed screenshot diff against Figma: the `<svg>` inside `.tail` had no explicit `width`/`height`,
  so it rendered at its inline-replaced-element default box rather than filling the 8x8px `.tail`
  span - the visible triangle sat offset from where the circle's border actually ended, reading as
  a separate floating shape. Fixed by giving the SVG explicit `width="100%" height="100%"` and
  `display:block` (plus `display:block; line-height:0` on `.tail` itself). Now reads as one
  continuous pin/teardrop shape, matching Figma.

Investigated, structurally verified against Figma, left as an open question rather than
guessed further (see the two entries under "What blocked the work" / "What needs your decision"
below):
- **Footer Border** - confirmed via 3 separate `get_design_context` calls at increasing specificity
  that Figma's own tooling cannot resolve this style to a color (`get_variable_defs` always returns
  it empty) - it's a gradient the reference-code generator flattens to solid white. The
  `mask-composite` ring technique and stop values from the prior polish pass are a visual
  approximation, not the recovered Figma parameters the instruction asked for.
- **Footer blur affecting the neck above it** - verified the raw `guitar-photo.png` asset itself
  (the bright nut/binding detail visible near the bottom of the neck is real photo content, not a
  rendering artifact), verified the mask/mask-size math matches Figma's transcribed markup exactly,
  and verified the blur/gradient structure (2px outer, 3px inner-pill, 0%->78.302% stops) matches
  what Figma's own generated code specifies. The visual mismatch persists anyway - likely a
  Figma-previewer-vs-real-`backdrop-filter` rendering difference over detailed imagery, not a
  layer-structure or clipping bug on this end. Added `overflow: hidden` to `.footer` defensively;
  did not tune the blur radius or gradient stops away from Figma's documented values without
  confirmation.

Not fixed, per explicit instruction: BG pattern (deferred to the end of the project).

### Stages 2-4 — Settings, Select Tuning, Advanced Tuner (all real screens now)

Built sequentially per the autonomous-work directive: each stage fully built, self-verified against
Figma via MCP, build+typecheck+test-clean, before starting the next. Non-blocking cosmetic/MCP
limitations were logged as TODOs and did not stop work, per that directive. 303 tests passing
across 44 files; `tsc -b` and `vite build` both clean at every stage boundary.

**New design-system primitives** (same `.tsx`+`.module.css`+`.test.tsx`+`index.ts` pattern as
Stage 7's 14): `StepperButton` (Figma's "+/- buttons", 66:3252 - Large/Small x +/-, all 4 icon
paths transcribed exactly) and `SegmentedControl` (Figma's "Swither", 144:2140 - generic
2-option tab control, used for Select Tuning's Guitar/Bass switch). `Icon` gained 8 entries
(`setting-4`, `volume-low`, `refresh-2`, `musicnote`, `global`, `arrow-right`, `messages-2`,
`book`) needed by Settings, all path data pulled from Figma's asset server, not hand-drawn.

**Settings screen** (`SettingsScreen.tsx`): profile block (static Figma placeholder - see below),
3 grouped cards (Advanced mode / Sound effect+Left-handed+Calibrate+Language / Support+FAQ),
version footer, `FooterNavigation`. Wired to real preferences: `tunerMode` (Advanced mode switch),
`leftHanded`, `a4Frequency` (Calibrate stepper, persists only - see below). Footer's Tuner tab
routes to `simple-tuner` or `advanced-tuner` based on `tunerMode`.

**Select Tuning screen** (`SelectTuningScreen.tsx`): title, scaled-down headstock illustration
(reuses `GuitarIllustration`/`BassIllustration` via CSS `transform:scale` rather than
duplicating photo assets at a second size), `SegmentedControl` (Guitar 6-string/Bass 4-string, no
ukulele per instruction), a card of tuning rows wired to `getAllTunings()` - each row's chips use
the real `midiToNoteName()` output, and `CheckIndicator` reflects `preferences.selectedTuning`.
Tapping a row persists `selectedInstrument`+`selectedTuning` and navigates back to the tuner.
Extracted the `TUNING_INSTRUMENT` id->instrument lookup (previously duplicated in
`SimpleTunerScreen.tsx` and `DebugSettingsPanel.tsx`) into a shared `tuningInstrument.ts` - a
presentation-layer-only de-duplication, not a music-theory change. `SimpleTunerScreen`'s
`AppHeader` now wires `onTitlePress` to open this screen (that prop already existed on
`AppHeaderDefaultProps` from Stage 2's presenter extension but was never connected to anything).

**Advanced Tuner screen** (`AdvancedTunerScreen.tsx`): re-examined the presumed architecture
blocker from the "Advanced Tuner stabilization" memory before building - `TunerPresenter`'s
existing `TunerPresentationState` (`state`/`target`/`cents`/`inTune`) already provides everything
this screen needs (continuous cents, auto-detected nearest target, lock lifecycle) with **zero**
`TunerPresenter`/`useAudioEngine` changes: the screen just mounts its own `useAudioEngine()`
instance exactly like `SimpleTunerScreen` does and never calls `pinTarget`/`unpinTarget` (Figma's
Advanced header has no Auto switch and no manual string picker). `InTuneZone` (idle "Start
playing" ring vs. plain ring) layers under `NoteCircle` (shown only once `presentation.target` is
non-null; state driven by `presentation.inTune`), `AdvancedStatusBadge`, flat/sharp buttons beside
the ring (reusing the existing `Icon`+`accidental` preference, not a new control), and a Calibrate
row (`StepperButton` Large x2 + `Button` secondary/large "Reset") that both persists
`a4Frequency` **and** calls the local presenter's `setA4()` - safe here because, unlike Settings,
this screen owns a live engine instance directly. Figma's header text ("Advansed tunind") is a
typo, corrected to "Advanced tuning" rather than reproduced.

Decisions and things **not** done, flagged per the "don't stop for this, log and continue" policy:
- **Settings profile (avatar/nickname/username) is a static Figma placeholder.** No Telegram
  user-identity API exists anywhere (`telegram/TelegramAdapter.ts` only exposes theme params +
  haptics) - wiring real `initDataUnsafe.user` data would mean extending that interface, which is
  an architecture change per the stop rules, not a Settings-screen decision. Flagged, not done.
- **Settings' "Sound effect" toggle has no backing preference or behavior.** `AppPreferences` has
  no matching field, and no sound-effect playback exists anywhere in `audio-engine`. Implemented as
  local, unpersisted UI state rather than inventing a new preference/feature. Flagged, not done.
- **Settings' Language/Support/FAQ rows are no-ops.** No i18n system, no support/FAQ
  screen or URL exists. Rendered per Figma (including the arrow-right affordance) but wired to
  empty handlers rather than invented destinations.
- **Settings' Calibrate stepper only persists to `AppPreferences`, it does not call the engine's
  `setA4()`.** Settings has no running audio engine (correctly - a Settings screen must not request
  microphone access), and each screen (`SimpleTunerScreen`, `AdvancedTunerScreen`) mounts its own
  independent `useAudioEngine()` instance. There is currently no shared/global engine instance
  across screens for Settings to reach into, and `SimpleTunerScreen` itself never called `setA4()`
  either (a pre-existing gap, not introduced here) - `preferences.a4Frequency` was decorative
  (display-only) everywhere before this stage. Making calibration actually apply live across
  screens would mean changing how/where the audio engine is instantiated (i.e. architecture) -
  flagged per the stop rules rather than silently deciding an approach. Advanced Tuner's own
  Calibrate row does call `setA4()` because that screen already owns a live engine instance
  itself; that part works today.
- **`SegmentedControl`'s exact Figma-bound colors are an approximation.** `get_design_context`
  timed out (300s, no response) on both the screen instance and the master component (144:2139/
  144:2140) across repeated attempts - reused existing surface/text tokens matching the screenshot
  instead of extracted values. Every other primitive/screen in this project successfully used
  `get_design_context`; this was an isolated, reproducible failure on this one component.
  Functionally and visually correct per the screenshot comparison; flagged as unverified-exact.
  colors, not a stop, per the non-blocking-MCP-limitation policy.
- **Bass has no Drop-D tuning preset** (`music-theory` only defines `bass-standard`, no
  `bass-drop-d`), while Figma's Select Tuning bass frame mockup shows a "Drop-D" row with the same
  note values as Standard (a stale/unfinished mockup, per the Stage 2 report's existing note about
  Figma's bass screen predating the current component redesign). `SelectTuningScreen` renders
  exactly one row for Bass, driven by real data - it does not reproduce Figma's extra row.
  `bass-drop-d` was not added to `music-theory` to make the row exist, since preset data is
  frozen/business logic, not a presentation-layer decision.
- **Select Tuning's headstock illustration scale/position for Bass is inferred**, same caveat as
  Stage 2's SimpleTunerScreen note: Figma's Bass reference for this specific screen uses the
  current component set (unlike Simple Tuner's Bass, which was flagged as using a pre-redesign
  mockup), so this one is on firmer footing, but the per-instrument scale factor (0.6838) is derived
  by ratio from the illustration's native size, not a value read directly off a Figma variable.
- **`select-tuning`/`settings`/`advanced-tuner`/`tuner`/`gallery`/`debug` `.html` debug entry
  points** (`settings.html`, `select-tuning.html`, `advanced-tuner.html` added this stage) follow
  the same disposable-but-kept QA pattern as `debug.html`/`gallery.html`/`tuner.html` - not wired
  into `main.tsx`/`index.html`/`App.tsx`.

Not yet done: `AppProviders`/`AppRouter` are still not mounted in `main.tsx` - `App.tsx` remains the
original debug harness, unchanged this stage, per the same reasoning as every prior stage.

### Simple Tuner quality pass — SimplePitchBadge motion + String Selector reset

Scoped strictly to Simple Tuner per instruction: no other screen touched, no changes to
`audio-engine`, `music-theory`, or `TunerPresenter`'s logic.

**SimplePitchBadge motion (`SimpleTunerScreen.tsx`):**
- **Wider working range**: replaced the hard linear clamp at +-50 cents with a `Math.tanh`
  soft-saturation curve (`BADGE_CENTS_SOFTNESS = 70`). The old clamp meant any reading beyond 50
  cents landed on the exact same pixel (e.g. -60 and -300 were visually identical); tanh keeps
  inching toward the same, Figma-confirmed ~35px/8.706% max travel without ever hard-stopping, so
  large deviations stay distinguishable further out. The max-travel bound itself is unchanged from
  Figma's demo states - only the input-to-fraction curve changed.
- **New `useSmoothedCents` hook** (`src/components/screens/useSmoothedCents.ts`): a time-based
  (not frame-based) exponential low-pass filter, `tau=120ms`, driving both the badge's position and
  its displayed number - removes frame-to-frame sensor jitter without adding fixed latency (it
  converges at a rate, not a delay). Snaps instantly whenever `presentation.target?.id` changes (a
  different string) so it never visibly slides over from a stale position. A short CSS
  `transition: left 100ms ease-out` on `.pitchBadge` adds a final layer of glide between the
  discrete reading-driven updates. Tune-direction (`badgeState`: In tune/Tune up/Tune down) is
  deliberately read from the raw, unsmoothed presenter values - correctness of "which way to turn"
  never lags, only the continuous position/number are smoothed.
  Implementation note (caught by `npm run lint`, not by hand-review): the first version called
  `setState` directly inside a `useEffect` body, which this project's `react-hooks/set-state-in-effect`
  rule rejects, and a second attempt at fixing it read `performance.now()` during render, which
  `react-hooks/purity` also rejects. The shipped version splits the two cases instead - snapping (a
  string change, going quiet, or the first-ever value) is pure and instant, so it uses React's
  documented "adjusting state when a prop changes" render-time pattern (no effect needed at all);
  continuing to blend for the *same* string needs a wall-clock delta, so that part stays in an
  effect but only ever calls `setState` from inside the `requestAnimationFrame` callback itself
  (mirroring `useAudioEngine`'s own tick-loop shape) rather than the effect body directly. Both
  hooks are still called unconditionally per the Rules of Hooks - only the `setState` calls inside
  are conditional. `useSmoothedCents.test.ts` drives the continuing-smoothing branch with a
  synchronous, test-controlled `requestAnimationFrame` stub rather than mocking `performance.now()`,
  since timing now comes from the rAF callback argument, not a direct clock read.
- **3-digit cents (`SimplePitchBadge`)**: Figma only has demo states for 2-digit values; there's no
  separate component/state for 100+ cents. Rather than inventing a new visual treatment, added a
  `centsTextCompact` modifier (font-size 14px vs 20px) applied only when `magnitude >= 100` - the
  44px circle's size, color, and padding-box are untouched, only the number's type size shrinks
  enough to stop it clipping against the edge. Verified via a temporary Playwright probe (not kept)
  screenshotting cents=11/45/99/100/120/300 side by side.

**String Selector (`SimpleTunerScreen.tsx` + `useAudioEngine.ts`):** Auto -> Manual now clears every
string's Tuned badge (`handleAutoModeChange` calls the presenter's `reset()` before pinning), since
entering Manual is a fresh session, not a continuation of Auto's progress. Manual -> Auto is
unchanged (`unpinTarget()` only). `reset()` did not exist on `useAudioEngine`'s return value before
this - added as one more pure passthrough to the presenter's own, already-existing `reset()` method,
exactly the same shape as the `setA4`/`pinTarget`/`unpinTarget` passthroughs added in Stage 2
(`useAudioEngine.ts` is presentation-layer glue in `src/hooks/`, not `tunerPresenter.ts` itself -
zero lines changed in that file). The hook's `reset()` also immediately re-runs `presenter.tick()`
so the cleared state is reflected in `presentation` synchronously, not on the next animation frame.

Verified: re-screenshotted the idle Simple Tuner screen (`tuner.html`) against Figma after all
changes - layout/positions untouched, matches as before. 315 tests passing across 43 files;
`tsc -b`/`vite build`/`npm run lint` clean.

### Production entry point — `App.tsx` now mounts the real app

What: `src/App.tsx` no longer renders the original raw-needle debug harness (the manual audio-engine
test screen that lived here since the project's start). It now renders `<AppProviders><AppRouter
/></AppProviders>` - the exact composition every stage's log has been describing as "not yet
mounted." `src/main.tsx` is untouched (it already just rendered `<App />`); `index.html` is
untouched. `/` now serves the real Simple Tuner screen (via `NavigationProvider`'s existing default
`initialScreen = 'simple-tuner'`), with working in-app navigation to Settings/Select Tuning/Advanced
Tuner through the same footer/header affordances already built and tested in prior stages.

Why: this was the last step blocking a production deploy - every screen existed and was tested, but
nothing wired them to the real entry point yet.

Decisions:
- The retired harness's actual purpose (manually exercising the real audio engine without any UI
  polish) is already fully covered by `debug.html` + `DebugSettingsPanel.tsx`, which is a strict
  superset of what the old `App.tsx` did (instrument/tuning selection, A4 calibration, manual
  pinning, start/stop, error display - the original harness only had a single hardcoded tuning and a
  raw needle). Re-creating it as a new dedicated debug page would have been pure duplication, so it
  wasn't - this is a judgment call worth flagging rather than assuming silently.
- No `vercel.json` added. This is a plain Vite React SPA with no server code and no client-side
  routing (`NavigationProvider` is in-memory `useState`, not URL-based - there is nothing to add
  rewrite rules for). Vercel's zero-config Vite framework preset already resolves to exactly the
  right settings from `package.json`/`vite.config.ts` alone: Framework = Vite, Build Command = `npm
  run build` (runs the project's own `tsc -b && vite build`, so a real type error would fail the
  Vercel build too, not just slip through), Output Directory = `dist`. Adding a redundant config file
  that duplicates auto-detected defaults was judged more likely to go stale than to help.
- `vite.config.ts` itself is unchanged from before this pass (no `base` override, no multi-page
  `rollupOptions.input`) - confirmed (see below) that Vite's default single-entry build already only
  ever bundles `index.html` into `dist/`, so every debug/gallery/demo `.html` page
  (`debug.html`/`gallery.html`/`tuner.html`/`settings.html`/`select-tuning.html`/
  `advanced-tuner.html`) is automatically excluded from the production build with zero extra
  config - they simply aren't referenced by any `rollupOptions.input`, and remain fully usable via
  `npm run dev` for local manual testing.

Verified:
- `tsc -b && vite build` clean; full test suite green (315 tests / 43 files, unchanged by this pass).
- Inspected `dist/` after a real `npm run build`: contains exactly one HTML file (`index.html`) plus
  its bundled JS/CSS/image assets - no debug/demo page leaked into the production output.
- Screenshotted the built `dist/index.html` (via the project's established static-build +
  Playwright + `file://` technique, with `base: './'` temporarily set only for this local,
  `file://`-based check and reverted immediately after - a real Vercel deploy serves from a domain
  root, where the default root-absolute `base` is correct, not `'./'`) - Simple Tuner renders
  correctly with no console errors, and clicking the footer's Settings tab correctly navigates
  in-place to the real Settings screen, confirming `AppRouter` wiring works end-to-end from the
  actual production entry point, not just in isolated per-screen debug pages.

Not yet done, out of scope for this pass: `PermissionGate` is still not wired in front of the
router, so the real app requests microphone access immediately on load (same behavior the `tuner.html`
debug page already had) rather than gating on an explicit permission screen first.

### Pre-commit verification pass

Ran the full quality gate before the first commit: `npm run build`, full test suite, `npm run lint`
(not run as part of any prior stage's own checklist - added here), a grep for stray `console.log`/
`TODO`/commented-out code in every shipped `src/` file (excluding `src/debug/`, which is intentionally
excluded from the production build already), and a real-browser (Playwright, real `requestAnimationFrame`,
not the jsdom/stubbed one tests use) click-through of Simple Tuner -> Settings -> Select Tuning ->
Advanced Tuner via the actual `AppRouter`, capturing every `console.error`/`console.warn`.

`npm run lint` caught a real bug `npm run build`/the test suite both missed: `useSmoothedCents`
violated `react-hooks/set-state-in-effect` (direct `setState` in an effect body). Fixed as described
above in the Simple Tuner quality-pass entry, re-verified: `tsc -b`, `vite build`, `npm run lint`, and
the full test suite (315 tests / 43 files) all clean; zero `console.error`/`console.warn` across the
full click-through with a real rAF; no stray debug imports, `console.log`, or leftover TODO/dead code
in any production file.

### Simple Tuner layout fix — page-level scroll after deploying to Telegram Mini App

Bug reported after the production deploy: the whole screen could scroll vertically, the footer
drifted away from the bottom edge instead of staying pinned there, and blank space appeared above
`AppHeader`.

Root cause: `.screen` (`SimpleTunerScreen.module.css`) sized itself with `aspect-ratio: 402 / 874`
computed from its own **width** - its height was never actually tied to the viewport at all. Every
child (`.header`, `.footer`, `.illustration`, `.pitchBadge`, `.stringContainer`, ...) was then
`position: absolute` with a `top` expressed as a percentage of that width-derived height. On a real
device, viewport height essentially never equals `width * (874/402)` - Telegram's own WebView chrome
in particular reports a usable viewport shorter than the raw device height - so the rendered
`.screen` box routinely ended up taller *or* shorter than the actually-visible viewport. Since
neither `html`, `body`, nor `#root` constrained height or set `overflow: hidden` anywhere, that
mismatch was free to make the whole page scroll, which is what surfaced as "footer drifts down" /
"gap above the header": both are just different views of the same underlying bug (the screen's own
height was disconnected from the viewport's actual height).

Fix: `.screen` now sizes directly from the viewport (`height: 100vh` followed by `height: 100dvh` -
not a fallback chain, the second declaration simply wins on engines that support the unit, using
`dvh` because Telegram/mobile browser chrome can change the *usable* viewport height without
changing `100vh`), laid out as a real flex column: `Header` (flex-shrink: 0, natural content
height) -> `.main` (`flex: 1 1 auto; min-height: 0; overflow: hidden` - everything that used to be
positioned relative to the whole 874px canvas now lives here instead) -> `Footer` (flex-shrink: 0,
natural content height). Header and Footer are no longer `position: absolute` at all - they're
ordinary flex children, which is what actually pins the footer to the bottom regardless of the
viewport's real height, and what removes the gap above the header (it's simply the first thing in
the column now, not something placed at an assumed `13.844%` down a canvas that may not match the
real viewport). The content inside `.main` keeps the exact same relative arrangement, just rebased:
each `top%` used to be `originalTopPx / 874`; it's now `(originalTopPx - 121) / 647`, where 121px was
Header's old Figma-implied top offset and 647px (`874 - 121 - 106`) was the vertical span Figma
implied for the region between Header and Footer - since `.main` only ever represents "the space
between Header and Footer" now, its own real rendered height (whatever Header/Footer's actual
content heights leave) is what these percentages scale against, not a fixed reference number.

Files changed: `src/components/screens/SimpleTunerScreen.module.css` and
`src/components/screens/SimpleTunerScreen.tsx` (wrapped the previously-flat sibling list in a new
`.main` div; Header and Footer are unchanged JSX, just no longer inside anything absolutely
positioned). Nothing else - no changes to `index.html`, `main.tsx`, `App.tsx`, `AppRouter`, `index.css`,
`html`/`body`, or any other screen.

Why the other screens are unaffected: `SettingsScreen.module.css`, `SelectTuningScreen.module.css`,
and `AdvancedTunerScreen.module.css` each declare their own `.screen`/`.header`/`.footer` classes -
CSS Modules scope every class name to its own file, so identically-named classes in different
modules are completely independent rules at build time. None of them import from
`SimpleTunerScreen.module.css`, and no shared/global stylesheet was touched, so this fix is fully
contained to Simple Tuner's own two files. (Those other three screens still use the same
aspect-ratio-driven `.screen` pattern this fix moves away from, and likely have the same
underlying scroll bug - out of scope here per instruction, flagged for a follow-up pass.)

Verified: `tsc -b`, `vite build`, `npm run lint`, full test suite (315 tests / 43 files) all clean.
Checked for page-level scroll and footer/header pinning with Playwright at 5 viewport
configurations - a 1280x800 desktop size, iPhone 13 (390x844), iPhone 15 Pro (393x852), and two
intentionally short heights simulating Telegram's own reduced-chrome viewport (400x650, 375x560):
`document.documentElement.scrollHeight` exactly equals `clientHeight` in every case (zero scroll
possible), the screen's own bounding box starts at `top: 0` with no gap in every case, and the
footer's bottom edge exactly equals the viewport height in every case. At the most extreme
simulated height (375x560) the guitar illustration compresses/clips at the very bottom of `.main`
rather than causing scroll - expected, not a regression, since the explicit requirement was "must
not scroll", not "must never clip at extreme aspect ratios".

### Simple Tuner viewport height - Telegram's own viewport API takes priority over dvh

Follow-up to the layout fix above: `100dvh` alone doesn't know about Telegram's own native chrome
(header, main button, etc.), only about the browser's visual viewport - Telegram's Mini App bridge
reports a more accurate usable height directly. Added a 3-tier CSS priority (highest first):
1. `var(--tg-viewport-height, ...)` - set inline on `.screen` only when running inside Telegram.
2. `100dvh` - wins whenever the custom property isn't set; already tracks the real visual viewport
   live (mobile chrome/keyboard changes) with no JS needed.
3. `100vh` - pure safety net for an engine that understands neither `dvh` nor CSS custom properties.

New: `src/telegram/webApp.ts` (`getTelegramWebApp()` + `initTelegramWebApp()`, calling Telegram's
`ready()`/`expand()` once) and `src/telegram/useTelegramViewportHeight.ts` (reads
`WebApp.viewportHeight`, subscribes to Telegram's `viewportChanged` event for live updates, returns
`null` outside Telegram) - both follow `haptics.ts`'s existing convention (a fresh minimal local
`WebApp` interface per file, reading `window.Telegram.WebApp` directly, no Context/Provider). Wired
into `SimpleTunerScreen.tsx` only (sets the CSS custom property via inline `style`); no other screen
consumes it yet. `index.html` gained the official `<script src="https://telegram.org/js/telegram-web-app.js">`
tag (loads harmlessly outside Telegram); `main.tsx` calls `initTelegramWebApp()` once at bootstrap,
since `ready()`/`expand()` are app-lifecycle calls, not tied to any one screen's mount/unmount.
None of this touches `AppProviders`/`AppRouter` - it was intentionally kept to the same
low-ceremony "read `window.Telegram.WebApp` directly" shape the codebase already uses for haptics,
since that was sufficient here and a Context/Provider would have been unjustified ceremony for a
single consumer.

Verified via Playwright with the real telegram.org script blocked (to isolate the mechanism from a
race against the real script's own load) and a mock `WebApp` injected: reporting `viewportHeight:
560` while the real window was 700px tall sized the screen to exactly 560px (not 700) - Telegram's
value correctly wins over `dvh`. Firing a simulated `viewportChanged` event with a new height (420)
live-resized the screen to exactly 420px with no scroll introduced. Outside Telegram, the real
telegram.org script loads without console errors and the screen falls back to `100dvh` (matches the
real window height) exactly as before this change. Full test suite (324 tests / 45 files, up from
315/43 - the two new telegram/ modules add their own tests), `tsc -b`, `vite build`, `npm run lint`
all clean.

Answers to the review questions asked alongside this fix:
- **`safe-area-inset-bottom` is not used anywhere in the codebase** (confirmed by grep - the only
  hit is a documentation comment in the still-empty `components/layout/index.ts` scaffold naming it
  as future scope, nothing implemented). Now that the footer is genuinely pinned to the real bottom
  edge of the viewport (previously it wasn't, per the bug this fix addresses), the footer sitting
  flush against a device's home-indicator/gesture-bar area without any inset padding is a real,
  adjacent concern worth a dedicated look - flagged here as a recommendation, not implemented, since
  it wasn't asked for as an action item in this pass.
- **The screen survives viewport height changes correctly**, verified two ways: `100dvh` already
  tracks a plain mobile browser's visual viewport live (chrome bars, on-screen keyboard) with no JS
  involved; and the new `useTelegramViewportHeight` hook now does the same for Telegram's own
  `viewportChanged` event, confirmed above by the live 560px -> 420px resize test. Neither path
  introduces scroll at any height tested.
- **The same fix will very likely be needed on Settings, Select Tuning, and Advanced Tuner for a
  uniform layout** - all three still use the pre-fix `aspect-ratio`-driven `.screen` pattern this
  pass moved Simple Tuner away from, so they likely have the same underlying scroll bug and would
  benefit from the same Header/Main(flex:1)/Footer restructuring and the same Telegram-viewport-height
  priority. Not done here - out of scope per this task's explicit "don't touch other screens"
  instruction - but noted as a concrete, scoped follow-up rather than a vague TODO.

### Two bugs found testing in real Telegram: illustration clipping + shared viewport infrastructure

**Bug 1 - guitar/bass illustration clipped at the bottom on Simple Tuner.** Root cause: the previous
pass added `overflow: hidden` to `.main` defensively, without checking whether Figma's own layout
actually relied on something extending past that boundary - it did. `GuitarIllustration`/
`BassIllustration`'s own `.container` is a fixed 253x474px box; at Figma's reference scale (top:
400px in the original 874px canvas), 400 + 474 = 874 = the canvas's own total height = the footer's
own bottom edge. In other words, the illustration was always designed to extend the full remaining
106px *behind* the footer (this is also why an earlier UI-polish pass had to investigate "footer
blur affecting the neck above it" - see that entry - which was never a bug, it's this exact
intentional overlap, just not recognized as load-bearing at the time). `.main` clipping at the
Header/Footer boundary cut the illustration off 106px early - a real regression from adding a
defensive `overflow: hidden` that Figma's own design didn't actually allow for. Fix: removed
`overflow: hidden` from `.main` entirely. `.screen`'s own `overflow: hidden` (inherited from
`ViewportScreen`, see below) is already the real, sufficient boundary against page-level
scroll/overflow - confirmed the illustration's bottom edge still lands before the screen's own
bottom edge, never past it, and every other child in `.main` (pitch badge, string rows, tune line)
was independently re-confirmed to sit well within bounds, so nothing else was put at risk by
removing this. No numbers were fudged to "make it look right" - the fix is structural (stop
clipping at a boundary the design never respected), not a margin/top adjustment.

**Bug 2 - Settings still used the pre-viewport-fix `aspect-ratio` `.screen` and could scroll.**
Extracted the "real viewport height, Telegram-aware" logic that used to live directly in
`SimpleTunerScreen.tsx`/`.module.css` into shared infrastructure instead of copying it:
- `src/components/layout/ViewportScreen.tsx` + `.module.css` (new) - a `<ViewportScreen>` component
  owning the `useTelegramViewportHeight()` call and the height-priority CSS (Telegram viewport height
  > `100dvh` > `100vh`, same cascade as before) exactly once. Lives in `components/layout/`, which
  was already a documented-but-empty scaffold for exactly this ("page shells... land here").
- Both `SimpleTunerScreen.module.css` and `SettingsScreen.module.css`'s own `.screen` now
  `composes: viewportScreen from '../layout/ViewportScreen.module.css';` instead of each declaring
  the sizing/flex/background rules themselves - CSS Modules' own `composes` feature, not a build
  plugin. Both screens' `.tsx` now render `<ViewportScreen className={styles.screen}>` instead of a
  plain `<div className={styles.screen}>`; `SimpleTunerScreen.tsx` no longer imports
  `useTelegramViewportHeight`/`CSSProperties` itself at all - that responsibility moved entirely
  into `ViewportScreen`.
- Settings' own `.content` (its Header/Main-equivalent middle region) changed from `flex: 1 0 auto`
  (never shrinks) to `flex: 1 1 auto; min-height: 0; overflow-y: auto` - unlike Simple Tuner's fixed,
  precisely-positioned `.main` (which should never need to scroll internally), Settings' content
  (profile + 3 cards) can genuinely exceed a short viewport, so *it* scrolls internally now instead
  of the page. The outer `.screen`/`ViewportScreen` shell itself never scrolls, matching Simple
  Tuner; only this one screen's own middle region does, and only when its content actually doesn't
  fit.
- Fixed unrelated but actively-misleading debug-tooling gap found while verifying this:
  `src/debug/tuner-main.tsx` didn't import `../index.css` (unlike every other debug entry), leaving
  the browser's default `<body>` margin active and producing a false "the page can scroll" reading
  during verification that had nothing to do with the actual app. Debug-file-only, not shipped
  (still excluded from the production build the same way every `debug/*.html` page is).

Explicitly not touched, per instruction: Select Tuning, Advanced Tuner. Both still use the
pre-`ViewportScreen` `aspect-ratio` pattern and very likely have the same underlying scroll bug;
`ViewportScreen` is now proven-reusable infrastructure (used identically, unmodified, by two
different screens) ready for them to adopt in a later pass.

Verified:
- Illustration: `illustrationBottom` (855.6px) now sits between `.main`'s own bottom edge (768px,
  where the footer starts) and the screen's own bottom edge (874px) - it extends into the footer's
  band as designed, without exceeding the true screen boundary. `docScrollHeight === docClientHeight`
  (874 = 874, no scroll) confirmed via the real production entry (`index.html`), not just the
  now-fixed debug harness.
- Settings: checked at both a tall (874px) and an intentionally short (600px) viewport - screen top
  is `0` and screen/footer bottom exactly equals the viewport height in both, page-level scroll is
  impossible in both. At the short viewport, directly drove `.content`'s own `scrollTop` to confirm
  it *does* scroll internally (`scrollHeight - clientHeight` = 190px, reached exactly) - Language/
  Support/FAQ/version text are reachable by scrolling within the content region even when they don't
  fit, while the footer stays pinned to the true bottom of the viewport throughout.
- `tsc -b`, `vite build`, `npm run lint`, full test suite (328 tests / 46 files, up from 324/45 - new
  `ViewportScreen.test.tsx`) all clean.

### FooterNavigation re-synced against an updated Figma BottomNavigation component

The user updated the Figma component itself and added named styles for the top border, the
background gradient, and the effects (including a "Progressive Background Blur"), then asked for
another pass against it. Re-fetched `get_variable_defs`/`get_design_context` on the component
(node 66:3223/66:3224) rather than assuming the old approximations still held.

**Confirmed already exactly correct, no change needed:** the outer `.footer`'s gradient
(`rgba(18,18,18,0)` -> `#121212` at `78.302%`) and its own `2px` backdrop-blur - codegen's own
Tailwind output for the whole component matches this project's implementation byte-for-byte.

**Real gap found and closed:** `theme/shadows.ts` already documented Figma's "Background Blur +
Shadow" effect *including* `backgroundBlur: 6`, and `tokens.css` already had
`--backdrop-blur-footer: 6px` defined - but `FooterNavigation.module.css`'s `.pill` never actually
had `backdrop-filter: var(--backdrop-blur-footer)` applied. The token existed and was documented;
it just was never wired up. Fixed by adding it directly to `.pill`.

**Root cause of the long-standing "footer blur smears the neck more than Figma's screenshot"
mystery, finally identified:** Figma's component has a *second*, separate named effect,
"Progressive Blur" (`BACKGROUND_BLUR radius 4`) - "progressive" is Figma's own word for a blur
whose *strength varies spatially*, not a flat, uniform one. The previous implementation's `.glass`
layer used a flat `backdrop-filter: blur(3px)` (an ad-hoc guess, not tied to any named Figma value)
across its whole area, which is precisely why it read as excess, uniform haze over the neck's
fret/binding detail - it was structurally the wrong kind of blur, not a rendering-engine difference
(an earlier pass's best guess at the time, now confirmed wrong and corrected, not just re-guessed).
A single CSS `backdrop-filter: blur()` value is inherently uniform by construction, so reproducing
"progressive" required an actual different technique, per the user's own anticipation of this:
`.glass` now uses the exact Progressive Blur radius (`--progressive-blur-footer`, 4px) *masked* with
`mask-image: linear-gradient(to bottom, transparent, black)`, so it contributes ~0 extra blur at the
pill's top edge (where the neck meets the footer) and its full 4px at the bottom - stacking with
`.pill`'s own uniform 6px to produce a true graduated ~6px -> ~10px top-to-bottom blur, instead of
one flat number applied everywhere.

**Still not resolvable, re-confirmed:** the border (now named `border/bottomnavigaion` in Figma,
previously unnamed) still resolves empty via `get_variable_defs` - re-checked this pass, consistent
with every earlier attempt. Codegen's own fallback renders it as flat `border-white`, but that's
the gradient's *base color* (confirmed exact: `background/Surface/overlay`, `#FFFFFF`), not proof
the border itself is flat - a named style that resolves empty in every other case here has
consistently turned out to be a gradient/paint Figma's tooling can't flatten to one color. The
existing `mask-composite: exclude` gradient-ring technique (white fading top-to-bottom) is kept as
the best-available structural match; only its exact opacity stops remain an approximation.

Files changed: `src/theme/shadows.ts` (added `progressiveBlur`, refined the drop-shadow/inner-shadow
alpha values to their exact byte-to-fraction conversions - `0.0784`/`0.251`, not the earlier
rounded `0.08`/`0.25`), `src/theme/tokens.css` (`--progressive-blur-footer: 4px`, same alpha
refinement), `src/components/ui/FooterNavigation/FooterNavigation.module.css` (the two fixes above).
No changes to `FooterNavigation.tsx` - purely a styling fix, the DOM structure was already correct.

Verified: `tsc -b`, `vite build`, `npm run lint`, full test suite (328 tests / 46 files, unchanged
by this pass) all clean. Screenshotted the live component over the real guitar neck (via the
project's established static-build + Playwright + `file://` technique) at 2x zoom - the neck is now
sharp right where it meets the pill's top edge and fades smoothly toward the bottom, matching the
graduated look instead of the previous uniform haze.

### FooterNavigation border/gradient corrected after a real side-by-side comparison

The previous pass's border/fill values were both self-consistent approximations, but a direct
side-by-side against Figma's own screenshot of the isolated component (not over the guitar photo,
to remove that as a confound) showed a real, visible mismatch: this project's border gradient
(`rgba(255,255,255,0.9)` -> `rgba(255,255,255,0.05)`) was far higher-contrast than Figma's actual
border, which reads as thin and fairly *even* in brightness top-to-bottom, not blazing bright at
the top and nearly gone by the bottom. Retuned to `rgba(255,255,255,0.24)` -> `rgba(255,255,255,0.08)`
- still an approximation (the named `border/bottomnavigaion` style is still unresolvable via
`get_variable_defs`, re-confirmed yet again this pass), but now visually matched by direct
comparison rather than guessed. Also changed `.glass`'s fill from a flat `rgba(44,44,44,0.6)` to a
subtle top-to-bottom gradient (`rgba(60,60,60,0.6)` -> `rgba(30,30,30,0.6)`), per the same
"background gradient, not a solid fill" note - `background/Surface/gradioent` is likewise
unresolvable to exact stops. Progressive Background Blur was explicitly left untouched/deprioritized
this pass, per instruction, while this comparison focused specifically on border + fill gradient.

Verified via an isolated throwaway harness (`FooterNavigation` rendered alone on a plain dark
background, matching Figma's own Components-page presentation context) screenshotted and compared
directly against Figma's screenshot of the same node - then re-checked in its real context (over
the guitar neck) to confirm no regression there. `tsc -b`, `vite build`, `npm run lint`, full test
suite all clean.

### Bottom Navigation unified across all main screens via ViewportScreen's new `footer` prop

Per request: the footer should sit in the exact same position on every main screen, without each
screen configuring it separately, with two named exceptions (Permission: a single button instead;
Select Tuning: no footer at all, removed from Figma).

`ViewportScreen` gained an optional `footer` prop - when provided, it's rendered last inside the
shell's own flex column, wrapped in a new shared `.footerSlot` class (`flex-shrink: 0; width: 100%`)
that now lives exactly once instead of being redeclared as an identical `.footer` rule in every
screen's own CSS module. `SimpleTunerScreen` and `SettingsScreen` (already on `ViewportScreen`) were
updated to pass `footer={<FooterNavigation .../>}` instead of wrapping it in their own `<div
className={styles.footer}>`; their own now-redundant `.footer` CSS rules were deleted.

`AdvancedTunerScreen` was migrated onto `ViewportScreen` for the first time (previously still on the
pre-fix `aspect-ratio` pattern, with the same underlying scroll bug as Simple Tuner had) - Header
is now an ordinary flex child, everything else lives in a new `.main` region, rebased from the
original 874px-canvas percentages the same way SimpleTunerScreen's history documents:
`(originalTopPx - 132) / 636`, where 132px was Header's Figma top offset and 636px
(`874 - 132 - 106`) was the vertical span Figma implied for this region. Its footer is now passed
via the same `footer` prop, landing in the identical position as every other main screen.

`SelectTuningScreen` was also migrated onto `ViewportScreen`, but with **no** `footer` prop at all
- its `FooterNavigation` usage and `.footer` CSS rule were removed entirely, per the user's own
Figma update. Since nothing else on this screen was flex-based to begin with (title/illustration/
picker block were already all absolutely positioned relative to the whole screen, not split into a
Header/Main/Footer column), no rebasing was needed elsewhere - removing the footer just means
there's no longer a sibling reserving space at the bottom, so the existing percentages (still
expressed as fractions of the real, now-viewport-height-driven `.screen`) continue to work
unchanged.

`PermissionScreen` was deliberately **not** touched - it remains the pre-existing placeholder stub
with no Figma reference at all (see its own file comment, unchanged since Stage 5). It already has
no `FooterNavigation` (trivially satisfying the "button only, no Bottom Navigation" exception), but
building its real "single button" design would mean inventing UI with no Figma source to transcribe
- flagged here rather than guessed at.

Verified: full test suite (330 tests / 46 files, up from 328/46 - two tests updated: `ViewportScreen`
gained footer-slot coverage, `SelectTuningScreen` swapped its "navigates via footer" test for a
"renders no footer at all" one). Screenshotted Select Tuning (`hasFooter: false`, no scroll) and
Advanced Tuner (footer's own bottom edge exactly equal to the screen's own bottom edge, matching
every other main screen pixel-for-pixel, no scroll) via the real app (`index.html` -> `AppRouter`),
not an isolated debug page. `tsc -b`, `vite build`, `npm run lint` all clean.

### FooterNavigation: removed an unfounded 6px backdrop-filter on `.pill` (Frame 5)

Reported: the footer's background blur looked noticeably wider than the `FooterNavigation` pill
itself - several dozen px of soft haze bleeding out to each side, well past the capsule's own edge.

Root cause, found by re-running `get_design_context` directly on the pill's own node (`66:3224`,
named "Frame 5" in Figma) rather than trusting the named-effect-style listing: Figma's own codegen
for that exact node emits only a border + two box-shadows (drop shadow, inner shadow) - **no**
`backdrop-blur` class anywhere on it. The previous pass had read Figma's
`Effects/BottomNavigation/Background Blur + Shadow` style (bundling all 3 sub-effects: drop shadow,
a 6px background blur, inner shadow) as "apply all 3 directly to this node" and wired the 6px blur
in as `backdrop-filter` on `.pill` - a real gap in evidence, not a transcription. That 6px blur
doesn't exist on this node in Figma at all; the pill's only real blur is `.glass`'s own (an inset-0
child sized to match Frame 5's 288px exactly). Stacking a third, wider-reading blur directly on
`.pill` - on top of `.glass`'s own blur and `.footer`'s separate, legitimate 402px-wide 2px outer
blur (confirmed real and unchanged, also straight from this node's own codegen) - is what produced
the visibly-wider-than-the-capsule haze.

Fix: removed `backdrop-filter: blur(var(--backdrop-blur-footer))` from `.pill` entirely - nothing
else changed. `--backdrop-blur-footer` stays defined in `theme/tokens.css` (the named Figma style
is still real, just not applied as a `backdrop-filter` on this element). Progressive Blur (`.glass`)
was deliberately left untouched, per the user's own explicit scoping in this same request.

Verified via the same isolated-gallery-vs-in-context technique as the prior border/gradient pass:
built a temporary static bundle (`vite.config.ts` multi-page input, reverted after), screenshotted
`FooterNavigation` alone (`gallery.html`) and the full assembled screen over the guitar neck
(`tuner.html`) via Playwright at a `file://` URL. Blur now reads as confined to the pill's own
rounded-rect boundary in both. Full test suite (330/46) and lint clean; `vite.config.ts` diffed back
to zero before finishing.

### SimplePitchBadge re-evaluation - travel range, smoothing filter, font size (3 tasks, 1 blocked)

Re-read the Figma master component (`66:3594`, "SimplePitchBadge") directly before touching
anything, per the new "Figma is the single source of truth" rule - not from memory of earlier
sessions' notes.

**Task 3 - single text size for all cents values (done).** Re-fetched `get_design_context` on
`66:3594`: the master's own "Tune down" demo now reads `+110` (3 digits) at the exact same
`text-[16px]` class as "Tune up"'s 2-digit `-11` - one size, no separate treatment, confirmed by a
direct screenshot of the master (checkmark/badges render "+110" at the same visual size as "-11").
Removed the `isCompact`/`centsTextCompact` logic from `SimplePitchBadge.tsx`/`.module.css` entirely
and corrected `.centsText` from the previous `20px` to Figma's actual `16px` (the old 20px was
itself never re-verified against real codegen, it was carried over from the original transcription).
Verified visually: temporarily added a `cents={120}` demo to `ComponentGallery.tsx`, screenshotted
`gallery.html`, confirmed "+120" renders at the identical size as "-11"/"+11", then reverted the
gallery change (zero diff after).

**Task 2 - replaced the fixed-time-constant smoothing with a 1€ Filter (done).** The prior
`useSmoothedCents` used a single fixed `tau` (exponential moving average) - investigated per
instruction whether the algorithm itself, not just its constant, was the source of visible
micro-jitter near In Tune: a fixed tau applies identical smoothing whether the raw signal is
genuinely still or genuinely moving, so any per-frame sensor noise always gets the same nonzero
pass-through, no matter how the constant is tuned. Replaced it with a hand-implemented 1€ Filter
(Casiez, Roussel & Vogel 2012 - `src/components/screens/oneEuroFilter.ts`, no new dependency): it
estimates the signal's own rate of change and adapts its cutoff frequency accordingly - heavy
smoothing while ~still (kills the jitter), opening up toward near-instant response once a real,
fast change starts (no added latency for genuine deviations). `useSmoothedCents.ts` now drives this
filter instead of the old EMA math, keeping its existing identity-snap/null-snap behavior
unchanged. This is a motion-feel/engineering choice, not a Figma value - Figma has no motion or
animation spec anywhere in this project (see the Stage 6 motion-architecture log entry), so the
filter's `minCutoffHz`/`beta`/`derivativeCutoffHz` constants are tuned by reasoning about the
domain (cents/second), not extracted from Figma. Found and fixed a real `react-hooks/refs`
violation while implementing (a ref's `.current` was being read/written directly in the render
body to reset the filter on a snap) - moved that reset into its own effect, keyed on the same
`shouldSnap`/`cents` that trigger the snap in the render-time state adjustment. New
`oneEuroFilter.test.ts` covers the filter class directly (single-frame partial convergence,
multi-frame convergence toward a sustained target, jitter damping, `reset()`); `useSmoothedCents.test.ts`
was rewritten for the new filter's actual convergence shape - the old "fully converges after several
time constants" test no longer applies as written to a speed-adaptive filter (a single very-large-dt
frame doesn't imply full convergence the way it does for a fixed-tau EMA, since the estimated speed
for that same frame can still read as low) - replaced with a multi-frame sustained-approach test and
a dedicated alternating-jitter-damping test. 336 tests passing across 47 files (up from 330/46);
`tsc -b`, `vite build`, `npm run lint` all clean.

**Task 1 - horizontal travel range: blocked, reporting instead of guessing.** Re-inspected the
master component directly (`get_metadata` on `66:3594` then `get_design_context`/`get_screenshot`
on it) specifically to verify the "3 different x-positions" claim an earlier session's CLAUDE.md
entry made about this badge's demo states. That claim does not hold up: all 3 state
swatches (In tune/Tune up/Tune down) sit at the **same x** inside their parent frame - they differ
only in overall pill *width*, because each state's label text ("In tune!"/"Tune up"/"Tune down")
and cents digits are different lengths and the pill hugs its own content. Confirmed by direct
screenshot: the tail/pin of all 3 states lines up at the same horizontal position. Separately, the
actual assembled screen (`Main Screen - Default`, node `74:4342`) places exactly **one** static
`SimplePitchBadge` instance (`108:554`, In-tune state) at a fixed `x`/`y` - no second or third
instance anywhere demonstrating an off-pitch position. There is no cents-to-X mapping, no travel
distance, and no saturation curve defined anywhere in Figma - the entire "badge moves horizontally
with pitch deviation" behavior, including its existing ~35px/8.706% max-travel bound and the
`tanh`-based softness curve, was originated in an earlier session by misreading these same-x,
different-width demo swatches as evidence of intentional horizontal motion. Per the new "Figma is
the single source of truth" rule, this is not something to approximate further by feel - it needs
one of:
1. An explicit travel/max-distance value (and ideally an off-pitch demo instance actually
   positioned off-center) added to the Figma file, so a real mapping can be transcribed; or
2. Explicit confirmation that this is intentionally an engineering/product-feel decision outside
   Figma's scope (like the motion constants in Task 2), in which case tell me the desired feel
   (e.g. "should keep moving noticeably out to +-300 cents, roughly linear/roughly log, cap around
   N% of screen width") so a real, deliberate curve can be chosen instead of retuning an
   already-flagged approximation blind.
No changes were made to `badgeLeftPercent`/`BADGE_MAX_OFFSET_PERCENT`/`BADGE_CENTS_SOFTNESS` in
`SimpleTunerScreen.tsx` this pass - left exactly as they were pending this decision.

Nothing in this pass was committed or pushed, per instruction - all changes staged only.

### SimplePitchBadge travel range - resolved from two new Figma demo screens

Follow-up to the blocked Task 1 above: the user added two demo screens to the Figma Main Screen
page (`181:2091` "Tune up -200", `181:2216` "Tune down +200") specifically to define this, and
edited the master component's "Tune down" variant to render label-then-circle instead of
circle-then-label (there's no room for the label to extend right of the circle near the right
screen edge). Re-inspected both directly (`get_design_context` + `get_screenshot`) before touching
any code, per the Figma-source-of-truth rule.

**Confirmed from Figma:** at -200 cents, the circle's own left edge sits exactly 16px from the
screen's left edge (`181:2111`, x=16). At +200 cents, the circle is now the *last* child (label
first), so its own right edge sits close to the screen's right edge (measured ~3.5px in the raw
demo, not 16px - flagged to the user as a likely imprecise/illustrative placement rather than a
deliberate spec, since only the label/circle *order* was a deliberate edit there). User confirmed:
apply the stated 16px margin symmetrically on both sides rather than the raw right-side pixel
value. -200/+200 is an explicit hard stop ("уже не будет двигаться"), not an asymptote.

**Implementation:**
- `SimplePitchBadge.tsx`: for `state === 'Tune down'` only, renders the label before the badge
  column (circle+tail); every other state keeps the original circle-then-label order. Extracted
  both into local `badgeColumn`/`label` JSX variables to swap order cleanly without duplicating
  markup.
- `SimpleTunerScreen.tsx`: replaced the tanh soft-saturation curve entirely with a linear clamp -
  `badgeCircleLeftPercent()` maps cents linearly onto the circle's own left-edge percent, clamped
  to the confirmed range (`BADGE_MAX_CENTS = 200`, `BADGE_BASE_LEFT_PERCENT = 44.527` i.e. 179/402
  unchanged, `BADGE_MAX_OFFSET_PERCENT = 40.547` i.e. 163/402 - derived so -200 cents lands the
  circle's left edge at 16px and +200 lands its right edge at 16px from the opposite edge, both
  confirmed symmetric from the same 163px offset). New `pitchBadgeStyle()` switches the CSS anchor
  between `left` (every state except Tune down) and `right` (Tune down only, since the circle is
  now the last flex child there) - positioning via `left` for Tune down would have tracked the
  label's edge instead of the circle's, drifting as the label text's width changes.
- `SimpleTunerScreen.module.css`: `.pitchBadge`'s transition now covers both `left` and `right` so
  movement glides the same way regardless of which one is active for the current state.
- Tests: rewrote the affected `SimpleTunerScreen.test.tsx` cases for the new model - exact-value
  assertions at the confirmed 16px-margin cap (both directions), a same-position check for two
  different readings past the cap (hard stop, not still-approaching), and a same-side
  distinguishability check for two readings both still under the cap. One test intentionally avoids
  -500 cents for the tune-up/cap case: High E and the next-lowest string (B3) are a perfect fourth
  (500 cents) apart, so beyond roughly -250 cents `findNearestTarget` retargets to B3 instead of
  continuing to show a large deviation from E4 - used -220 instead (still past the -200 cap, still
  closest to E4). No such retargeting risk exists on the sharp/positive side (E4 is the highest
  string in standard tuning, nothing above it to retarget to).

Verified: `tsc -b`, `vite build`, `npm run lint`, full test suite (337 tests / 47 files) all clean.
Screenshotted `gallery.html`'s SimplePitchBadge row to confirm the Tune down label now renders to
the left of the circle, matching the edited Figma master. Nothing committed or pushed yet.

### Octave-error correction for the low-E Tune up/Tune down flicker

Investigated a report of the badge flickering between Tune up/Tune down specifically on the lowest
string. Root-caused to a known McLeod Pitch Method (the algorithm `pitchy` implements) failure mode:
a fixed-duration analysis window (`windowDurationMs: 46`) covers relatively few wave periods for a
low string, making the autocorrelation peak-picking more prone to occasionally reporting an octave
multiple of the true fundamental. `stabilizer.ts`'s own confirmation logic (require a deviation to
persist ~40ms before trusting it) means a genuinely single-frame glitch is already filtered out
before it ever reaches the presentation layer - the readings that do get through are episodes that
persisted just long enough to pass that gate.

**First approach (built, then reverted): audio-engine-level correction.** Built a
`signal/octaveCorrector.ts` module (comparing each candidate against its own last-plausible-frequency
memory, folding by whole octaves when close to a match) sitting between Candidate Validation and the
Stabilizer. Discovered a real, disqualifying bug in this project's own tuning data before shipping
it: Drop D's Low D and D string (`guitar-drop-d`) are *exactly* one octave apart (D2/D3), and standard
tuning's Low E/High E are exactly two octaves apart (E2/E4) - a genuine, sustained switch between
either pair would get permanently folded back onto the old string, since the module's own
"last-plausible" anchor kept re-confirming the wrong octave every subsequent frame. `audio-engine`
has no knowledge of which target/string is being tuned (a deliberate boundary - `music-theory`'s
`StringTarget`/tuning-preset types never appear there), so there was no way to resolve that
ambiguity correctly at that layer. Reverted entirely (deleted the module, restored
`frameProcessor.ts`) rather than ship a fix with a known permanent-lockup regression on Drop D.

**Shipped instead: presentation-layer correction in `tunerPresenter.ts`**, where the real target list
*is* known. `resolveMatch()` now tries every octave-shifted interpretation of a reading (within
+-2 octaves - `octaveFoldedCents()`) against a specific target frequency, in two places:
- **Pinned mode**: unconditionally, since there's only one possible target while pinned - whichever
  octave lands closest to it is simply the detector's best read of that same string, never a
  competing hypothesis.
- **Auto mode**: as a continuity check against `currentTarget` (the target the last reading
  matched), but only overriding the plain nearest-target search (`findNearestTarget`) when the
  octave-folded reading is closer by more than `OCTAVE_CONTINUITY_MARGIN_CENTS` (100). This margin
  is exactly what protects the Drop D/standard-tuning octave-apart pairs found above: a genuine
  switch between them ties at ~0 cents both ways (folded-toward-old vs. matched-to-new), which is
  *below* the margin, so the plain search always wins a tie - only a clearly-worse-explained-any-
  other-way reading gets folded back to the target already being tracked.
- `currentTarget` is only trusted as a continuity anchor if it's still actually present in the
  current `targets` array (re-looked-up by id, exactly like the existing pinned-target lookup) -
  `setTargets()` doesn't clear `currentTarget` (by design, see its own comment), so an unguarded
  reuse here would have resolved to a stale, no-longer-valid target after a tuning-preset switch.
  Caught by an existing test (`setTargets - takes effect on the next reading`) failing before this
  guard was added.

**Explicitly not fully solved, flagged rather than silently ignored:** a string tuned significantly
(~200+ cents) flat can, by coincidence, have its octave-doubled misread land close enough to a
*different* real target's own zone to slip past the margin and momentarily flip targets anyway. This
isn't fixable from frequency+clarity alone - would need additional signal (e.g. timbre/harmonic-
profile analysis) this pipeline doesn't have. Judged an acceptable residual: it only occurs at a
specific, fairly extreme mistuning amount, not during ordinary "close to in tune" playing, which is
the case the original report was about.

Added 6 new tests in `tunerPresenter.test.ts` (`describe('octave correction')`): suppressing a single
octave-up glitch and a subharmonic (octave-down) glitch while sustained on one target; a genuine
switch between two targets a full octave apart still working; pinned-mode glitch correction; a
genuinely different (non-octave) switch being unaffected; and the very-first-reading case (nothing
to anchor continuity to yet). Full test suite (343 tests / 47 files, up from 337/47), `tsc -b`,
`vite build`, `npm run lint` all clean.

### Identity-switch hysteresis - the octave-fold margin's real-world gap

Confirmed working in real Telegram testing (flicker gone), but a follow-up report reproduced the
exact residual limitation flagged above: detuning the Low E string down to (roughly) D2 made the
tuner jump to showing D3. Root cause: D3 sits exactly 2 semitones above E2, so E2 detuned exactly 2
semitones flat has its octave-doubled misread land *exactly* on D3 - not a coincidence, a structural
property of octaves/note-naming. `OCTAVE_CONTINUITY_MARGIN_CENTS` only protects a *tie* (folded and
naive both near 0 cents); here the naive match is a perfect 0-cents "match" against D3, so no margin
value can prefer continuity without also breaking legitimate target switches elsewhere.

Added a second, independent line of defense: `onReading()` no longer commits to a differing target
instantly. A new `pendingTargetSwitch` (target + first-observed timestamp) requires the *same*
differing target to be suggested consistently for `IDENTITY_SWITCH_CONFIRM_MS` (120ms - several
times the Stabilizer's own ~40ms confirmation window) before `currentTarget` actually updates; until
then, the reading is redisplayed against the still-current target (trying every octave
interpretation via the same `octaveFoldedCents()` helper). A brief, Stabilizer-confirmed-but-still-
wrong octave episode (a few frames) doesn't clear this second window; a genuine string change
(sustained for as long as the user keeps playing it) does.

`setTargets()` is deliberately exempt: it now also clears `currentTarget`/`pendingTargetSwitch` (not
just `pinnedTargetId`/`tunedTargetIds` as before) so the next reading commits immediately via the
existing `currentTarget === undefined` fresh-start path, preserving its own documented "takes effect
on the next reading, not retroactively" contract - a preset switch is an explicit configuration
change, not signal ambiguity, so the confirmation delay doesn't apply to it. `clearIdentity()` also
now resets `pendingTargetSwitch`, consistent with the other per-identity fields it already clears.

This intentionally changes an existing, previously-tested contract (target switches were instant on
a single differing reading) - updated the 3 existing tests that assumed that via a new `switchTo()`
test helper (mirrors `lockIn()`'s own loop-with-safety-valve shape: feeds the new frequency
repeatedly until the presenter actually commits). Added 5 new tests in a
`describe('identity switch hysteresis')` block: a single differing reading doesn't switch; a brief
run that reverts before the window elapses recovers cleanly; a direct model of the exact reported bug
(Low E detuned 2 semitones flat, a brief octave-doubled glitch landing exactly on the other target,
does not flicker); the same setup *does* switch when the reading at that target genuinely persists;
and `setTargets()` remains exempt from the delay. 348 tests / 47 files (up from 343/47), `tsc -b`,
`vite build`, `npm run lint` all clean. Nothing committed or pushed yet.

### Pitch pipeline redesign - octave correction moved into audio-engine, TunerPresenter reverted to plain

The identity-switch-hysteresis entry directly above is **superseded and reverted in full** -
`tunerPresenter.ts`/`.test.ts` are back to their pre-octave-anything state (the version before
commit `a0bc6a7`). This followed a full architecture review (not implemented until agreed): letting
`TunerPresenter` reach for octave-folding, a continuity margin, *and* its own switch-confirmation
timer was exactly the "Presenter becomes a second DSP state machine" anti-pattern it should never
have become - a presentation-layer component receiving an already-correct signal and deciding only
how to display it should never need any of that.

**Investigated first, per instruction, and abandoned quickly since it didn't pan out:** whether
tuning `pitchy`'s own internal `clarityThreshold` (the MPM paper's "k", confirmed via source read to
control exactly this decision - which autocorrelation peak wins when a shorter-lag/higher-frequency
one is comparably tall to the true fundamental's) would reduce octave errors as a first line of
defense. Built a synthetic reproduction (decaying fundamental + a second harmonic with realistic
decay/inharmonicity/noise, swept across guitar/Drop-D/bass low-string frequencies) and varied `k`
from 0.9 to 0.999: **zero measurable effect on the outcome in any trial**, and the octave error
itself couldn't even be reliably reproduced synthetically short of unrealistically extreme harmonic
dominance (5x the fundamental's amplitude). Conclusion: `clarityThreshold` is not a working lever
within any reasonably-constructed test, so the Octave Corrector below is the primary defense, not a
secondary one sitting behind detector tuning. Per instruction, this did not become its own
investigation branch - one script, one clear negative result, move on.

**New pipeline** (`frameProcessor.ts`): Window Accumulator -> RMS Gate -> Pitch Detector -> Candidate
Validator -> **Octave Corrector** (new) -> Stabilizer -> `PitchReading`. `signal/octaveCorrector.ts`
sits strictly before the Stabilizer, deliberately: feeding a wrong-octave candidate into Stabilizer's
median/EMA first would corrupt its temporal state before correctness has even been decided.

Design, per the agreed document:
- **Target-agnostic on principle, not just by convention.** Compares each candidate only against its
  own small internal `referenceFrequency` (the last frequency it considers plausible) - never a
  `StringTarget`, never touches `music-theory`'s tuning-preset types. Re-derived (not just asserted)
  why this is right, not merely boundary-clean: in a future chromatic mode, *every* frequency has an
  octave-sibling that's *also* a valid note, always - a target-aware check would have nothing to
  discriminate on in that mode, so frequency-only correction is the only version of this that keeps
  meaning something once chromatic mode exists.
- **Owns a narrow, independent slice of temporal confidence - not Stabilizer's.** Explored making it
  fully stateless (just fold toward Stabilizer's current EMA every frame, no memory of its own) and
  traced through why it fails concretely: on a genuine sustained switch between two targets an exact
  octave apart (Drop D's Low D/D string; standard tuning's Low E/High E), a fully stateless version
  re-folds the incoming reading *every single frame*, forever - Stabilizer never even sees the real
  value to start building its own case. That's the exact permanent-lockup bug from the first
  abandoned `audio-engine` attempt, just re-derived from a different angle. Also considered reading
  Stabilizer's own `pendingDeviation` state instead of keeping separate memory (avoids two
  persistence mechanisms existing at all) - rejected: it means reaching into Stabilizer's internals,
  the exact cross-module coupling neither of us wanted. Landed on: a small, independent counter -
  `pendingAlternate` (the first-observed alternate frequency + how many *consecutive* candidates have
  reinforced it) - answering only "which octave," never "how much do I trust the resulting pitch's
  absolute accuracy over time" (still entirely Stabilizer's job, unchanged). Confirmed via
  `OCTAVE_CONFIRM_FRAMES` reached: accepts the new octave as reality; not yet reached: keeps folding.
  Frame-count, not wall-clock ms, specifically because this module lives right next to the pipeline's
  own fixed hop cadence - the one place in this whole investigation where "confidence via consecutive
  observations" is the correct framing (it was the wrong framing at the Presenter layer, which is why
  that attempt was reverted).
- **`OCTAVE_CONFIRM_FRAMES = 5` is a starting estimate, explicitly flagged as such** - real
  octave-glitch episode duration hasn't been measured against real playing yet (see the investigation
  list below). Same treatment as `minRmsAmplitude`'s own history: ship a reasoned starting value,
  revisit once real calibration data exists.
- **Pinned-mode target hint deliberately deferred, not built.** Presenter could, in principle, supply
  the exact expected frequency while a string is pinned (strictly more information than
  frequency-continuity alone), but this needs new live-config plumbing between `TunerPresenter` and a
  running `AudioEngine` that doesn't exist in any form today (confirmed: `AudioEngine`'s public
  interface has no live-updatable config channel at all - `a4`/pin currently live entirely inside
  `TunerPresenter`). Not built without evidence it's needed for pinned mode specifically, and it's
  actively unhelpful in a future chromatic mode besides (no single "the pinned target's frequency"
  concept once not choosing from a small discrete set). Flagged, not implemented.

**`TunerPresenter` is back to exactly its pre-`a0bc6a7` shape**: `resolveMatch()` is the plain
pinned-target-or-`findNearestTarget()` function it always was. No octave folding, no continuity
margin, no switch-confirmation timer. It now only ever receives an already octave-safe, already
temporally-stable frequency - every remaining thing it does (in-tune hysteresis, lock duration/rapid-
adjustment, haptic cooldown, tuned-target bookkeeping) is a genuine presentation-layer decision, not
a disguised DSP one.

**Tests**: `octaveCorrector.test.ts` (new, 11 tests) covers bootstrap, ordinary continued
tracking/drift passing through unchanged, single-frame glitches (both directions) being folded and
recovering cleanly if they don't persist, the confirm-count boundary itself, a direct model of the
reported bug (Low-E-detuned-exactly-onto-D3 - brief glitch doesn't stick, sustained switch does), and
`reset()`. `tunerPresenter.test.ts` is back to its original 27 tests, unchanged from before any of
this. Full suite: 348 tests / 48 files, `tsc -b`, `vite build`, `npm run lint` all clean.

**Known limitation, unchanged from before and inherent to the problem, not this design specifically**:
a string tuned significantly (~200+ cents) flat can still, by coincidence, have its octave-doubled
misread persist long enough (past `OCTAVE_CONFIRM_FRAMES`) to be accepted as genuine if it happens to
land very close to another real target's frequency. No frequency-only mechanism, in any layer, closes
this completely - only real calibration data (does this actually happen for long enough at real
`OCTAVE_CONFIRM_FRAMES` values in practice) narrows how often it matters.

Nothing committed, pushed, or deployed - awaiting local verification.

### Bottom Navigation architecture - single AppShell-owned instance, no longer created per screen

Full architecture audit (via Figma MCP on the `BottomNavigation` component set, `66:3222`/`66:3223`/
`66:3232`, and every screen instance using it) plus a codebase audit, then implementation, spanning
three passes: (1) Figma-only analysis, no code, (2) a second architecture review of the proposed
React design before writing anything, (3) the implementation itself.

**What Figma confirmed, engineering-only (not visual):** `BottomNavigation` is one component set with
a single `property1: "Tuner" | "Settings"` variant axis (not two components, not independently
togglable per-tab state) - `FooterNavigation.tsx`'s existing `active` prop already matched this
correctly. Every screen instance (Simple/Advanced Tuner, Settings) sits at an identical
`x:0, y:768, width:402, height:106` - flush to the canvas's own bottom edge, no Figma-side safe-area
inset anywhere (the only bottom-safe-area-shaped node, Home Indicator, lives inside the
non-exportable `system(ios) - don't copy` layer). Select Tuning has no footer instance on either of
its two frames - a deliberate Figma removal, not an oversight. `get_metadata`/`get_design_context`
don't expose Figma's own `constraints` field (only x/y/width/height + generated CSS), so the
literal Figma-side pin behavior (vs. `bottom-pinned` inferred from the numbers) is unconfirmed and
was flagged as such, not guessed past.

**Why this changed:** every screen that wanted Bottom Navigation (`SimpleTunerScreen`,
`AdvancedTunerScreen`, `SettingsScreen`) previously created its own `<FooterNavigation>` and passed
it into its own `<ViewportScreen footer={...}>` - three duplicated `onSelect` handlers, only one of
which (`SettingsScreen`'s) correctly accounted for `preferences.tunerMode` when routing the Tuner tab
back. Because `AppRouter` is a plain `switch` that fully unmounts the outgoing screen's subtree,
Footer was destroyed and recreated from scratch on every navigation - the reported flicker - and each
screen's own `ViewportScreen` mount meant `useTelegramViewportHeight()` re-subscribed to Telegram's
`viewportChanged` event on every navigation too, an inefficiency nobody had asked about directly but
that the same audit surfaced.

**Architecture chosen, and why not simpler alternatives:** considered (and rejected) two other
shapes before landing here - passing `footer` down from a new outer component while every screen
kept its own `<ViewportScreen>` (doesn't work: produces `ViewportScreen` nested inside
`ViewportScreen`, double height/background/overflow, double Telegram-viewport subscriptions); and a
`position: fixed` footer left entirely outside any `ViewportScreen`, screens unchanged otherwise
(simpler diff, but inherits mobile Safari/WebView's known `position:fixed`-during-viewport-resize
jitter - directly the scenario `useTelegramViewportHeight` exists to handle correctly - and leaves
the N-times-duplicated Telegram-viewport-subscription cost in place). Landed on: `ViewportScreen` is
now mounted **exactly once**, by a new `components/layout/AppShell.tsx`, wrapping `<AppRouter />` as
its `children` and a single `<FooterNavigation>` as its `footer` prop (unchanged prop, unchanged
`.footerSlot` mechanism - only its one mount point moved). Individual screens no longer size
themselves against the real viewport or know `FooterNavigation` exists at all.

**What this required changing in every screen** (`SimpleTunerScreen`, `AdvancedTunerScreen`,
`SettingsScreen`, `SelectTuningScreen`): each screen's own `.screen` root is no longer a
`<ViewportScreen>` - it's a plain `<div>` that composes a new `.routedScreen` class (in
`ViewportScreen.module.css`, alongside the unchanged `.viewportScreen`/`.footerSlot`) instead of the
full `.viewportScreen` recipe. `.routedScreen` reproduces exactly what `.viewportScreen` used to give
every screen for free - `position: relative`, `display:flex; flex-direction:column`, `flex:1 1 auto;
min-height:0`, `width:100%` - as the one flex item AppShell's own `ViewportScreen` hands each routed
screen to fill, alongside Footer's own `.footerSlot` sibling. `position: relative` specifically
matters for `SelectTuningScreen`, whose children position as `absolute` directly off `.screen` with
no intermediate `.main` wrapper - losing it silently would have re-anchored them to AppShell's own
box instead. `SimpleTunerScreen`/`AdvancedTunerScreen`/`SettingsScreen` also each lost their
now-unused `useNavigation()` call (it existed solely to feed the screen's own `onSelect` handler,
which no longer exists) - `SimpleTunerScreen` keeps it (still needed for `onTitlePress` ->
`select-tuning`); `SelectTuningScreen` keeps it too (`handleSelectTuning`'s own navigation is
unrelated to the footer and was never footer-driven). `ViewportScreen`'s own `className` prop was
removed as dead API surface once AppShell became its only caller (no per-instance styling is needed
across a component now mounted exactly once).

**`SCREENS_WITHOUT_FOOTER`** (`AppShell.tsx`, a plain `ReadonlySet<ScreenId>` - `select-tuning`,
`permission`) is a static, declarative exclusion list, not a registration API a screen calls to hide
itself - screens cannot create or suppress Footer, only end up listed. Deliberately not built as a
dynamic `useFooterVisibility().hide()`-style hook: today's `ScreenId` is a flat, closed 5-value enum
with no per-instance/sub-state fullscreen concept, so a static table is the correctly-sized
abstraction per this project's architecture-freeze stance - flagged the concrete trigger for
upgrading it (a future fullscreen mode needed *within* an already-mounted screen, without a route
change) rather than building that capability preemptively.

**Deliberately kept out of AppShell's responsibility:** future modals. Modals should use a portal
(`document.body` or a dedicated root), which stacks above Footer automatically without AppShell
needing any modal-awareness at all - considered and rejected making AppShell a general overlay
manager for exactly this reason.

**Verification: new `AppShell.test.tsx`** (6 tests: Tuner-active on Simple Tuner, Settings-active on
Settings, no navigation landmark on Select Tuning, footer DOM-node identity survives a Simple Tuner
-> Settings -> Simple Tuner round trip, tunerMode-aware back-navigation for both `simple`/`advanced`)
plus removal of the now-structurally-impossible-to-trigger "navigates via footer" tests from the 3
screens' own test files (a screen rendered standalone no longer has a footer to click) and the
"renders no footer" test from `SelectTuningScreen.test.tsx` (trivially true unconditionally now, not
a meaningful assertion). Also verified, via the project's established static-build +
`--disable-web-security` Playwright + `file://` technique (the plain `crossorigin` module-script
technique alone started failing under a newer bundled Chromium's stricter `file://` CORS enforcement
- worked around, not a regression in this app's own output) at a real 390x844 viewport: zero page
scroll at every navigation step, Footer's own bounding box flush to the true viewport bottom edge,
Footer's DOM node (tagged with a throwaway attribute) provably identical across a full Simple Tuner
-> Settings -> Simple Tuner round trip (no remount), Simple Tuner's guitar illustration still bleeds
under Footer's translucent band exactly as before (the specific regression this project's own history
already flagged as a real, previously-hit failure mode), and Select Tuning renders with no
`navigation` landmark and fills the full viewport height with zero scroll. Zero console
errors/warnings across the entire click-through. 341 tests / 48 files, `tsc -b`, `vite build`,
`npm run lint` all clean.

Nothing committed or pushed yet, per instruction.

### Animation System — Stage 1 (foundation)

Full architecture discussion happened before any code (a dedicated design document covering where
the system lives, its module boundaries, React vs. non-React split, and a tiered CSS/JS-engine
model), then Stage 1 was scoped deliberately narrow per explicit instruction: prove the
infrastructure works in the real app, don't invent a production UI consumer just to exercise every
primitive.

**What:** `src/animation/` (new, zero React, parallel to `audio-engine/`) - `scheduler.ts`,
`sharedValue.ts`, `easing.ts`, `interpolate.ts`, `tween.ts`, `spring.ts`, `activeDriver.ts`,
`types.ts`, plus a public `index.ts` barrel. React glue in `src/hooks/`: `useSharedValue.ts`,
`useSpring.ts`, `useTween.ts` - same split as `audio-engine/` + `useAudioEngine.ts`, not a new
pattern. `useAudioEngine.ts`'s own tick loop now subscribes to the shared `scheduler` instead of
calling `requestAnimationFrame` itself.

**Why the tiered model, not one universal engine:** CSS transitions/keyframes remain the primary
mechanism for simple, discrete state-to-state animation (already how this project does most of its
motion - footer blur, chevron rotation, `.pitchBadge`'s own transition) - cheap, compositor-driven,
no JS involvement. `src/animation/`'s JS engine exists only for what CSS structurally can't do:
values driven by a continuous live signal, or animations that need to be interrupted mid-flight
without a visual jump. "All animations flow through this system" (the original ask) is interpreted
as "this system governs the decision and owns the primitives," not "every animation's runtime must
be JS-driven" - forcing trivial CSS-appropriate cases through a JS engine would be slower and
contradicts this project's own established preference for CSS Modules over animation libraries.

**Real motivating evidence, not hypothetical:** `useAudioEngine.ts` already had its own independent
`requestAnimationFrame` loop before this stage (polling `presenter.tick()` into React state every
frame while `listening`) - confirmed by reading the file directly, not from memory. This is the
concrete "app already has more than one rAF loop" problem the scheduler exists to prevent from
multiplying further, and it's also Stage 1's one production integration (see below) - not a second,
separately invented example.

**A real discrepancy found and reported before planning Stage 1, not glossed over:** an earlier
session's CLAUDE.md entries describe `useSmoothedCents.ts`/`oneEuroFilter.ts` (a One Euro Filter
driving `SimplePitchBadge`'s smoothing) in detail, as if still-current work. They are not - `git log`
confirms they were added in `761e4db` and explicitly reverted in `f24b1be` ("revert Pitch Badge
motion experiments"), part of the pitch-pipeline redesign that moved octave correction into
`audio-engine`. The current `SimpleTunerScreen.tsx` has no smoothing filter at all. This is exactly
why Stage 1's own completion criteria were revised mid-conversation: "migrate the existing
`useSmoothedCents`" was never actually available as a real task, and manufacturing a fake production
consumer just to exercise `spring()` was explicitly rejected rather than substituted in.

**Ownership invariant, found while implementing, not pre-specified:** nothing originally guaranteed
"at most one active driver per `SharedValue`" - `tween()`/`spring()` each opened independent closures
with no awareness of each other, and `useSpring`/`useTween` only avoided a real conflict by accident
of React's effect-cleanup-before-next-effect ordering, which a caller bypassing the hooks could
easily violate. Resolved without any identity/token tracking: a legitimate retarget always releases
(via `stop()`) before reclaiming, so `activeDriver.ts`'s registry finding an existing, un-released
claim at `claimDriver()` time is structurally proof of two independent, uncoordinated owners, never a
false positive against a real retarget. Behavior is deliberately asymmetric by environment, decided
after discussion of both a hard-throw and a silent-auto-recover option and rejecting both as the
sole answer:
- **Development:** the conflict is logged as loudly as possible - `console.error` (including the
  *original* claim's captured stack, not just the new one, so both call sites are visible at once)
  plus `console.trace()` for the rejected attempt - and the new driver is rejected outright: it never
  subscribes to the scheduler, the existing driver keeps running untouched, system state doesn't
  change. A hard `throw` was considered and rejected - this project has no Error Boundary anywhere
  yet, so an uncaught throw inside a `useEffect` would tear down the whole subtree, disproportionate
  for what's a "fix your code" signal, not a runtime failure requiring execution to halt.
- **Production:** silently auto-recovers instead (stop the old, claim the new) - a real user must
  never see a frozen or fought-over animation because of a development mistake that slipped through.
- Gated on `import.meta.env.DEV`, Vite's build-time-replaced constant. Verified empirically, not just
  assumed: grepped the real production bundle (`dist/assets/*.js`) after `npm run build` for the
  warning's own message text - zero matches, confirming the entire dev-only branch (including the
  stack-capture cost) is dead-code-eliminated from what ships to real users, not merely skipped at
  runtime.

**`spring()`'s own interruption mechanism:** velocity is tracked in a `WeakMap<SharedValue, number>`
keyed by the value itself, not held inside each `spring()` call's own closure - a second `spring()`
call retargeting the same value inherits real momentum instead of restarting from rest, which is the
entire reason to reach for spring over tween. Sub-steps any delta above one frame's worth
(`MAX_STEP_MS`) so a long GC pause or busy main thread can't destabilize the semi-implicit Euler
integrator.

**`easing.ts` deliberately ships no named presets** (no "standard"/"decelerate"/"accelerate"), only
`linear` and a `cubicBezier(x1,y1,x2,y2)` constructor (Newton-Raphson with a bisection fallback) -
`theme/animation.ts`'s own `EasingTokens` are still shape-only, zero values, because Figma has no
animation design in this project yet. Naming invented curves under design-sounding names would be
exactly the kind of un-sourced design value this project's own rules prohibit.

**Not built, per explicit scope:** `timeline`/`sequence`/`stagger` (deferred to the next tier, once a
real choreography need exists); a `useSyncExternalStore`-based hook for the case where an animated
value must appear in React-rendered text/markup, not just an imperative style write (flagged as a
real, known-needed gap for whenever the first such UI consumer arrives, not solved speculatively
now).

**Verified:** 68 new tests (437 total across the project), `tsc -b`, `vite build`, `npm run lint` all
clean. `useAudioEngine.test.ts` gained one test that fires the scheduler's actual queued frame
(overriding the file's usual always-inert rAF stub for just that case) and confirms
`presenter.tick()` genuinely ran via a real, observable state transition (`active` -> `searching`
after crossing `LOST_GRACE_MS` with no new reading) - proof the integration works, not just that
`requestAnimationFrame` got called once.

**Not yet done, next stage per instruction:** no screen or design-system component consumes
`SharedValue`/`spring`/`tween` yet - `useAudioEngine`'s scheduler subscription is the only thing
running in the real app today. The first real UI consumer (whatever animation actually needs
interruptible/signal-driven motion first) is deliberately still pending, not pre-selected.

### Animation System — project-wide CSS-vs-engine audit, and SimplePitchBadge paused before Stage 2

Full audit of every existing animation/transition in the app (`grep` across all of `src` for
`transition`/`@keyframes`/`animation-`, plus manual review of every screen for JS-driven continuous
positioning), done before writing any migration code, per explicit instruction not to migrate
anything without real need.

**Findings - the real inventory is small:**
- `.chevron` rotation in `SelectTuningScreen.module.css` (`transition: transform 250ms ease`,
  Power/Open/Extras expand/collapse) - a discrete, click-triggered toggle. Correctly stays plain CSS
  (Tier 0) - nothing to migrate.
- `SimplePitchBadge`'s horizontal position (`SimpleTunerScreen.tsx`, `badgeLeftPercent(cents)` in an
  inline `style`) - the **only** real Tier 1 candidate: driven by a continuously-changing signal
  (`presentation.cents`), currently with **zero** transition/smoothing of any kind - it teleports to
  a new position on every reading.
- `SelectTuningScreen`'s native `scroll-snap-type`/`scrollIntoView` - browser-native scrolling, not a
  CSS `transition` or JS animation in this system's domain. Out of scope for either CSS or the engine.
- Two `transition` rules in `App.css` are dead code - that file isn't imported by anything since
  `App.tsx` became the real `AppProviders`/`AppShell` entry point; not part of the live app.
- Every other design-system primitive (`Button`, `ToggleSwitch`, `CheckIndicator`, `StepperButton`,
  `SegmentedControl`, `StringControl`'s state changes, `NoteCircle`, `AdvancedStatusBadge`,
  `AppHeader`) has **no** transition/animation at all today - state changes are instant. Not in scope
  as "existing animations to migrate" since there is nothing there to migrate; giving any of them a
  first animation at all would be new work, not migration, and wasn't asked for.

Conclusion: the "staged migration plan, most to least valuable" the task asked for collapses to a
single real candidate (`SimplePitchBadge`) - reported honestly rather than inventing extra stages to
match the expected shape of the answer.

**Design agreed for `SimplePitchBadge`, not yet built:** a single source of truth -
`presentation.cents` drives exactly one `SharedValue<number>` (via `spring()`), which both the
badge's DOM position (imperative `ref`/effect write, not through React) and its displayed cents text
(via a new `useSharedValueState` hook, `useSyncExternalStore`-based, not yet built) read from - never
two independent reads of `presentation.cents` for position vs. text.

**A real finding that changed the framing of the problem:** `audio-engine/signal/stabilizer.ts`
already runs a median filter (window 5) plus an asymmetric EMA (release α=0.15, attack α=0.6) on the
detected frequency *before* it ever becomes `presentation.cents` - the signal reaching the UI is
already meaningfully smoothed, not raw detector noise. This reframes what badge-level smoothing
actually needs to solve: not "reject noise" (already handled upstream), but "add continuity between
already-fairly-stable discrete steps arriving every ~12-23ms" - a materially gentler problem than
originally assumed.

**Spring vs. a dedicated smoothing driver - not yet decided, deliberately not pre-built:** per
explicit instruction, no new driver was added speculatively. Plan was to implement first with
`spring()` (the existing primitive) - stiffness/damping unknown yet, with the prior, reverted CSS
implementation's `transition: left 100ms ease-out` as the one concrete empirical anchor for a
starting settling time, not a value invented from nothing - and evaluate on a real device against
three named criteria: stable while a note is held, catches up quickly on a real pitch change, never
reads as laggy. A structural limitation of any single fixed-parameter spring was flagged before
implementing: it has one time constant, so it cannot simultaneously be "settle instantly on tiny
residual jitter" and "track fast on a genuine note change" the way an adaptive/speed-sensitive filter
(e.g. a One Euro Filter, the same shape as the earlier, reverted `useSmoothedCents` work) can - but
since the upstream stabilizer already shrinks the jitter this would need to reject, this limitation
might not matter in practice. Only meant to be escalated to a dedicated driver if the spring
demonstrably fails the three criteria on a real device, not pre-emptively.

**Paused here, not implemented:** before writing any Stage 2 code, the user recalled that an earlier
session's attempt at this exact kind of pitch-badge motion (see the "SimplePitchBadge re-evaluation"
and "Pitch pipeline redesign" entries above - `useSmoothedCents`/`oneEuroFilter`, built in `761e4db`,
reverted in `f24b1be`) made the badge *less* smooth, not more - it started visibly jittering. Wants
to think this through further before committing to an approach, rather than repeat that outcome.
Genuinely unresolved and worth investigating before resuming, not assumed: that revert's own commit
message and this file's own log both frame it primarily as an *architecture* problem (octave
correction needing to move into `audio-engine`, decoupled from `TunerPresenter`), not explicitly as
"the smoothing felt bad" - whether the perceived jitter back then came from the smoothing algorithm
itself, the badge's travel-range/clamp curve, an interaction with the octave-correction bugs that
were being fixed in the same pass, or something else entirely, was never actually isolated. Worth
determining specifically before trusting that spring (a different algorithm from what was tried
before) would or wouldn't repeat it.

**State at pause: zero Stage 2 code written.** `useSharedValueState` doesn't exist yet.
`SimpleTunerScreen.tsx` is unchanged - `badgeLeftPercent()` is still the same plain, unsmoothed inline
style it was before this whole discussion. Nothing to roll back if resumed differently later - this
is a planning pause, not a partial implementation.

### Settings keep-alive restored, Select Tuning gained internal animations + an iOS card-modal entrance, haptics audit

Four-task pass, executed in the requested order. Unrelated to the paused SimplePitchBadge Stage 2
work above - `useSharedValue`/`spring` are not touched by any of this; every animation here is plain
CSS (Tier 0), matching the CSS-vs-engine audit's own conclusion that this project has essentially one
real Tier 1 candidate (the pitch badge) and everything else is discrete/state-driven.

**1. Settings keep-alive.** Restored the exact mechanism from the previously-reverted `d97b555`
(`resolveScreen.tsx`, `RouteTransition.tsx`/`.module.css`/`.test.tsx`, `AppShell.tsx` now renders
`<RouteTransition />` instead of `<AppRouter />`) - this was reverted wholesale during an emergency
rollback (see the "Emergency full rollback" entry above) together with the footer-bounce transition
that actually caused the real-device lag; the keep-alive mechanism itself was never the problem.
Settings mounts once on first visit, then only ever shows/hides via a `.hidden` (`display:none`)
class. Simple/Advanced Tuner (live microphone) and Select Tuning (its own slide mechanic, see below)
are deliberately excluded, unchanged from the original design.

**2. Select Tuning internal animations.**
- `SegmentedControl` (Guitar/Bass): a new absolutely-positioned `.pill` slides via
  `transform: translateX(calc(var(--index) * 100%))`, sized off `--count`/`--index` custom
  properties set inline from the option list/active index - works for any option count without new
  CSS per usage. `.active` no longer paints its own background; only `color` transitions now,
  synced to the same duration as the pill.
- Power/Open/Extras accordion: `buildCatalogRows`/`CatalogRow` (a flat list that used to omit a
  collapsed category's tunings from the DOM entirely) replaced with `buildCatalogGroups`/
  `CatalogGroup` - every tuning row is now always mounted, wrapped in a `.expandWrapper` using the
  `grid-template-rows: 0fr -> 1fr` technique (no JS height measurement needed) with `.expandInner`
  providing the `overflow: hidden` that clips content mid-transition.
- `Button`: gained a project-wide `:active:not(:disabled) { transform: scale(0.96) }` press state
  (previously had none at all) - shared by Select Tuning's Save and Advanced Tuner's Reset for free,
  since both already use this component.
- `CheckIndicator`: gained its first CSS module (previously pure inline styles). Both the Default
  ring and Active checkmark `<path>` now render unconditionally, crossfading/scaling via
  opacity+transform transitions instead of one being swapped for the other - a swap can't animate,
  since React just replaces the DOM node.
- None of these have a Figma motion source (Figma has no animation spec for this screen at all,
  consistent with every other motion decision in this project) - durations/curves are an engineering
  read, confirmed acceptable with the user up front rather than assumed.

**3. Haptics audit.** Added `triggerHapticFeedback('light')` to every spot confirmed with the user:
`StepperButton` (+/-, wired once inside the shared component itself - covers both Settings' and
Advanced Tuner's Calibrate rows for free, unlike `Button` which gets it per call site since it's used
for varied purposes), Select Tuning's Save and Advanced Tuner's Reset, `SegmentedControl` (only when
actually changing tabs, not on a no-op tap of the already-active one), tuning-row selection
(`TuningRow` and Standard's own row, same "only if actually changing" guard), and the Power/Open/
Extras chevron toggle.

**4. Select Tuning iOS card-modal entrance.** Replaced the old plain horizontal push-slide
(`exitSlideOutRight`/`enterSlideInRight`, no backdrop, no rounded corners - the user's own
description of why it "looked bad" before) with a vertical card-modal presentation:
`exitSlideDown`/`enterSlideUp` (`translateY` between `100%` and `0`), a `.scrim` backdrop
(`rgba(0,0,0,0.4)`, fading in/out via its own `scrimIn`/`scrimOut` keyframes, DOM-ordered between the
underneath layer and the sliding sheet so it stacks correctly with no `z-index` needed), and rounded
top corners (`var(--radius-card)`, reusing the existing 24px token) on the sheet itself. Direction
changed from horizontal to vertical deliberately, not per an explicit ask - rounded-corners+backdrop
is specifically iOS's card/sheet presentation idiom, not its push-navigation one; flagged to the user
as a judgment call, not silently decided.

No Figma source exists for any of this (Select Tuning has no modal/sheet frame anywhere in Figma -
confirmed, same as every previous check in this project). Confirmed acceptable with the user before
implementing: the 24px radius (reusing `--radius-card`) and the `rgba(0,0,0,0.4)` scrim. The easing
curve (`cubic-bezier(0.32, 0.72, 0, 1)`) is Apple's own publicly-documented UIKit sheet-presentation
curve, not invented.

**Real bug found via Playwright screenshot, not by inspection alone:** the first implementation gave
the sliding sheet `border-radius` + `overflow: hidden` but no background fill of its own - every
screen in this app relies on the page background painted once by the singleton `ViewportScreen`
sitting behind every `RouteTransition` layer, so the "rounded corner" had nothing visually distinct
to clip and was invisible despite being structurally correct (confirmed via computed-style
inspection: the border-radius and translateY were both correct at the DOM level, the corner just
wasn't perceptible in a screenshot). Fixed with a `.sheetSurface` fill, composed onto both
`exitSlideDown`/`enterSlideUp`. First attempt used `--color-surface-page` (#121212, matching what
Select Tuning renders at rest) - re-screenshotted and found the card still nearly imperceptible
against the also-near-black dimmed backdrop (only the scrim's ~7-unit darkening separated them).
Switched to `--color-surface-elevated` (#2c2c2c) instead, which reads as a genuinely distinct raised
surface - confirmed via a third screenshot. Both values are token reuse, not new colors invented for
this.

Verified via the project's established static-build + `--disable-web-security` Playwright +
`file://` technique at 390x844: Settings' DOM node identity survives a Tuner->Settings->Tuner->
Settings round trip (not remounted); the SegmentedControl pill's `transform` changes on tab switch;
the accordion's `grid-template-rows` goes from `0px` to a real pixel height on expand and back on
collapse; `CheckIndicator`'s `checkVisible` class appears after selecting a tuning row; the entrance
animation's mid-flight computed style showed the correct `translateY` offset, `border-radius: 24px
24px 0 0`, and increasing scrim opacity; the exit (Save) animation correctly reveals Simple Tuner
underneath (including its own Bottom Navigation) while the sheet visibly slides down and out; 8
distinct haptic calls fired (visible as the emulated Telegram bridge's own console warnings) across
the interaction sequence exercised. 456 tests / 62 files (up from 456/62 unchanged - see note below),
`tsc -b`, `vite build`, `npm run lint` all clean.

Test changes: `AppShell.test.tsx` needed a `matchMedia` stub added to its `beforeEach` (RouteTransition
checks `prefers-reduced-motion` on every navigation; jsdom has no implementation at all - AppShell's
test never needed this before since it rendered `AppRouter` directly). `SelectTuningScreen.test.tsx`'s
three collapsed/expanded assertions were rewritten from `queryByText(...).toBeNull()` (DOM absence) to
checking the `.expandWrapper`/`.expandWrapperOpen` class, since rows are always mounted now.
`CheckIndicator.test.tsx` was rewritten from "which single path exists" to "which path's visibility
class is active", for the same always-mounted-now reason.

Not yet done, out of scope for this pass: the brief color handoff at the exact moment the entrance
animation completes (sheet fill goes from `--color-surface-elevated` back to the page's normal
`--color-surface-page` in the same frame `RouteTransition` swaps which JSX branch renders) wasn't
specifically tested on a real device for perceptibility - flagged, not fixed blind, since fixing it
either way (matching Select Tuning's permanent resting background to the elevated tone, or something
else) is a real visual-identity decision with no Figma source, not a bug with an obvious correct fix.

### Real-device fixes after the above: footer background removed entirely, card-modal brightening reverted, three Select Tuning polish items

Four fixes reported after testing the previous pass on a real device/Telegram client.

**Footer "has a background again"**: investigated via `git log` before touching anything -
`FooterNavigation.module.css`/`theme/tokens.css`'s `--gradient-footer` were untouched by any commit
in this whole multi-task pass (last real change was `3678be8`, well before this session), and
`.footer`'s height is fixed content-based (106px), not viewport-height-dependent - ruled out a
regression from the Settings-keep-alive/RouteTransition work. Confirmed via a real screenshot that
what's showing is exactly the intentional, previously-shipped `7280ff3` fix ("Make footer's
background gradient actually visible" - the stop was deliberately moved to 20% specifically because
Figma's own 78.3% read as no visible transition at all on-device). Reported this back with the
screenshot rather than guessing at a new gradient value that might just re-break the older fix -
user confirmed it's the same thing and asked for a different resolution: remove `.footer`'s
background entirely (not just retune it), keeping `.pill`'s own glass/blur/border treatment as the
component's only visual weight. `--gradient-footer` removed from `theme/tokens.css` (its own now
20-line sourcing comment removed with it) since nothing applies it as a `background` anywhere anymore
- confirmed via grep before deleting.

**Select Tuning card-modal "brightening" removed**: `RouteTransition.module.css`'s `.sheetSurface`
(added in the previous pass specifically to make the rounded corner visible - see that entry) went
from `--color-surface-elevated` (#2c2c2c) back to `--color-surface-page` (#121212, matching what the
screen renders at rest) - real-device testing showed the elevated tone read as an unwanted, distinctly
lighter surface. The corner is subtler now (closer to the earlier "almost imperceptible" finding this
project already logged once) - an explicit, acknowledged trade-off, not an oversight.

**SegmentedControl (Guitar/Bass switcher) background**: `.track` changed from
`--color-surface-elevated` to `--color-surface-card` (#1e1e1e) - matches the Standard/Power/Open/
Extras card panels on the same screen instead of reading as a visibly different, lighter surface.

**Select Tuning's Save bar blur removed**: `.saveBar` (the gradient band behind the Save button) had
`backdrop-filter: blur(2px)` removed - gradient fill only now, per explicit request. Confirmed the
Save-triggered exit already used the same downward slide (`exitSlideDown`) as any other close, since
Save is the only way to leave this screen and simply calls `navigateTo()`, which is what
`RouteTransition` already keys its exit animation off - no code change was needed for that part of
the request, verified via computed style during the animation instead of assumed.

Verified via the same static-build + Playwright + `file://` technique: `.footer`'s computed
`background` is `rgba(0, 0, 0, 0)` (fully transparent, confirmed by screenshot - only the pill's own
glass fill/blur/border remains visible); `.track`'s computed `background-color` is `rgb(30, 30, 30)`
(`--color-surface-card`); `.saveBar`'s computed `backdrop-filter` is `none`; the exiting Select Tuning
layer's `background-color` is `rgb(18, 18, 18)` (`--color-surface-page`) with a growing `translateY`
mid-animation. `tsc -b`, full test suite (456/62, unchanged), `npm run lint`, `vite build` all clean.

**Follow-up, same real-device session - the footer fix above didn't actually fix anything.** User's
own screenshot comparison showed no visible change and correctly guessed the real mechanism: "screen
adjusts to the footer container's height and just gets clipped there, not about the fill at all."
Confirmed via direct `getBoundingClientRect()` inspection, not assumption: `RouteTransition.module.css`'s
`.stage` had `overflow: hidden` (carried over verbatim from the original, pre-revert implementation),
and `.stage`'s own box ends exactly where the footer begins (738px of an 844px-tall test viewport) -
but Simple/Advanced Tuner's guitar illustration is 474px tall starting at 390px, so its bottom edge
(864px) extends 126px *past* `.stage`'s own boundary by design (see the earlier "illustration
clipping" entry below in this log - the illustration is meant to bleed into the translucent footer
band). `.stage`'s `overflow: hidden` was silently clipping that entire 126px tail on every screen,
every time, not just during a Select Tuning transition - so the footer had nothing to show through
behind it and read as a flat filled bar regardless of `.footer`'s own (by-then-transparent)
background. This is the *exact same bug* this project already hit and fixed once before at the
`.main` level; `.stage` reintroduced it one layer up when `RouteTransition` was restored.

Fix: removed `overflow: hidden` from `.stage` entirely - `.viewportScreen`'s own `overflow: hidden`
(one level further up, in `ViewportScreen.module.css`) is already the real, sufficient boundary
against page-level scroll, exactly as the earlier entry concluded for `.main`. `.stage` no longer
needs to duplicate it; the Select Tuning slide's own `.exitSlideDown`/`.enterSlideUp` still carry
their own `overflow: hidden` independently (needed there for the rounded-corner clip, not for this).

Verified: illustration's bottom edge is now `864px` (unclipped, matches its full intended extent) and
a real screenshot shows the guitar neck/strings visibly bleeding through the footer's translucent
band again, instead of flat black. `document.documentElement.scrollHeight === clientHeight` (no page
scroll) both at rest and mid-Select-Tuning-transition - confirming `.viewportScreen`'s own clip is
genuinely sufficient on its own, this was never load-bearing for that. `tsc -b`, full test suite
(456/62, unchanged), `npm run lint`, `vite build` all clean.

**Footer gradient restored to Figma's real value, now that the actual clipping bug is fixed.**
Re-fetched `get_design_context` on the live BottomNavigation component (`66:3223`, via a fileKey the
user provided directly - no fileKey had been available to any earlier session's Figma calls) rather
than trusting memory of the old, already-abandoned-once value. Confirmed: Figma's own codegen is
`linear-gradient(180deg, rgba(18,18,18,0) 0%, #121212 78.302%)` across the node's full 106px height -
exactly the value an earlier pass (see `theme/tokens.css`'s old comment, now replaced) had moved away
from at 20% specifically because 78.302% "measured as invisible on a real device." That earlier
finding was confounded by the `.stage` clipping bug fixed just above - with nothing visible bleeding
through behind the footer at the time, no gradient stop could have looked like anything but flat
black. Restored `--gradient-footer` to the real 78.302% value and reapplied it to `.footer`'s
`background` (both had been fully removed in the immediately preceding commit). Verified via
screenshot on both Simple Tuner (illustration fades correctly under the pill, reaching solid before
the footer's own bottom edge - matching the user's own description of the intended look) and Settings
(no illustration to bleed through there by design, footer renders cleanly with no page scroll -
`scrollHeight === clientHeight`, confirming this screen never had a variant of the clipping bug, only
the same shared-component gradient symptom). `tsc -b`, full test suite (456/62, unchanged),
`npm run lint`, `vite build` all clean.