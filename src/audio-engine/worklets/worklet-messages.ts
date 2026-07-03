// The worklet is a pure transport layer: it captures raw render-quantum blocks and relays them,
// nothing else. It doesn't stamp its own timestamp - the main thread does that on receipt, keeping
// the whole pipeline on one clock (performance.now()) rather than mixing in AudioContext's own clock.
export interface AudioBlockMessage {
  readonly samples: Float32Array;
}
