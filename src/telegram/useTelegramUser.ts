import { useState } from 'react';
import type { TelegramUser } from './types';

// Deliberately scoped to just user identity - same convention as haptics.ts/openLink.ts (a fresh
// minimal interface per consumer rather than one shared "the entire SDK" type).
interface TelegramWebAppUser {
  readonly first_name?: string;
  readonly last_name?: string;
  readonly username?: string;
  readonly photo_url?: string;
}

interface TelegramWindow {
  readonly Telegram?: {
    readonly WebApp?: {
      readonly initDataUnsafe?: {
        readonly user?: TelegramWebAppUser;
      };
    };
  };
}

// initDataUnsafe is explicitly NOT cryptographically verified by Telegram (only the raw initData +
// hash string is, and only a backend can check that). Reading it directly here is intentional and
// safe: this app has no backend, and this data is used purely for cosmetic display (Settings'
// avatar/nickname), never for any authorization or business-logic decision.
function readTelegramUser(): TelegramUser | null {
  const user = (window as unknown as TelegramWindow).Telegram?.WebApp?.initDataUnsafe?.user;
  if (!user?.first_name) return null;

  return {
    displayName: user.last_name ? `${user.first_name} ${user.last_name}` : user.first_name,
    username: user.username ?? null,
    photoUrl: user.photo_url ?? null,
  };
}

// initDataUnsafe.user is fixed for the lifetime of a Mini App session - Telegram doesn't fire any
// event when it changes (unlike viewportHeight/theme), so this reads once via a lazy useState
// initializer (matching useTelegramViewportHeight's own pattern for reading impure external state
// exactly once) rather than subscribing to anything.
export function useTelegramUser(): TelegramUser | null {
  const [user] = useState<TelegramUser | null>(readTelegramUser);
  return user;
}
