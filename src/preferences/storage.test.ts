import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES } from './defaults';
import { PREFERENCES_SCHEMA_VERSION, PREFERENCES_STORAGE_KEY, loadPreferences, savePreferences } from './storage';
import type { AppPreferences } from './types';

class FakeStorage {
  private readonly store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe('loadPreferences', () => {
  it('returns defaults when nothing is stored', () => {
    expect(loadPreferences(new FakeStorage())).toEqual(DEFAULT_PREFERENCES);
  });

  it('returns defaults when the stored value is not valid JSON', () => {
    const storage = new FakeStorage();
    storage.setItem(PREFERENCES_STORAGE_KEY, 'not json');

    expect(loadPreferences(storage)).toEqual(DEFAULT_PREFERENCES);
  });

  it('returns defaults when the stored value has no recognizable envelope shape', () => {
    const storage = new FakeStorage();
    storage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify({ tunerMode: 'advanced' }));

    expect(loadPreferences(storage)).toEqual(DEFAULT_PREFERENCES);
  });

  it('returns defaults when the stored schema version is newer than this build understands', () => {
    const storage = new FakeStorage();
    storage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({ version: PREFERENCES_SCHEMA_VERSION + 1, preferences: { tunerMode: 'advanced' } }),
    );

    expect(loadPreferences(storage)).toEqual(DEFAULT_PREFERENCES);
  });

  it('round-trips a full preferences object saved at the current version', () => {
    const storage = new FakeStorage();
    const custom: AppPreferences = { ...DEFAULT_PREFERENCES, tunerMode: 'advanced', a4Frequency: 442 };

    savePreferences(custom, storage);

    expect(loadPreferences(storage)).toEqual(custom);
  });

  it('backfills fields missing from an older, smaller stored object with current defaults', () => {
    const storage = new FakeStorage();
    storage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({ version: PREFERENCES_SCHEMA_VERSION, preferences: { tunerMode: 'advanced' } }),
    );

    expect(loadPreferences(storage)).toEqual({ ...DEFAULT_PREFERENCES, tunerMode: 'advanced' });
  });
});

describe('savePreferences', () => {
  it('writes an envelope carrying the current schema version', () => {
    const storage = new FakeStorage();

    savePreferences(DEFAULT_PREFERENCES, storage);

    const raw = storage.getItem(PREFERENCES_STORAGE_KEY);
    expect(JSON.parse(raw!)).toEqual({ version: PREFERENCES_SCHEMA_VERSION, preferences: DEFAULT_PREFERENCES });
  });
});

// Real storage can throw at every touchpoint: property access on window.localStorage itself
// (SecurityError in a cookies-blocked iframe - exactly how Telegram Web embeds Mini Apps), getItem
// (revoked mid-session), and setItem (QuotaExceededError). None of these may crash the app - load
// falls back to defaults, save silently loses persistence.
describe('storage failure resilience', () => {
  const throwingStorage = {
    getItem(): string | null {
      throw new DOMException('Access denied', 'SecurityError');
    },
    setItem(): void {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    },
  };

  it('loadPreferences returns defaults when getItem throws', () => {
    expect(loadPreferences(throwingStorage)).toEqual(DEFAULT_PREFERENCES);
  });

  it('savePreferences swallows a throwing setItem instead of propagating', () => {
    expect(() => savePreferences(DEFAULT_PREFERENCES, throwingStorage)).not.toThrow();
  });
});
