// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MicrophoneError, MicrophoneStreamState } from './microphone';
import { requestMicrophoneStream } from './microphone';

class FakeMediaStreamTrack extends EventTarget {
  stopped = false;
  private readonly settings: Partial<MediaTrackSettings>;
  private readonly constraints: Partial<MediaTrackConstraints>;
  readonly label: string;

  constructor(options?: {
    settings?: Partial<MediaTrackSettings>;
    constraints?: Partial<MediaTrackConstraints>;
    label?: string;
  }) {
    super();
    this.settings = options?.settings ?? {};
    this.constraints = options?.constraints ?? {};
    this.label = options?.label ?? 'Fake Microphone';
  }

  getSettings(): Partial<MediaTrackSettings> {
    return this.settings;
  }

  getConstraints(): Partial<MediaTrackConstraints> {
    return this.constraints;
  }

  stop(): void {
    this.stopped = true;
  }
}

class FakeMediaStream {
  private readonly track: FakeMediaStreamTrack;

  constructor(track: FakeMediaStreamTrack) {
    this.track = track;
  }

  getAudioTracks(): MediaStreamTrack[] {
    return [this.track as unknown as MediaStreamTrack];
  }

  getTracks(): MediaStreamTrack[] {
    return [this.track as unknown as MediaStreamTrack];
  }
}

function stubGetUserMedia(impl: (constraints: MediaStreamConstraints) => Promise<MediaStream>): void {
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: vi.fn(impl) },
    configurable: true,
  });
}

function stubUnsupported(): void {
  Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
}

function stubFeaturePolicy(allowsMicrophone: boolean): void {
  Object.defineProperty(document, 'featurePolicy', {
    value: { allowsFeature: (feature: string) => (feature === 'microphone' ? allowsMicrophone : true) },
    configurable: true,
  });
}

afterEach(() => {
  Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
  Object.defineProperty(document, 'featurePolicy', { value: undefined, configurable: true });
});

describe('requestMicrophoneStream', () => {
  it('throws context-unsupported when getUserMedia is not available', async () => {
    stubUnsupported();

    await expect(requestMicrophoneStream()).rejects.toMatchObject({
      reason: 'context-unsupported',
    } satisfies Partial<MicrophoneError>);
  });

  it('throws blocked-by-policy when the Permissions-Policy denies microphone access', async () => {
    stubGetUserMedia(async () => new FakeMediaStream(new FakeMediaStreamTrack()) as unknown as MediaStream);
    stubFeaturePolicy(false);

    await expect(requestMicrophoneStream()).rejects.toMatchObject({
      reason: 'blocked-by-policy',
    } satisfies Partial<MicrophoneError>);
  });

  it('proceeds normally when featurePolicy is unavailable (most browsers)', async () => {
    stubGetUserMedia(async () => new FakeMediaStream(new FakeMediaStreamTrack()) as unknown as MediaStream);
    // No stubFeaturePolicy() call: document.featurePolicy stays undefined, as on most browsers.

    await expect(requestMicrophoneStream()).resolves.toBeDefined();
  });

  it('throws aborted when the signal is already aborted before requesting', async () => {
    const getUserMedia = vi.fn();
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true });
    const controller = new AbortController();
    controller.abort();

    await expect(requestMicrophoneStream({ signal: controller.signal })).rejects.toMatchObject({
      reason: 'aborted',
    } satisfies Partial<MicrophoneError>);
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it('requests audio-only, echo/noise/AGC-disabled constraints with no deviceId by default', async () => {
    let seenConstraints: MediaStreamConstraints | undefined;
    stubGetUserMedia(async (constraints) => {
      seenConstraints = constraints;
      return new FakeMediaStream(new FakeMediaStreamTrack()) as unknown as MediaStream;
    });

    await requestMicrophoneStream();

    expect(seenConstraints).toEqual({
      audio: {
        echoCancellation: { ideal: false },
        noiseSuppression: { ideal: false },
        autoGainControl: { ideal: false },
      },
      video: false,
    });
  });

  it('requests an exact deviceId when one is given', async () => {
    let seenConstraints: MediaStreamConstraints | undefined;
    stubGetUserMedia(async (constraints) => {
      seenConstraints = constraints;
      return new FakeMediaStream(new FakeMediaStreamTrack()) as unknown as MediaStream;
    });

    await requestMicrophoneStream({ deviceId: 'device-42' });

    expect((seenConstraints?.audio as MediaTrackConstraints).deviceId).toEqual({ exact: 'device-42' });
  });

  it.each([
    ['NotAllowedError', 'permission-denied'],
    ['SecurityError', 'permission-denied'],
    ['NotFoundError', 'no-device'],
    ['OverconstrainedError', 'constraints-not-satisfiable'],
    ['NotReadableError', 'device-unavailable'],
    ['AbortError', 'unknown'],
  ] as const)('maps DOMException %s to reason %s', async (domName, expectedReason) => {
    stubGetUserMedia(async () => {
      throw new DOMException('native failure', domName);
    });

    await expect(requestMicrophoneStream()).rejects.toMatchObject({
      reason: expectedReason,
      message: 'native failure',
    } satisfies Partial<MicrophoneError>);
  });

  it('maps a non-DOMException rejection to reason "unknown" with a generic message', async () => {
    stubGetUserMedia(async () => {
      throw new Error('something unrelated broke');
    });

    await expect(requestMicrophoneStream()).rejects.toMatchObject({
      reason: 'unknown',
      message: 'Failed to access the microphone.',
    } satisfies Partial<MicrophoneError>);
  });

  it('stops the tracks and throws aborted if the signal fires while getUserMedia is pending', async () => {
    const track = new FakeMediaStreamTrack();
    const controller = new AbortController();
    stubGetUserMedia(async () => {
      controller.abort();
      return new FakeMediaStream(track) as unknown as MediaStream;
    });

    await expect(requestMicrophoneStream({ signal: controller.signal })).rejects.toMatchObject({
      reason: 'aborted',
    } satisfies Partial<MicrophoneError>);
    expect(track.stopped).toBe(true);
  });

  it('resolves with diagnostics reflecting the acquired track', async () => {
    const track = new FakeMediaStreamTrack({
      settings: { sampleRate: 48000, channelCount: 1, deviceId: 'device-7' },
      constraints: { echoCancellation: { ideal: false } },
      label: 'Built-in Microphone',
    });
    stubGetUserMedia(async () => new FakeMediaStream(track) as unknown as MediaStream);

    const result = await requestMicrophoneStream();

    expect(result.state).toBe('active');
    expect(result.getDiagnostics()).toEqual({
      sampleRate: 48000,
      channelCount: 1,
      deviceId: 'device-7',
      deviceLabel: 'Built-in Microphone',
      appliedConstraints: { echoCancellation: { ideal: false } },
    });
  });

  it('falls back to 0/null diagnostics when the track reports no settings', async () => {
    const track = new FakeMediaStreamTrack({ label: '' });
    stubGetUserMedia(async () => new FakeMediaStream(track) as unknown as MediaStream);

    const result = await requestMicrophoneStream();

    expect(result.getDiagnostics()).toMatchObject({
      sampleRate: 0,
      channelCount: 0,
      deviceId: null,
      deviceLabel: null,
    });
  });
});

describe('MicrophoneStream (returned by requestMicrophoneStream)', () => {
  async function createStream() {
    const track = new FakeMediaStreamTrack();
    stubGetUserMedia(async () => new FakeMediaStream(track) as unknown as MediaStream);
    const microphoneStream = await requestMicrophoneStream();
    return { track, microphoneStream };
  }

  it('starts in the "active" state', async () => {
    const { microphoneStream } = await createStream();
    expect(microphoneStream.state).toBe('active');
  });

  it('notifies listeners and updates state on a native "mute" event', async () => {
    const { track, microphoneStream } = await createStream();
    const states: MicrophoneStreamState[] = [];
    microphoneStream.onStateChange((state) => states.push(state));

    track.dispatchEvent(new Event('mute'));

    expect(microphoneStream.state).toBe('muted');
    expect(states).toEqual(['muted']);
  });

  it('notifies listeners and returns to "active" on a native "unmute" event', async () => {
    const { track, microphoneStream } = await createStream();
    track.dispatchEvent(new Event('mute'));
    const states: MicrophoneStreamState[] = [];
    microphoneStream.onStateChange((state) => states.push(state));

    track.dispatchEvent(new Event('unmute'));

    expect(microphoneStream.state).toBe('active');
    expect(states).toEqual(['active']);
  });

  it('ignores "unmute" once the stream has ended', async () => {
    const { track, microphoneStream } = await createStream();
    track.dispatchEvent(new Event('ended'));
    const states: MicrophoneStreamState[] = [];
    microphoneStream.onStateChange((state) => states.push(state));

    track.dispatchEvent(new Event('unmute'));

    expect(microphoneStream.state).toBe('ended');
    expect(states).toEqual([]);
  });

  it('notifies listeners on a native "ended" event (device unplugged)', async () => {
    const { track, microphoneStream } = await createStream();
    const states: MicrophoneStreamState[] = [];
    microphoneStream.onStateChange((state) => states.push(state));

    track.dispatchEvent(new Event('ended'));

    expect(microphoneStream.state).toBe('ended');
    expect(states).toEqual(['ended']);
  });

  it('close() stops every track and sets state to "ended" without notifying listeners', async () => {
    const { track, microphoneStream } = await createStream();
    const states: MicrophoneStreamState[] = [];
    microphoneStream.onStateChange((state) => states.push(state));

    microphoneStream.close();

    expect(track.stopped).toBe(true);
    expect(microphoneStream.state).toBe('ended');
    expect(states).toEqual([]);
  });

  it('suppresses a native "ended" event that fires as a result of close()', async () => {
    const { track, microphoneStream } = await createStream();
    microphoneStream.close();
    const states: MicrophoneStreamState[] = [];
    microphoneStream.onStateChange((state) => states.push(state));

    track.dispatchEvent(new Event('ended'));

    expect(states).toEqual([]);
  });

  it('stops notifying an unsubscribed listener', async () => {
    const { track, microphoneStream } = await createStream();
    const states: MicrophoneStreamState[] = [];
    const unsubscribe = microphoneStream.onStateChange((state) => states.push(state));

    unsubscribe();
    track.dispatchEvent(new Event('mute'));

    expect(states).toEqual([]);
  });

  it('isolates a throwing listener so other listeners still get notified', async () => {
    const { track, microphoneStream } = await createStream();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const states: MicrophoneStreamState[] = [];
    microphoneStream.onStateChange(() => {
      throw new Error('listener boom');
    });
    microphoneStream.onStateChange((state) => states.push(state));

    track.dispatchEvent(new Event('mute'));

    expect(states).toEqual(['muted']);
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
