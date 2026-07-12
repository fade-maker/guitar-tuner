import type { ReactElement } from 'react';
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES, useTranslation } from '../../i18n';
import type { Language } from '../../i18n';
import { useNavigation } from '../../navigation';
import { usePreferences } from '../../preferences';
import { triggerHapticFeedback } from '../../telegram/haptics';
import { CheckIndicator, Icon } from '../ui';
import styles from './LanguageScreen.module.css';

// No Figma source exists for this screen (Settings' "Language" row was a flagged, deliberate no-op
// until this pass added a real i18n system - see CLAUDE.md's Stage 2-4 entry, the same gap FAQScreen
// closed for "FAQ"). Same shell/authorization as FAQScreen: no external design, reuse this app's own
// established visual language instead of inventing new one - here specifically the row+CheckIndicator
// picker pattern already used by SelectTuningScreen's Standard tuning row.
export function LanguageScreen(): ReactElement {
  const { preferences, setPreference } = usePreferences();
  const { navigateTo } = useNavigation();
  const t = useTranslation();

  function handleBack(): void {
    triggerHapticFeedback('light');
    navigateTo('settings');
  }

  function handleSelect(language: Language): void {
    if (language === preferences.language) return;
    triggerHapticFeedback('light');
    setPreference('language', language);
  }

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <button type="button" className={styles.backButton} onClick={handleBack} aria-label={t.faq.backAriaLabel}>
          <span className={styles.backIcon}>
            <Icon name="arrow-right" size={20} />
          </span>
        </button>
        <h1 className={styles.title}>{t.languagePicker.title}</h1>
        <span className={styles.headerSpacer} aria-hidden="true" />
      </div>

      <div className={styles.content}>
        <div className={styles.card}>
          {SUPPORTED_LANGUAGES.map((language, index) => (
            <div key={language}>
              {index > 0 && <hr className={styles.divider} />}
              <button type="button" className={styles.row} onClick={() => handleSelect(language)}>
                <span className={styles.rowLabel}>{LANGUAGE_NAMES[language]}</span>
                <CheckIndicator state={language === preferences.language ? 'Active' : 'Default'} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
