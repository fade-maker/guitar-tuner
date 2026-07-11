import type { AudioBlockMessage } from './worklet-messages';

// Deliberately minimal: no ring buffer beyond hop batching, no window/hop scheduling, no pitch
// detection here. This processor's only job is to relay captured samples to the main thread, where
// all of the actual DSP logic lives in ordinary, unit-testable TypeScript. See
// windowAccumulator.ts/frameProcessor.ts.
//
// Batching (Production Readiness Audit H1): posting every raw 128-sample render quantum meant
// ~345 postMessage/s (one every ~2.9ms), each allocating a fresh Float32Array + message object on
// the main thread's receiving side. Nothing downstream can act more often than once per hop anyway
// (the window accumulator only emits at hop boundaries), so quanta are batched here into one
// hop-sized message (~12ms cadence, ~83 messages/s - a 4x reduction in message and allocation
// churn) with zero added latency: the batch completes exactly when the hop boundary it feeds does.
// batchSize arrives via processorOptions from AudioEngine (it's computed from the real sample rate
// at start() time); when absent, falls back to per-quantum posting, the previous behavior.
class PitchCaptureProcessor extends AudioWorkletProcessor {
  private readonly batchSize: number;
  private batch: Float32Array;
  private batchFill = 0;

  constructor(options?: AudioWorkletNodeOptions) {
    super(options);
    const requested = (options?.processorOptions as { batchSize?: unknown } | undefined)?.batchSize;
    this.batchSize = typeof requested === 'number' && requested >= 128 ? Math.floor(requested) : 128;
    this.batch = new Float32Array(this.batchSize);
  }

  process(inputs: Float32Array[][]): boolean {
    const channel = inputs[0]?.[0];
    if (!channel || channel.length === 0) {
      return true;
    }

    // Copy into the batch (the input array's buffer is owned and reused by the audio renderer, so
    // it can never be transferred directly); a quantum can straddle a batch boundary, hence the loop.
    let offset = 0;
    while (offset < channel.length) {
      const take = Math.min(this.batchSize - this.batchFill, channel.length - offset);
      this.batch.set(channel.subarray(offset, offset + take), this.batchFill);
      this.batchFill += take;
      offset += take;

      if (this.batchFill === this.batchSize) {
        const message: AudioBlockMessage = { samples: this.batch };
        this.port.postMessage(message, [this.batch.buffer]);
        // The transferred buffer is detached now - a fresh one is required (ping-ponging two
        // buffers is impossible with transfer semantics). One small allocation per ~12ms.
        this.batch = new Float32Array(this.batchSize);
        this.batchFill = 0;
      }
    }
    return true;
  }
}

registerProcessor('pitch-capture', PitchCaptureProcessor);
