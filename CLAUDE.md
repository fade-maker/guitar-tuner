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

Next: Presentation API extension (`setA4`/`pinTarget`/`tunedTargetIds` on `TunerPresenter`),
project structure scaffolding, theme layer, routing stubs, motion architecture.