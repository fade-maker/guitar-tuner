import { DEFAULT_PREFERENCES } from './defaults';
import type { AppPreferences } from './types';

export const PREFERENCES_STORAGE_KEY = 'guitar-tuner:preferences';

// Bump when AppPreferences changes shape in a way a plain object-spread merge can't repair on its
// own (a rename, a value-format change, a field split into two). Purely additive fields don't need
// a migration or a version bump at all - loadPreferences() merges stored data over
// DEFAULT_PREFERENCES, so a new field automatically backfills for every existing user.
export const PREFERENCES_SCHEMA_VERSION = 1;

interface StoredPreferencesEnvelope {
  readonly version: number;
  readonly preferences: Partial<AppPreferences>;
}

// Each entry migrates the envelope from schema version (index + 1) to (index + 2). Empty today -
// version 1 is the first schema. Append the next entry here when a future breaking change needs
// one; do not renumber existing entries once shipped, since they index into stored user data.
type Migration = (envelope: StoredPreferencesEnvelope) => StoredPreferencesEnvelope;
const MIGRATIONS: readonly Migration[] = [];

function isStoredEnvelope(value: unknown): value is StoredPreferencesEnvelope {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.version === 'number' &&
    typeof candidate.preferences === 'object' &&
    candidate.preferences !== null
  );
}

function runMigrations(envelope: StoredPreferencesEnvelope): StoredPreferencesEnvelope {
  let current = envelope;
  while (current.version < PREFERENCES_SCHEMA_VERSION) {
    const migrate = MIGRATIONS[current.version - 1];
    // No recorded migration for this version jump: stop here rather than loop forever. The
    // merge-with-defaults below still fills in every field the (unmigrated) stored shape lacks.
    if (!migrate) break;
    current = migrate(current);
  }
  return current;
}

type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'setItem'>;

export function loadPreferences(storage: ReadableStorage = window.localStorage): AppPreferences {
  const raw = storage.getItem(PREFERENCES_STORAGE_KEY);
  if (raw === null) return DEFAULT_PREFERENCES;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_PREFERENCES;
  }

  if (!isStoredEnvelope(parsed)) return DEFAULT_PREFERENCES;
  // A version newer than this build understands (e.g. the user rolled back the app) can't be
  // migrated backwards safely - fall back to defaults rather than guess at its shape.
  if (parsed.version > PREFERENCES_SCHEMA_VERSION) return DEFAULT_PREFERENCES;

  const migrated = runMigrations(parsed);
  return { ...DEFAULT_PREFERENCES, ...migrated.preferences };
}

export function savePreferences(preferences: AppPreferences, storage: WritableStorage = window.localStorage): void {
  const envelope: StoredPreferencesEnvelope = { version: PREFERENCES_SCHEMA_VERSION, preferences };
  storage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(envelope));
}
