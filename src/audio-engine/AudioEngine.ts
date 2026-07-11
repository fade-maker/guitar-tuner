import { DEFAULT_AUDIO_ENGINE_CONFIG } from '../config';
import { createFrameProcessor } from './frameProcessor';
import { requestMicrophoneStream } from './microphone';
import type { MicrophoneError, MicrophoneStream } from './microphone';
import type { AudioEngineError, EngineStatus, PitchReading } from './types';
import type { AudioBlockMessage } from './worklets/worklet-messages';
// The `?worker&url` suffix is required, not stylistic: a plain `new URL('./x.worklet.ts', import.meta.url)`
// is NOT recognized by Vite as a JS/TS entry needing transpilation - it gets treated as an opaque static
// asset and inlined as a base64 data: URL containing raw, un-transpiled TypeScript source, which the
// browser cannot execute (a well-documented Vite issue: vitejs/vite#11823). `?worker&url` routes it
// through Vite's worker-aware pipeline instead - real transpilation, a separate emitted chunk, and this
// import resolves to that chunk's URL string (never an actual Worker instance, which isn't wanted here).
import pitchCaptureWorkletUrl from './worklets/pitch-capture.worklet.ts?worker&url';

export interface AudioEngine {
  readonly status: EngineStatus;
  start(): Promise<void>;
  stop(): void;
  subscribe(listener: (reading: PitchReading) => void): () => void;
  onError(listener: (error: AudioEngineError) => void): () => void;
  onStatusChange(listener: (status: EngineStatus) => void): () => void;
}

export type CreateAudioEngine = () => AudioEngine;

const WORKLET_NAME = 'pitch-capture';

// AudioEngine's own error vocabulary is deliberately coarser than MicrophoneError's - this table is
// where that narrowing happens, once, in one place.
function mapMicrophoneError(error: MicrophoneError): AudioEngineError {
  switch (error.reason) {
    case 'permission-denied':
    case 'blocked-by-policy':
      return { reason: 'permission-denied', message: error.message };
    case 'no-device':
    case 'device-unavailable':
    case 'constraints-not-satisfiable':
      return { reason: 'no-input-device', message: error.message };
    case 'context-unsupported':
      return { reason: 'context-unsupported', message: error.message };
    case 'aborted':
    case 'unknown':
      return { reason: 'unknown', message: error.message };
  }
}

export const createAudioEngine: CreateAudioEngine = () => {
  let status: EngineStatus = 'idle';
  let microphoneStream: MicrophoneStream | undefined;
  let micStateUnsubscribe: (() => void) | undefined;
  let audioContext: AudioContext | undefined;
  let contextStateCleanup: (() => void) | undefined;
  let workletNode: AudioWorkletNode | undefined;
  // Bumped by stopEngine()/failEngine() so an in-flight startEngine() can tell, after resuming from an
  // await, whether it's still the current attempt. Without this, a stop() (or a mic 'ended' event) that
  // lands while startEngine() is mid-flight has no way to cancel it, and the stale continuation can
  // resurrect torn-down state - reopening a mic/AudioContext the user already closed and silently
  // overwriting a correctly-set 'idle'/'error' status back to 'listening'.
  let generation = 0;

  const readingListeners = new Set<(reading: PitchReading) => void>();
  const errorListeners = new Set<(error: AudioEngineError) => void>();
  const statusListeners = new Set<(status: EngineStatus) => void>();

  function setStatus(next: EngineStatus): void {
    if (status === next) return;
    status = next;
    for (const listener of [...statusListeners]) {
      try {
        listener(status);
      } catch (error) {
        console.error('AudioEngine status listener threw', error);
      }
    }
  }

  function emitError(error: AudioEngineError): void {
    for (const listener of [...errorListeners]) {
      try {
        listener(error);
      } catch (listenerError) {
        console.error('AudioEngine error listener threw', listenerError);
      }
    }
  }

  function emitReading(reading: PitchReading): void {
    for (const listener of [...readingListeners]) {
      try {
        listener(reading);
      } catch (error) {
        console.error('AudioEngine reading listener threw', error);
      }
    }
  }

  // WebKit (iOS Safari, and potentially Telegram's iOS WebView) creates an AudioContext in the
  // 'suspended' state when its construction isn't tied to a user gesture - which is exactly this
  // app's returning-user flow (the Permission screen auto-skips itself, the tuner auto-starts on
  // mount). A suspended context delivers no audio to the worklet while everything else looks
  // normal: status says 'listening', readings just never arrive, and the UI sits on "searching"
  // forever with no error. This watcher keeps the context running without touching the status
  // machine: resume() immediately whenever the state is anything but running/closed (covers iOS's
  // non-standard 'interrupted' too), re-check on every 'statechange', and - since a gesture-less
  // resume() is allowed to fail on WebKit - retry on the next real user gesture as the fallback.
  function watchContextState(context: AudioContext): void {
    let gestureCleanup: (() => void) | undefined;

    const tryResume = (): void => {
      void context.resume().catch(() => undefined);
    };

    const armGestureResume = (): void => {
      if (gestureCleanup || typeof document === 'undefined') return;
      const onGesture = (): void => tryResume();
      document.addEventListener('pointerdown', onGesture, true);
      document.addEventListener('touchend', onGesture, true);
      gestureCleanup = () => {
        document.removeEventListener('pointerdown', onGesture, true);
        document.removeEventListener('touchend', onGesture, true);
        gestureCleanup = undefined;
      };
    };

    const handleNotRunning = (): void => {
      tryResume();
      armGestureResume();
    };

    const onStateChange = (): void => {
      if (context.state === 'running') {
        gestureCleanup?.();
      } else if (context.state !== 'closed') {
        handleNotRunning();
      }
    };

    context.addEventListener('statechange', onStateChange);
    if (context.state !== 'running' && context.state !== 'closed') {
      handleNotRunning();
    }

    contextStateCleanup = () => {
      context.removeEventListener('statechange', onStateChange);
      gestureCleanup?.();
      contextStateCleanup = undefined;
    };
  }

  function releaseResources(): void {
    if (workletNode) {
      workletNode.port.onmessage = null;
      workletNode.disconnect();
      workletNode = undefined;
    }
    if (contextStateCleanup) {
      contextStateCleanup();
    }
    if (audioContext) {
      void audioContext.close().catch(() => undefined);
      audioContext = undefined;
    }
    if (micStateUnsubscribe) {
      micStateUnsubscribe();
      micStateUnsubscribe = undefined;
    }
    if (microphoneStream) {
      microphoneStream.close();
      microphoneStream = undefined;
    }
  }

  function stopEngine(): void {
    generation += 1;
    releaseResources();
    setStatus('idle');
  }

  function failEngine(error: AudioEngineError): void {
    generation += 1;
    releaseResources();
    setStatus('error');
    emitError(error);
  }

  async function startEngine(): Promise<void> {
    if (status === 'listening' || status === 'requesting-permission') {
      return;
    }
    const myGeneration = generation;
    setStatus('requesting-permission');

    let stream: MicrophoneStream;
    try {
      stream = await requestMicrophoneStream();
    } catch (error) {
      if (myGeneration !== generation) return;
      failEngine(mapMicrophoneError(error as MicrophoneError));
      return;
    }
    if (myGeneration !== generation) {
      // stop() ran while permission was pending: discard this stream rather than resurrecting state.
      stream.close();
      return;
    }
    microphoneStream = stream;
    micStateUnsubscribe = stream.onStateChange((state) => {
      if (state === 'ended') {
        failEngine({ reason: 'no-input-device', message: 'Microphone connection was lost.' });
      }
      // 'muted' intentionally not handled here: the muted period just flows through the pipeline as
      // silence, which Candidate Validation and the Stabilizer already handle gracefully.
    });

    const context = new AudioContext();
    audioContext = context;
    watchContextState(context);

    try {
      await context.audioWorklet.addModule(pitchCaptureWorkletUrl);
    } catch {
      if (myGeneration !== generation) return;
      failEngine({
        reason: 'context-unsupported',
        message: 'This browser does not support the required audio processing.',
      });
      return;
    }
    if (myGeneration !== generation) {
      // stop()/failEngine() already tore down shared state (and this context, if it got that far) while
      // the worklet module was loading. Close our own local reference and stop; nothing else to resurrect.
      void context.close().catch(() => undefined);
      return;
    }

    const sampleRate = context.sampleRate;
    const windowSize = Math.round((DEFAULT_AUDIO_ENGINE_CONFIG.windowDurationMs / 1000) * sampleRate);
    const hopSize = Math.round((DEFAULT_AUDIO_ENGINE_CONFIG.hopDurationMs / 1000) * sampleRate);

    const frameProcessor = createFrameProcessor({
      sampleRate,
      windowSize,
      hopSize,
      minFrequency: DEFAULT_AUDIO_ENGINE_CONFIG.minFrequency,
      maxFrequency: DEFAULT_AUDIO_ENGINE_CONFIG.maxFrequency,
      clarityThreshold: DEFAULT_AUDIO_ENGINE_CONFIG.clarityThreshold,
      minRmsAmplitude: DEFAULT_AUDIO_ENGINE_CONFIG.minRmsAmplitude,
      octaveConfirmFrames: DEFAULT_AUDIO_ENGINE_CONFIG.octaveConfirmFrames,
    });

    const sourceNode = context.createMediaStreamSource(stream.stream);
    const node = new AudioWorkletNode(context, WORKLET_NAME, {
      numberOfInputs: 1,
      numberOfOutputs: 0,
      channelCount: 1,
      // One message per hop instead of one per 128-sample render quantum - see the worklet's own
      // batching comment. hopSize is already in real-sample-rate samples here.
      processorOptions: { batchSize: hopSize },
    });
    workletNode = node;
    node.port.onmessage = (event: MessageEvent<AudioBlockMessage>) => {
      const reading = frameProcessor.processBlock(event.data.samples, performance.now());
      if (reading) {
        emitReading(reading);
      }
    };
    sourceNode.connect(node);

    setStatus('listening');
  }

  return {
    get status() {
      return status;
    },
    start: startEngine,
    stop: stopEngine,
    subscribe(listener) {
      readingListeners.add(listener);
      return () => readingListeners.delete(listener);
    },
    onError(listener) {
      errorListeners.add(listener);
      return () => errorListeners.delete(listener);
    },
    onStatusChange(listener) {
      statusListeners.add(listener);
      return () => statusListeners.delete(listener);
    },
  };
};
