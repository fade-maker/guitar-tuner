import type { HapticImpactStyle, TelegramThemeParams } from './types';

export interface TelegramAdapter {
  readonly isAvailable: boolean;
  getThemeParams(): TelegramThemeParams | null;
  triggerHaptic(style: HapticImpactStyle): void;
  onThemeChange(listener: (theme: TelegramThemeParams) => void): () => void;
}

export type CreateTelegramAdapter = () => TelegramAdapter;
