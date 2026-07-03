import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MicrophoneError, MicrophoneErrorReason, MicrophoneStream, MicrophoneStreamState } from './microphone';
import type { AudioEngineError, EngineStatus } from './types';

// Only requestMicrophoneStream (the real getUserMedia boundary) is faked here; everything else in
// AudioEngine is exercised for real. These tests target the generation-token race-condition fix, not
// general AudioEngine behavior, so they only cover the ordinary happy path plus each place a stop()/mic
// failure can land while start() is still in flight.
const { requestMicrophoneStream } = vi.hoisted(() => ({ requestMicrophoneStream: vi.fn() }));
vi.mock('./microphone', () => ({ requestMicrophoneStream }));

import { createAudioEngine } from './AudioEngine';

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createFakeMicrophoneStream() {
  const listeners = new Set<(state: MicrophoneStreamState) => void>();
  return {
    stream: {} as MediaStream,
    state: 'active' as MicrophoneStreamState,
    onStateChange: vi.fn((listener: (state: MicrophoneStreamState) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }),
    getDiagnostics: () => ({
      sampleRate: 44100,
      channelCount: 1,
      deviceId: null,
      deviceLabel: null,
      appliedConstraints: {},
    }),
    close: vi.fn(),
    emitState(state: MicrophoneStreamState) {
      for (const listener of listeners) listener(state);
    },
  } satisfies MicrophoneStream & { emitState(state: MicrophoneStreamState): void };
}

let addModuleImpl: () => Promise<void> = () => Promise.resolve();
let contextInstances: FakeAudioContext[] = [];

class FakeAudioContext {
  sampleRate = 44100;
  audioWorklet = { addModule: vi.fn(() => addModuleImpl()) };
  createMediaStreamSource = vi.fn(() => ({ connect: vi.fn() }));
  close = vi.fn(() => Promise.resolve());

  constructor() {
    contextInstances.push(this);
  }
}

class FakeAudioWorkletNode {
  port: { onmessage: unknown } = { onmessage: null };
  disconnect = vi.fn();
  constructor() {}
}

async function flushMicrotasks(times = 3): Promise<void> {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

beforeEach(() => {
  requestMicrophoneStream.mockReset();
  addModuleImpl = () => Promise.resolve();
  contextInstances = [];
  vi.stubGlobal('AudioContext', FakeAudioContext);
  vi.stubGlobal('AudioWorkletNode', FakeAudioWorkletNode);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createAudioEngine - start()/stop() race safety', () => {
  it('runs the ordinary start/stop flow without interference from the generation guard', async () => {
    const fakeStream = createFakeMicrophoneStream();
    requestMicrophoneStream.mockResolvedValue(fakeStream);
    const statuses: EngineStatus[] = [];

    const engine = createAudioEngine();
    engine.onStatusChange((status) => statuses.push(status));

    await engine.start();
    expect(engine.status).toBe('listening');

    engine.stop();
    expect(engine.status).toBe('idle');
    expect(fakeStream.close).toHaveBeenCalledTimes(1);
    expect(contextInstances[0]?.close).toHaveBeenCalledTimes(1);
    expect(statuses).toEqual(['requesting-permission', 'listening', 'idle']);
  });

  it('does not resurrect "listening" when stop() lands while awaiting microphone permission', async () => {
    const permission = deferred<MicrophoneStream>();
    requestMicrophoneStream.mockReturnValue(permission.promise);

    const engine = createAudioEngine();
    const startPromise = engine.start();
    expect(engine.status).toBe('requesting-permission');

    engine.stop();
    expect(engine.status).toBe('idle');

    const fakeStream = createFakeMicrophoneStream();
    permission.resolve(fakeStream);
    await startPromise;

    // The stream that arrived after stop() must be discarded, not adopted.
    expect(engine.status).toBe('idle');
    expect(fakeStream.close).toHaveBeenCalledTimes(1);
    expect(contextInstances).toHaveLength(0);
  });

  it('does not resurrect "listening" when stop() lands while the worklet module is loading', async () => {
    const fakeStream = createFakeMicrophoneStream();
    requestMicrophoneStream.mockResolvedValue(fakeStream);
    const addModule = deferred<void>();
    addModuleImpl = () => addModule.promise;

    const engine = createAudioEngine();
    const startPromise = engine.start();
    await flushMicrotasks();
    expect(contextInstances).toHaveLength(1);
    expect(engine.status).toBe('requesting-permission');

    engine.stop();
    expect(engine.status).toBe('idle');
    expect(contextInstances[0]?.close).toHaveBeenCalled();

    addModule.resolve();
    await startPromise;

    expect(engine.status).toBe('idle');
  });

  it('does not resurrect "listening" and does not double-report when the mic ends mid-startup', async () => {
    const fakeStream = createFakeMicrophoneStream();
    requestMicrophoneStream.mockResolvedValue(fakeStream);
    const addModule = deferred<void>();
    addModuleImpl = () => addModule.promise;
    const errors: AudioEngineError[] = [];

    const engine = createAudioEngine();
    engine.onError((error) => errors.push(error));
    const startPromise = engine.start();
    await flushMicrotasks();
    expect(engine.status).toBe('requesting-permission');

    fakeStream.emitState('ended');
    expect(engine.status).toBe('error');
    expect(errors).toEqual([{ reason: 'no-input-device', message: 'Microphone connection was lost.' }]);

    // The in-flight worklet load now rejects, as it would if the context tore down mid-load.
    addModule.reject(new Error('aborted'));
    await startPromise;

    expect(engine.status).toBe('error');
    expect(errors).toHaveLength(1);
  });
});

describe('createAudioEngine - microphone error mapping', () => {
  // AudioEngine's own error vocabulary is coarser than MicrophoneError's; this exercises every branch
  // of that narrowing through the public start()/onError() surface, since the mapping function itself
  // is a private implementation detail.
  it.each([
    ['permission-denied', 'permission-denied'],
    ['blocked-by-policy', 'permission-denied'],
    ['no-device', 'no-input-device'],
    ['device-unavailable', 'no-input-device'],
    ['constraints-not-satisfiable', 'no-input-device'],
    ['context-unsupported', 'context-unsupported'],
    ['aborted', 'unknown'],
    ['unknown', 'unknown'],
  ] as const satisfies ReadonlyArray<readonly [MicrophoneErrorReason, AudioEngineError['reason']]>)(
    'maps MicrophoneError reason "%s" to AudioEngineError reason "%s"',
    async (microphoneReason, expectedReason) => {
      const microphoneError: MicrophoneError = { reason: microphoneReason, message: 'mic said no' };
      requestMicrophoneStream.mockRejectedValue(microphoneError);
      const errors: AudioEngineError[] = [];

      const engine = createAudioEngine();
      engine.onError((error) => errors.push(error));
      await engine.start();

      expect(engine.status).toBe('error');
      expect(errors).toEqual([{ reason: expectedReason, message: 'mic said no' }]);
    },
  );
});
