export interface WindowReady {
  readonly samples: Float32Array;
  readonly timestamp: number;
}

export interface WindowAccumulator {
  push(block: Float32Array, timestamp: number): WindowReady | null;
  reset(): void;
}

export type CreateWindowAccumulator = (windowSize: number, hopSize: number) => WindowAccumulator;

// Assumes each pushed block is no larger than hopSize - true for the AudioWorklet's fixed 128-sample
// render quantum against any realistic hop size - so a single push can cross at most one hop boundary.
export const createWindowAccumulator: CreateWindowAccumulator = (windowSize, hopSize) => {
  const buffer = new Float32Array(windowSize);
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
    const output = new Float32Array(windowSize);
    const tailLength = windowSize - writeIndex;
    output.set(buffer.subarray(writeIndex), 0);
    output.set(buffer.subarray(0, writeIndex), tailLength);
    return output;
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
