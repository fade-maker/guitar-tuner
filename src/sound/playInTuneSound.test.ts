// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { playInTuneSound } from './playInTuneSound';

// jsdom implements the HTMLMediaElement interface but its play()/pause() throw "not implemented" -
// stubbed here the same way this project already stubs other browser APIs jsdom doesn't back for
// real (e.g. requestAnimationFrame in useAudioEngine.test.ts).
function stubAudioPlay(impl: () => Promise<void> = () => Promise.resolve()): ReturnType<typeof vi.fn> {
  const play = vi.fn(impl);
  Object.defineProperty(window.HTMLMediaElement.prototype, 'play', { value: play, configurable: true });
  return play;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('playInTuneSound', () => {
  it('calls play() on the underlying audio element', () => {
    const play = stubAudioPlay();
    playInTuneSound();
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('resets currentTime before playing, so a rapid re-trigger restarts the clip', () => {
    const play = stubAudioPlay();
    playInTuneSound();
    playInTuneSound();
    expect(play).toHaveBeenCalledTimes(2);
  });

  it('does not throw when the browser rejects play() (e.g. an autoplay-policy block)', () => {
    stubAudioPlay(() => Promise.reject(new DOMException('blocked', 'NotAllowedError')));
    expect(() => playInTuneSound()).not.toThrow();
  });
});
