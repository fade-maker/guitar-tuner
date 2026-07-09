import type { AnimationHandle } from './types';
import type { SharedValue } from './sharedValue';

// Enforces "at most one active driver per SharedValue" as a real invariant, not caller discipline.
//
// A legitimate retarget (useSpring/useTween re-driving the same value on a target change) always
// releases before reclaiming - React runs the old effect's cleanup (which calls stop(), which calls
// releaseDriver()) before the new effect runs, so the registry is already empty by the time the new
// claim happens. If claim() ever finds an existing, un-released entry, that's structurally
// impossible for a legitimate retarget to produce - it can only mean two independent, uncoordinated
// callers are both trying to drive the same value. No identity/token tracking needed - the conflict
// is detected by timing (is the slot still held?), not by "who" is claiming it.
//
// Development: surfaced as loudly as possible (console.error with both call sites' stacks) and the
// new driver is rejected outright - it never subscribes to the scheduler, the existing driver keeps
// running untouched, system state is unchanged. A thrown exception was considered and rejected:
// this project has no Error Boundary anywhere yet, so an uncaught throw inside a useEffect would
// tear down the whole subtree - disproportionate for a "fix your code" signal.
//
// Production: silently auto-recovers instead - the previous driver is stopped and the new one takes
// over. A real user must never see a frozen/fought-over animation because of a development mistake
// that slipped through; the conflict is still a bug, but making it user-visible isn't this module's
// job in production.
interface DriverClaim {
  readonly handle: AnimationHandle;
  readonly claimedAt: string;
}

const activeDriverByValue = new WeakMap<object, DriverClaim>();

// Returns whether the caller may proceed to actually start driving `value` - false means a dev-mode
// conflict was detected and rejected; the caller must not subscribe to the scheduler in that case.
export function claimDriver<T>(value: SharedValue<T>, handle: AnimationHandle): boolean {
  const existing = activeDriverByValue.get(value);

  if (existing !== undefined) {
    if (import.meta.env.DEV) {
      console.error(
        '[animation] Two drivers are both trying to control the same SharedValue at once ' +
          `(current value: ${String(value.get())}). The new driver was rejected - call stop() on ` +
          'the previous handle before starting a new one on the same value.',
      );
      console.error('Existing driver was claimed at:\n' + existing.claimedAt);
      console.trace('Rejected new driver attempted at');
      return false;
    }
    existing.handle.stop();
  }

  activeDriverByValue.set(value, {
    handle,
    claimedAt: import.meta.env.DEV ? (new Error().stack ?? '(no stack available)') : '',
  });
  return true;
}

export function releaseDriver<T>(value: SharedValue<T>, handle: AnimationHandle): void {
  if (activeDriverByValue.get(value)?.handle === handle) {
    activeDriverByValue.delete(value);
  }
}
