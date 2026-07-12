import inTuneSoundUrl from './assets/in-tune.mp3';

// Lazily constructed on first call, not at module load - avoids fetching the asset before the
// tuner screen has ever actually needed it. One shared element, not a fresh `new Audio()` per call:
// resetting currentTime lets a rapid re-trigger restart the clip cleanly, and this is a short,
// infrequent (presenter-cooldown-gated, see useAudioEngine.ts's own hapticTrigger effect) UI cue,
// not something that ever needs to overlap itself.
let audio: HTMLAudioElement | undefined;

export function playInTuneSound(): void {
  audio ??= new Audio(inTuneSoundUrl);
  audio.currentTime = 0;
  // play() returns a promise that rejects if the browser's autoplay policy blocks it (shouldn't
  // happen here - by the time this fires, the user has already granted mic access via a real
  // button tap, which unlocks audio playback for the rest of the page) or if the element errors.
  // Either way, a missed chime is not worth surfacing as an app error. Optional chaining, not a
  // bare call: HTMLMediaElement.play() is spec'd to always return a Promise, but jsdom's own
  // unimplemented stub returns undefined instead of a rejected one - real browsers never hit this
  // branch, but it keeps this function honest about not assuming a return value it didn't check.
  void audio.play()?.catch(() => {});
}
