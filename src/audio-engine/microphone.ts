export interface MicrophoneStream {
  readonly stream: MediaStream;
  close(): void;
}

export type RequestMicrophoneStream = () => Promise<MicrophoneStream>;
