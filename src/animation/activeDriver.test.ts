import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSharedValue } from './sharedValue';
import { claimDriver, releaseDriver } from './activeDriver';
import type { AnimationHandle } from './types';

function fakeHandle(): AnimationHandle {
  return { stop: vi.fn() };
}

// vitest runs with import.meta.env.DEV === true by default (same as a real `npm run dev`), so the
// dev-mode branch below is what's actually exercised by these tests - matching real development
// usage. The production (silent auto-recover) branch is NOT unit-tested here: DEV/PROD are
// build-time-replaced boolean constants in Vite, and vi.stubEnv() only supports string values - it
// cannot flip a real boolean constant's truthiness (stubbing DEV to the string 'false' would still
// be truthy). This is a genuine Vitest/Vite limitation, not an oversight; the production behavior
// (existing.handle.stop() then claim) is a straight-line, unconditional call with no branching logic
// of its own to hide a bug in.
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'trace').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('claimDriver / releaseDriver', () => {
  it('a first claim on a value with no existing driver succeeds', () => {
    const value = createSharedValue(0);
    const handle = fakeHandle();
    expect(claimDriver(value, handle)).toBe(true);
  });

  it('a retarget (release, then claim again) succeeds cleanly with no warning', () => {
    const value = createSharedValue(0);
    const first = fakeHandle();
    claimDriver(value, first);
    releaseDriver(value, first);

    const second = fakeHandle();
    expect(claimDriver(value, second)).toBe(true);
    expect(console.error).not.toHaveBeenCalled();
  });

  it('rejects a second claim while the first is still active (dev mode)', () => {
    const value = createSharedValue(0);
    const first = fakeHandle();
    claimDriver(value, first);

    const second = fakeHandle();
    expect(claimDriver(value, second)).toBe(false);
  });

  it('does not stop the existing driver when rejecting a conflicting claim (dev mode)', () => {
    const value = createSharedValue(0);
    const first = fakeHandle();
    claimDriver(value, first);

    const second = fakeHandle();
    claimDriver(value, second);

    expect(first.stop).not.toHaveBeenCalled();
    expect(second.stop).not.toHaveBeenCalled();
  });

  it('logs a loud, visible warning identifying the conflict on a rejected claim', () => {
    const value = createSharedValue(0);
    claimDriver(value, fakeHandle());
    claimDriver(value, fakeHandle());

    expect(console.error).toHaveBeenCalled();
    expect(console.trace).toHaveBeenCalled();
  });

  it('release() only clears the registry if the released handle is still the active one', () => {
    const value = createSharedValue(0);
    const first = fakeHandle();
    claimDriver(value, first);

    // A stale release from an old, no-longer-active handle must not clobber a newer legitimate claim.
    releaseDriver(value, first);
    const second = fakeHandle();
    claimDriver(value, second);

    releaseDriver(value, first); // stale - first is no longer the registered driver
    const third = fakeHandle();
    // If the stale release had incorrectly cleared the slot, this would succeed without a warning.
    expect(claimDriver(value, third)).toBe(false);
  });

  it('tracks each SharedValue independently', () => {
    const valueA = createSharedValue(0);
    const valueB = createSharedValue(0);

    expect(claimDriver(valueA, fakeHandle())).toBe(true);
    expect(claimDriver(valueB, fakeHandle())).toBe(true);
    expect(console.error).not.toHaveBeenCalled();
  });
});
