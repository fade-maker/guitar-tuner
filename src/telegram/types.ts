export interface TelegramThemeParams {
  readonly backgroundColor: string;
  readonly textColor: string;
  readonly accentColor: string;
  readonly isDark: boolean;
}

export type HapticImpactStyle = 'light' | 'medium' | 'heavy';

export interface TelegramUser {
  readonly displayName: string;
  readonly username: string | null;
  readonly photoUrl: string | null;
}
