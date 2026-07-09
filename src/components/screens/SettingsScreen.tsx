import type { ReactElement } from 'react';
import { usePreferences } from '../../preferences';
import { openExternalLink, useTelegramUser } from '../../telegram';
import { classNames } from '../ui/classNames';
import { Icon, StepperButton, ToggleSwitch } from '../ui';
import settingsAvatar from './assets/settings-avatar.png';
import styles from './SettingsScreen.module.css';

const SUPPORT_URL = 'https://t.me/vrwrxx';

export function SettingsScreen(): ReactElement {
  const { preferences, setPreference } = usePreferences();
  const telegramUser = useTelegramUser();

  function handleCalibrateChange(delta: number): void {
    const next = preferences.a4Frequency + delta;
    if (next <= 0) return;
    setPreference('a4Frequency', next);
  }

  // Outside Telegram (plain browser, local dev) telegramUser is null - keep the original Figma
  // placeholder text exactly as before. Inside Telegram, a real user very often has no public
  // username set at all, so that line is omitted entirely rather than showing a fabricated handle.
  const usernameLine = telegramUser === null ? '@username' : telegramUser.username ? `@${telegramUser.username}` : null;

  return (
    <div className={styles.screen}>
      <div className={styles.content}>
        <div className={styles.profile}>
          <img src={telegramUser?.photoUrl ?? settingsAvatar} alt="" className={styles.avatar} />
          <div className={styles.identity}>
            <span className={styles.nickname}>{telegramUser?.displayName ?? 'Nickname'}</span>
            {usernameLine !== null && <span className={styles.username}>{usernameLine}</span>}
          </div>
        </div>

        <div className={styles.rows}>
          <div className={styles.card}>
            <div className={styles.row}>
              <span className={styles.iconSlot}>
                <Icon name="setting-4" size={24} />
              </span>
              <span className={styles.rowLabel}>Advanced mode</span>
              <ToggleSwitch
                checked={preferences.tunerMode === 'advanced'}
                onChange={(checked) => setPreference('tunerMode', checked ? 'advanced' : 'simple')}
                aria-label="Advanced mode"
              />
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.row}>
              <span className={styles.iconSlot}>
                <Icon name="volume-low" size={24} />
              </span>
              <span className={styles.rowLabel}>Sound effect</span>
              {/* Persists to AppPreferences now, but nothing reads it yet - no sound-effect playback
                  exists anywhere in audio-engine. Wiring an actual sound is a separate feature. */}
              <ToggleSwitch
                checked={preferences.soundEffectsEnabled}
                onChange={(checked) => setPreference('soundEffectsEnabled', checked)}
                aria-label="Sound effect"
              />
            </div>
            <hr className={styles.divider} />
            <div className={styles.row}>
              <span className={styles.iconSlot}>
                <Icon name="refresh-2" size={24} />
              </span>
              <span className={styles.rowLabel}>Left-handed mode</span>
              <ToggleSwitch
                checked={preferences.leftHanded}
                onChange={(checked) => setPreference('leftHanded', checked)}
                aria-label="Left-handed mode"
              />
            </div>
            <hr className={styles.divider} />
            {/* Persists a4Frequency only - does not call a live TunerPresenter.setA4(), since Settings
                has no running audio engine and there's no shared engine instance across screens to
                reach into. Deferred: fixing this for real means deciding how/where a single engine
                instance should live app-wide, which is an architecture question, not a quick fix. */}
            <div className={styles.row}>
              <span className={styles.iconSlot}>
                <Icon name="musicnote" size={24} />
              </span>
              <span className={styles.rowLabel}>Calibrate</span>
              <StepperButton type="-" size="small" onClick={() => handleCalibrateChange(-1)} />
              <span className={styles.calibrateValue}>{preferences.a4Frequency}Hz</span>
              <StepperButton type="+" size="small" onClick={() => handleCalibrateChange(1)} />
            </div>
            <hr className={styles.divider} />
            {/* No language/i18n system exists - the row is rendered per Figma but is a no-op. */}
            <button type="button" className={classNames(styles.row, styles.navRow)} onClick={() => {}}>
              <span className={styles.iconSlot}>
                <Icon name="global" size={24} />
              </span>
              <span className={styles.rowLabel}>Language</span>
              <Icon name="arrow-right" size={16} color="#c2c0b6" />
            </button>
          </div>

          <div className={styles.card}>
            <button
              type="button"
              className={classNames(styles.row, styles.navRow)}
              onClick={() => openExternalLink(SUPPORT_URL)}
            >
              <span className={styles.iconSlot}>
                <Icon name="messages-2" size={20} />
              </span>
              <span className={styles.rowLabel}>Support</span>
              <Icon name="arrow-right" size={16} color="#c2c0b6" />
            </button>
            <hr className={styles.divider} />
            {/* No FAQ destination decided yet (deliberately, not just unfinished) - stays a no-op. */}
            <button type="button" className={classNames(styles.row, styles.navRow)} onClick={() => {}}>
              <span className={styles.iconSlot}>
                <Icon name="book" size={20} />
              </span>
              <span className={styles.rowLabel}>FAQ</span>
              <Icon name="arrow-right" size={16} color="#c2c0b6" />
            </button>
          </div>

          <span className={styles.version}>TunerApp v.1.0.0</span>
        </div>
      </div>
    </div>
  );
}
