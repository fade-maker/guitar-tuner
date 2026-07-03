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
  let workletNode: AudioWorkletNode | undefined;

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

  function releaseResources(): void {
    if (workletNode) {
      workletNode.port.onmessage = null;
      workletNode.disconnect();
      workletNode = undefined;
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
    releaseResources();
    setStatus('idle');
  }

  function failEngine(error: AudioEngineError): void {
    releaseResources();
    setStatus('error');
    emitError(error);
  }

  async function startEngine(): Promise<void> {
    if (status === 'listening' || status === 'requesting-permission') {
      return;
    }
    setStatus('requesting-permission');

    let stream: MicrophoneStream;
    try {
      stream = await requestMicrophoneStream();
    } catch (error) {
      failEngine(mapMicrophoneError(error as MicrophoneError));
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

    try {
      await context.audioWorklet.addModule(pitchCaptureWorkletUrl);
    } catch {
      failEngine({
        reason: 'context-unsupported',
        message: 'This browser does not support the required audio processing.',
      });
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
    });

    const sourceNode = context.createMediaStreamSource(stream.stream);
    const node = new AudioWorkletNode(context, WORKLET_NAME, {
      numberOfInputs: 1,
      numberOfOutputs: 0,
      channelCount: 1,
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
