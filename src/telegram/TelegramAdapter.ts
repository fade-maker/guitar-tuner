import type { TelegramThemeParams } from './types';

// Haptics are deliberately not part of this interface - triggerHapticFeedback in ./haptics is the one
// authoritative implementation, and this skeleton (theme params, theme change notifications) covers only
// the Telegram capabilities that don't have a real implementation yet.
export interface TelegramAdapter {
  readonly isAvailable: boolean;
  getThemeParams(): TelegramThemeParams | null;
  onThemeChange(listener: (theme: TelegramThemeParams) => void): () => void;
}

export type CreateTelegramAdapter = () => TelegramAdapter;
