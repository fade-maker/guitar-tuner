// Minimal ambient declarations for the handful of AudioWorkletGlobalScope symbols this project
// actually uses. These globals only exist at runtime inside an AudioWorkletProcessor's own scope -
// this file exists solely so the worklet source file type-checks under the app's DOM-based tsconfig,
// which doesn't otherwise know about AudioWorkletGlobalScope. MessagePort and AudioWorkletNodeOptions
// are already provided by the DOM lib and are reused here rather than redeclared.

declare abstract class AudioWorkletProcessor {
  readonly port: MessagePort;
  constructor(options?: AudioWorkletNodeOptions);
  abstract process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>,
  ): boolean;
}

declare function registerProcessor(
  name: string,
  processorCtor: new (options?: AudioWorkletNodeOptions) => AudioWorkletProcessor,
): void;
