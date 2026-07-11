export interface WindowReady {
  // Valid only until the accumulator's next push()/reset() - a reused scratch buffer, not a fresh
  // allocation per hop. See readWindow's comment.
  readonly samples: Float32Array;
  readonly timestamp: number;
}

export interface WindowAccumulator {
  push(block: Float32Array, timestamp: number): WindowReady | null;
  reset(): void;
}

export type CreateWindowAccumulator = (windowSize: number, hopSize: number) => WindowAccumulator;

// Assumes each pushed block is no larger than hopSize - true both for the AudioWorklet's raw
// 128-sample render quantum and for its batched hop-sized messages (batchSize == hopSize exactly) -
// so a single push can cross at most one hop boundary.
export const createWindowAccumulator: CreateWindowAccumulator = (windowSize, hopSize) => {
  const buffer = new Float32Array(windowSize);
  // Reused across every readWindow() call (audit H1): allocating a fresh windowSize-sample array
  // per hop (~83/s at the default config) produced ~0.7MB/s of garbage for buffers that every
  // consumer (RMS gate, pitchy) reads strictly synchronously. Contract: the returned samples are
  // valid only until the next push()/reset() - callers must not retain them across calls, which
  // frameProcessor's synchronous pipeline already satisfies by construction.
  const windowScratch = new Float32Array(windowSize);
  let writeIndex = 0;
  let filledSamples = 0;
  let samplesSinceLastWindow = 0;

  function writeBlock(block: Float32Array): void {
    const remaining = windowSize - writeIndex;
    if (block.length <= remaining) {
      buffer.set(block, writeIndex);
    } else {
      buffer.set(block.subarray(0, remaining), writeIndex);
      buffer.set(block.subarray(remaining), 0);
    }
    writeIndex = (writeIndex + block.length) % windowSize;
    filledSamples = Math.min(filledSamples + block.length, windowSize);
  }

  function readWindow(): Float32Array {
    const tailLength = windowSize - writeIndex;
    windowScratch.set(buffer.subarray(writeIndex), 0);
    windowScratch.set(buffer.subarray(0, writeIndex), tailLength);
    return windowScratch;
  }

  return {
    push(block, timestamp) {
      writeBlock(block);
      samplesSinceLastWindow += block.length;

      if (filledSamples < windowSize) {
        // Don't let a backlog build up purely from warm-up - it would otherwise cause a burst of
        // several immediate window emissions the instant warm-up completes.
        samplesSinceLastWindow = Math.min(samplesSinceLastWindow, hopSize);
        return null;
      }

      if (samplesSinceLastWindow < hopSize) {
        return null;
      }

      samplesSinceLastWindow -= hopSize;
      return { samples: readWindow(), timestamp };
    },
    reset() {
      buffer.fill(0);
      writeIndex = 0;
      filledSamples = 0;
      samplesSinceLastWindow = 0;
    },
  };
};
