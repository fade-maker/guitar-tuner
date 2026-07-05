import { useState } from 'react';
import type { ReactElement } from 'react';
import { useNavigation } from '../../navigation';
import { usePreferences } from '../../preferences';
import { classNames } from '../ui/classNames';
import { FooterNavigation, Icon, StepperButton, ToggleSwitch } from '../ui';
import settingsAvatar from './assets/settings-avatar.png';
import styles from './SettingsScreen.module.css';

export function SettingsScreen(): ReactElement {
  const { preferences, setPreference } = usePreferences();
  const { navigateTo } = useNavigation();

  // Figma's "Sound effect" row has no backing field in AppPreferences, and no sound-effect
  // playback exists anywhere in audio-engine - there's nothing to wire this to without inventing a
  // new preference and a new feature, so it's local, unpersisted UI state. Flagged in the Stage 2
  // report rather than silently deciding what this toggle should control.
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(true);

  function handleCalibrateChange(delta: number): void {
    const next = preferences.a4Frequency + delta;
    if (next <= 0) return;
    setPreference('a4Frequency', next);
  }

  return (
    <div className={styles.screen}>
      <div className={styles.content}>
        <div className={styles.profile}>
          <img src={settingsAvatar} alt="" className={styles.avatar} />
          <div className={styles.identity}>
            {/* No Telegram user-identity wiring exists (TelegramAdapter only exposes theme +
                haptics) - real nickname/username/avatar would need that interface extended,
                which is an architecture change. Static Figma placeholder until that's decided. */}
            <span className={styles.nickname}>Nickname</span>
            <span className={styles.username}>@username</span>
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
              <ToggleSwitch checked={soundEffectsEnabled} onChange={setSoundEffectsEnabled} aria-label="Sound effect" />
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
            {/* No support/FAQ destination (screen or external URL) exists yet - no-op per Figma. */}
            <button type="button" className={classNames(styles.row, styles.navRow)} onClick={() => {}}>
              <span className={styles.iconSlot}>
                <Icon name="messages-2" size={20} />
              </span>
              <span className={styles.rowLabel}>Support</span>
              <Icon name="arrow-right" size={16} color="#c2c0b6" />
            </button>
            <hr className={styles.divider} />
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

      <div className={styles.footer}>
        <FooterNavigation
          active="Settings"
          onSelect={(tab) =>
            tab === 'Tuner' && navigateTo(preferences.tunerMode === 'advanced' ? 'advanced-tuner' : 'simple-tuner')
          }
        />
      </div>
    </div>
  );
}
