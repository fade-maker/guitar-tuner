import type { Language, Translations } from '../types';
import { en } from './en';
import { es } from './es';
import { ru } from './ru';

export const LOCALES: Record<Language, Translations> = { en, ru, es };
