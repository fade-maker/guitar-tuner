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

// In-memory stand-in used whenever real localStorage is unavailable or throwing. Not persistence -
// preferences survive only the current session - but the app keeps working instead of crashing.
// Module-level singleton so loadPreferences/savePreferences within one session agree on contents.
function createInMemoryStorage(): ReadableStorage & WritableStorage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

let inMemoryFallback: (ReadableStorage & WritableStorage) | undefined;

// Even *accessing* window.localStorage can throw (SecurityError): Telegram Web embeds Mini Apps in
// an iframe, and with third-party cookies/site data blocked the property access itself fails - and
// loadPreferences runs inside the very first render (PreferencesProvider's useState initializer),
// so an unguarded throw here was a guaranteed white screen for those users, not a degraded mode.
// setItem can additionally throw QuotaExceededError (private modes, full storage) - handled at the
// call sites below, since a storage that exists can still refuse individual writes.
function defaultStorage(): ReadableStorage & WritableStorage {
  try {
    return window.localStorage;
  } catch {
    inMemoryFallback ??= createInMemoryStorage();
    return inMemoryFallback;
  }
}

export function loadPreferences(storage: ReadableStorage = defaultStorage()): AppPreferences {
  let raw: string | null;
  try {
    raw = storage.getItem(PREFERENCES_STORAGE_KEY);
  } catch {
    return DEFAULT_PREFERENCES;
  }
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

export function savePreferences(preferences: AppPreferences, storage: WritableStorage = defaultStorage()): void {
  const envelope: StoredPreferencesEnvelope = { version: PREFERENCES_SCHEMA_VERSION, preferences };
  try {
    storage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // Quota exceeded / storage revoked mid-session: losing persistence must degrade silently, not
    // crash the app - this runs inside a React effect on every preference change, and an uncaught
    // throw there would tear down the whole tree.
  }
}
