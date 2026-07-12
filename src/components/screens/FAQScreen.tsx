import { useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from '../../i18n';
import type { FAQEntryText } from '../../i18n';
import { useNavigation } from '../../navigation';
import { triggerHapticFeedback } from '../../telegram/haptics';
import { classNames } from '../ui/classNames';
import { Icon } from '../ui';
import styles from './FAQScreen.module.css';

// No Figma source exists for this screen (Settings' FAQ row was a flagged, deliberate no-op - see
// CLAUDE.md's Stage 2-4 log entry). Authorized to close the gap with our own judgment: an in-app
// screen using the existing NavigationProvider/ScreenId/components/screens pattern, styled to match
// the rest of the app (same card/row language as SettingsScreen, same accordion technique as Select
// Tuning's Power/Open/Extras catalog) rather than inventing new visual language. No new dependency,
// no external host - real content grounded in what this app actually does, not generic filler.
// Content itself now lives in i18n/locales/*.ts (Translations.faq.entries) alongside every other
// piece of this app's copy, translated into all 3 supported languages - not hardcoded English here.

interface FAQRowProps {
  readonly entry: FAQEntryText;
  readonly expanded: boolean;
  readonly onToggle: () => void;
}

function FAQRow({ entry, expanded, onToggle }: FAQRowProps): ReactElement {
  return (
    <div className={styles.item}>
      <button type="button" className={styles.questionRow} onClick={onToggle} aria-expanded={expanded}>
        <span className={styles.question}>{entry.question}</span>
        <span className={classNames(styles.chevron, !expanded && styles.chevronCollapsed)}>
          <Icon name="arrow-down" size={16} />
        </span>
      </button>
      <div className={classNames(styles.expandWrapper, expanded && styles.expandWrapperOpen)}>
        <div className={styles.expandInner}>
          <p className={styles.answer}>{entry.answer}</p>
        </div>
      </div>
    </div>
  );
}

// Same "always mounted, height-animated via grid-template-rows" accordion technique already
// established and tested in SelectTuningScreen's Power/Open/Extras catalog - reused rather than
// invented fresh for this screen.
export function FAQScreen(): ReactElement {
  const { navigateTo } = useNavigation();
  const t = useTranslation();
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);

  function handleToggle(question: string): void {
    triggerHapticFeedback('light');
    setOpenQuestion((current) => (current === question ? null : question));
  }

  function handleBack(): void {
    triggerHapticFeedback('light');
    navigateTo('settings');
  }

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <button type="button" className={styles.backButton} onClick={handleBack} aria-label={t.faq.backAriaLabel}>
          <span className={styles.backIcon}>
            <Icon name="arrow-right" size={20} />
          </span>
        </button>
        <h1 className={styles.title}>{t.faq.title}</h1>
        <span className={styles.headerSpacer} aria-hidden="true" />
      </div>

      <div className={styles.content}>
        <div className={styles.card}>
          {t.faq.entries.map((entry, index) => (
            <div key={entry.question}>
              <FAQRow entry={entry} expanded={openQuestion === entry.question} onToggle={() => handleToggle(entry.question)} />
              {index < t.faq.entries.length - 1 && <hr className={styles.divider} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
