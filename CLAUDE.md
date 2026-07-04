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

Next: motion architecture.