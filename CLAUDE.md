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