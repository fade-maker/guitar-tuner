import type { AudioBlockMessage } from './worklet-messages';

// Deliberately minimal: no ring buffer, no hop scheduling, no pitch detection here. This processor's
// only job is to hand each 128-sample render quantum to the main thread untouched, where all of the
// actual DSP logic lives in ordinary, unit-testable TypeScript. See windowAccumulator.ts/frameProcessor.ts.
class PitchCaptureProcessor extends AudioWorkletProcessor {
  process(inputs: Float32Array[][]): boolean {
    const channel = inputs[0]?.[0];
    if (channel && channel.length > 0) {
      // Copy before transferring: the input array's buffer is owned and reused by the audio renderer,
      // so it can't be transferred directly without detaching memory the renderer still needs.
      const samples = channel.slice();
      const message: AudioBlockMessage = { samples };
      this.port.postMessage(message, [samples.buffer]);
    }
    return true;
  }
}

registerProcessor('pitch-capture', PitchCaptureProcessor);
