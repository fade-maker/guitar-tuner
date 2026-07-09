import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createScheduler } from './scheduler';

// A small, queue-based rAF stub - unlike a blind "never fires" stub, this one actually stores and
// lets the test manually invoke callbacks with a controlled timestamp, so delta/lifecycle behavior
// can be asserted precisely.
let frameCallbacks: Array<{ id: number; cb: FrameRequestCallback }> = [];
let nextId = 1;
let now = 0;

function fireFrame(deltaMs: number): void {
  now += deltaMs;
  const pending = frameCallbacks;
  frameCallbacks = [];
  for (const entry of pending) entry.cb(now);
}

beforeEach(() => {
  frameCallbacks = [];
  nextId = 1;
  now = 0;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    const id = nextId++;
    frameCallbacks.push({ id, cb });
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    frameCallbacks = frameCallbacks.filter((entry) => entry.id !== id);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createScheduler', () => {
  it('does not request a frame before any subscriber exists', () => {
    createScheduler();
    expect(frameCallbacks.length).toBe(0);
  });

  it('requests a frame when the first subscriber subscribes', () => {
    const scheduler = createScheduler();
    scheduler.subscribe(() => {});
    expect(frameCallbacks.length).toBe(1);
  });

  it('reports 0 delta on the very first tick after subscribing', () => {
    const scheduler = createScheduler();
    const deltas: number[] = [];
    scheduler.subscribe((dt) => deltas.push(dt));

    fireFrame(16);
    expect(deltas).toEqual([0]);
  });

  it('reports the real elapsed delta on subsequent ticks', () => {
    const scheduler = createScheduler();
    const deltas: number[] = [];
    scheduler.subscribe((dt) => deltas.push(dt));

    fireFrame(16);
    fireFrame(20);
    expect(deltas).toEqual([0, 20]);
  });

  it('calls every subscriber on the same frame', () => {
    const scheduler = createScheduler();
    const calls: string[] = [];
    scheduler.subscribe(() => calls.push('a'));
    scheduler.subscribe(() => calls.push('b'));

    fireFrame(16);
    expect(calls).toEqual(['a', 'b']);
  });

  it('keeps requesting frames while at least one subscriber remains', () => {
    const scheduler = createScheduler();
    scheduler.subscribe(() => {});

    fireFrame(16);
    expect(frameCallbacks.length).toBe(1); // re-armed for the next frame
  });

  it('stops requesting frames as soon as the last subscriber unsubscribes', () => {
    const scheduler = createScheduler();
    const unsubscribe = scheduler.subscribe(() => {});
    expect(frameCallbacks.length).toBe(1);

    unsubscribe();
    expect(frameCallbacks.length).toBe(0);
  });

  it('resets the delta clock after dropping to zero subscribers and gaining a new one', () => {
    const scheduler = createScheduler();
    const firstUnsubscribe = scheduler.subscribe(() => {});
    fireFrame(16);
    firstUnsubscribe();

    const deltas: number[] = [];
    scheduler.subscribe((dt) => deltas.push(dt));
    fireFrame(50);
    expect(deltas).toEqual([0]);
  });

  it('does not call a listener subscribed mid-frame until the next frame', () => {
    const scheduler = createScheduler();
    const calls: string[] = [];
    scheduler.subscribe(() => {
      calls.push('first');
      scheduler.subscribe(() => calls.push('late'));
    });

    fireFrame(16);
    expect(calls).toEqual(['first']);

    fireFrame(16);
    expect(calls).toEqual(['first', 'first', 'late']);
  });

  it('lets a listener safely unsubscribe itself mid-frame without affecting others', () => {
    const scheduler = createScheduler();
    const calls: string[] = [];
    const unsubscribeSelf = scheduler.subscribe(() => {
      calls.push('self');
      unsubscribeSelf();
    });
    scheduler.subscribe(() => calls.push('other'));

    fireFrame(16);
    expect(calls).toEqual(['self', 'other']);

    fireFrame(16);
    expect(calls).toEqual(['self', 'other', 'other']);
  });

  it('keeps independent instances fully isolated from each other', () => {
    const schedulerA = createScheduler();
    const schedulerB = createScheduler();
    const callsA: number[] = [];
    const callsB: number[] = [];

    schedulerA.subscribe((dt) => callsA.push(dt));
    schedulerB.subscribe((dt) => callsB.push(dt));

    // Both schedulers requested a frame independently - firing only the first one queued (A's)
    // must not call B's listener.
    expect(frameCallbacks.length).toBe(2);
    const firstQueued = frameCallbacks[0];
    now += 16;
    firstQueued.cb(now);

    expect(callsA.length).toBe(1);
    expect(callsB.length).toBe(0);
  });
});
