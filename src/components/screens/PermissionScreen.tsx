import { useEffect } from 'react';
import type { ReactElement } from 'react';
import { useNavigation } from '../../navigation';
import { usePreferences } from '../../preferences';
import { triggerHapticFeedback } from '../../telegram/haptics';
import { Button } from '../ui';
import styles from './PermissionScreen.module.css';

// Minimal local view of the Permissions API - 'microphone' is a real, spec'd PermissionName in
// browsers but TypeScript's lib.dom narrows PermissionName to a union that (depending on TS
// version) may exclude it, so the query goes through this local shape instead of a cast chain.
interface MicrophonePermissionStatus {
  readonly state: 'granted' | 'denied' | 'prompt';
}

async function queryMicrophonePermission(): Promise<MicrophonePermissionStatus | null> {
  const permissions = navigator.permissions as
    | { query(descriptor: { name: string }): Promise<MicrophonePermissionStatus> }
    | undefined;
  if (!permissions?.query) return null;
  try {
    return await permissions.query({ name: 'microphone' });
  } catch {
    // Some engines implement the API but not this descriptor name - treat exactly like the API
    // being absent: fall through to showing the screen and letting getUserMedia itself prompt.
    return null;
  }
}

// Figma: "Permission Screen" (163:4008). Shown as the app's initial screen; asks for microphone
// access behind an explicit button press instead of the tuner prompting the moment the app loads.
//
// The "don't re-ask every visit" behavior ("всегда на этом сайте") isn't something a web app can
// force - permission persistence is the browser's own per-origin decision, made in its native
// prompt UI. What this screen does instead is respect a persisted grant when one exists: on mount
// it checks the Permissions API, and if microphone access is already granted from a previous
// session it skips itself entirely, going straight to the tuner. On engines without the
// Permissions API (or without the 'microphone' descriptor), the screen just shows normally and
// getUserMedia's own prompt handles the rest.
//
// A denied result keeps the user here with the button still active - Figma has no denied/error
// state design for this screen, so nothing is invented beyond re-allowing the attempt (which lets
// the user retry after unblocking the permission in browser/Telegram settings).
export function PermissionScreen(): ReactElement {
  const { preferences } = usePreferences();
  const { navigateTo } = useNavigation();

  const tunerScreen = preferences.tunerMode === 'advanced' ? 'advanced-tuner' : 'simple-tuner';

  useEffect(() => {
    let cancelled = false;
    void queryMicrophonePermission().then((status) => {
      if (!cancelled && status?.state === 'granted') {
        navigateTo(tunerScreen);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [navigateTo, tunerScreen]);

  async function handleRequestAccess(): Promise<void> {
    triggerHapticFeedback('light');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Only the grant itself is needed here - the tuner screen owns the real capture session and
      // opens its own stream via useAudioEngine. Leaving this one running would hold the mic open
      // twice.
      for (const track of stream.getTracks()) track.stop();
      navigateTo(tunerScreen);
    } catch {
      // Denied (or no mic available). No designed error state exists - stay here, button remains
      // usable for a retry.
    }
  }

  return (
    <div className={styles.screen}>
      {/* Breathing "sonar ping" illustration - see PermissionScreen.module.css's own comment for the
          full reference-video analysis and why this is CSS-only (no WebGL/canvas). 3 identical ring
          instances, each a full 3s 0%->100% journey, staggered by a third of that (1s) via a negative
          animation-delay - negative, not positive, so every instance is already mid-journey on the
          very first painted frame instead of the screen looking empty for up to 2s while instances
          "catch up" to their offset. */}
      <div className={styles.illustration} aria-hidden="true">
        <div className={styles.core} />
        <div className={styles.ring} style={{ animationDelay: '0s' }} />
        <div className={styles.ring} style={{ animationDelay: '-1s' }} />
        <div className={styles.ring} style={{ animationDelay: '-2s' }} />
      </div>

      {/* Figma's own text node is two fixed lines; \n + white-space: pre-line reproduces the break
          without a markup-only <br>. Figma's master reads "Request acces " (typo + trailing space)
          - corrected here, same policy as the "Advansed tunind" precedent. */}
      <h1 className={styles.title}>{'Allow microphone\nto start tuning'}</h1>

      <div className={styles.actionBar}>
        <div className={styles.actionButton}>
          <Button variant="primary" size="large" onClick={() => void handleRequestAccess()}>
            Request access
          </Button>
        </div>
      </div>
    </div>
  );
}
