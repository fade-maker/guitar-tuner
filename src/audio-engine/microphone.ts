export interface MicrophoneRequestOptions {
  readonly deviceId?: string;
  readonly signal?: AbortSignal;
}

export type MicrophoneStreamState = 'active' | 'muted' | 'ended';

export interface MicrophoneDiagnostics {
  readonly sampleRate: number;
  readonly channelCount: number;
  readonly deviceId: string | null;
  readonly deviceLabel: string | null;
  readonly appliedConstraints: Readonly<Record<string, unknown>>;
}

export interface MicrophoneStream {
  readonly stream: MediaStream;
  readonly state: MicrophoneStreamState;
  onStateChange(listener: (state: MicrophoneStreamState) => void): () => void;
  getDiagnostics(): MicrophoneDiagnostics;
  close(): void;
}

export type MicrophoneErrorReason =
  | 'permission-denied'
  | 'blocked-by-policy'
  | 'no-device'
  | 'device-unavailable'
  | 'constraints-not-satisfiable'
  | 'context-unsupported'
  | 'aborted'
  | 'unknown';

export interface MicrophoneError {
  readonly reason: MicrophoneErrorReason;
  readonly message: string;
  readonly cause?: unknown;
}

export type RequestMicrophoneStream = (options?: MicrophoneRequestOptions) => Promise<MicrophoneStream>;

// Bare boolean constraints are treated as required by the browser's constraint algorithm; on hardware that
// can't disable AEC, a hard `false` would throw OverconstrainedError and block the mic entirely, so these
// are expressed as soft preferences that degrade gracefully instead.
const CAPTURE_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: { ideal: false },
  noiseSuppression: { ideal: false },
  autoGainControl: { ideal: false },
};

interface DocumentWithFeaturePolicy {
  readonly featurePolicy?: {
    allowsFeature(feature: string): boolean;
  };
}

function isSupported(): boolean {
  return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
}

// Telegram can embed this app in an iframe (Web/Desktop clients); a missing `allow="microphone"`
// Permissions-Policy produces the same NotAllowedError as a user denial. Chromium's featurePolicy
// reflection lets that specific case be reported accurately; it isn't available everywhere, so this
// is a supplement to the NotAllowedError mapping below, not a replacement for it.
function isBlockedByPermissionsPolicy(): boolean {
  const featurePolicy = (document as DocumentWithFeaturePolicy).featurePolicy;
  return featurePolicy ? !featurePolicy.allowsFeature('microphone') : false;
}

function buildConstraints(options?: MicrophoneRequestOptions): MediaStreamConstraints {
  const audio: MediaTrackConstraints = { ...CAPTURE_CONSTRAINTS };
  if (options?.deviceId) {
    audio.deviceId = { exact: options.deviceId };
  }
  return { audio, video: false };
}

function unsupportedError(): MicrophoneError {
  return { reason: 'context-unsupported', message: 'This browser does not support microphone access.' };
}

function blockedByPolicyError(): MicrophoneError {
  return {
    reason: 'blocked-by-policy',
    message: 'Microphone access is blocked by this page\'s embedding permissions.',
  };
}

function abortedError(): MicrophoneError {
  return { reason: 'aborted', message: 'Microphone request was aborted.' };
}

function mapAcquisitionError(error: unknown): MicrophoneError {
  // DOMException carries name/message directly (it doesn't reliably inherit from Error across browsers), so it's checked explicitly rather than via `instanceof Error`.
  const isDomException = error instanceof DOMException;
  const name = isDomException ? error.name : undefined;
  const message = isDomException ? error.message : 'Failed to access the microphone.';

  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return { reason: 'permission-denied', message, cause: error };
    case 'NotFoundError':
      return { reason: 'no-device', message, cause: error };
    case 'OverconstrainedError':
      return { reason: 'constraints-not-satisfiable', message, cause: error };
    case 'NotReadableError':
      return { reason: 'device-unavailable', message, cause: error };
    default:
      return { reason: 'unknown', message, cause: error };
  }
}

function readDiagnostics(track: MediaStreamTrack): MicrophoneDiagnostics {
  const settings = track.getSettings();
  return {
    sampleRate: settings.sampleRate ?? 0,
    channelCount: settings.channelCount ?? 0,
    deviceId: settings.deviceId ?? null,
    deviceLabel: track.label || null,
    appliedConstraints: track.getConstraints() as Record<string, unknown>,
  };
}

function createMicrophoneStream(stream: MediaStream): MicrophoneStream {
  const track = stream.getAudioTracks()[0];
  const listeners = new Set<(state: MicrophoneStreamState) => void>();
  let state: MicrophoneStreamState = 'active';
  let closing = false; // set by close() so the native 'ended' event it triggers isn't reported as an external interruption

  // commitState is the only place `state` is written; setState additionally notifies, close() intentionally commits without notifying.
  const commitState = (next: MicrophoneStreamState): void => {
    state = next;
  };

  const setState = (next: MicrophoneStreamState): void => {
    if (state === next) return;
    commitState(next);
    // Snapshot before iterating so a listener subscribing/unsubscribing mid-notification can't affect this pass, and isolate each call so one throwing listener doesn't block the rest.
    for (const listener of [...listeners]) {
      try {
        listener(state);
      } catch (error) {
        console.error('MicrophoneStream state listener threw', error);
      }
    }
  };

  track.addEventListener('mute', () => setState('muted'));
  track.addEventListener('unmute', () => {
    if (state !== 'ended') setState('active');
  });
  track.addEventListener('ended', () => {
    if (!closing) setState('ended');
  });

  return {
    stream,
    get state() {
      return state;
    },
    onStateChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getDiagnostics() {
      return readDiagnostics(track);
    },
    close() {
      closing = true;
      stream.getTracks().forEach((mediaTrack) => mediaTrack.stop());
      commitState('ended');
    },
  };
}

export const requestMicrophoneStream: RequestMicrophoneStream = async (options) => {
  if (!isSupported()) {
    throw unsupportedError();
  }
  if (isBlockedByPermissionsPolicy()) {
    throw blockedByPolicyError();
  }
  if (options?.signal?.aborted) {
    throw abortedError();
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia(buildConstraints(options));
  } catch (error) {
    throw mapAcquisitionError(error);
  }

  // getUserMedia has no native cancellation, so a signal aborted during the permission prompt can only be honored once it resolves.
  if (options?.signal?.aborted) {
    stream.getTracks().forEach((track) => track.stop());
    throw abortedError();
  }

  return createMicrophoneStream(stream);
};
