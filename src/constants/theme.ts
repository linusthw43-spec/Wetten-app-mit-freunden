import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#11181C',
    textSecondary: '#60646C',
    background: '#FFFFFF',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    border: '#D9D9E0',
    accent: '#6C47FF',
    onAccent: '#FFFFFF',
    danger: '#E5484D',
    success: '#30A46C',
  },
  dark: {
    text: '#ECEDEE',
    textSecondary: '#B0B4BA',
    background: '#111113',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    border: '#363A3F',
    accent: '#8E6CFF',
    onAccent: '#FFFFFF',
    danger: '#FF6369',
    success: '#3DD68C',
  },
} as const;

export type ThemeColors = { [K in keyof typeof Colors.light]: string };
export type ThemeColor = keyof ThemeColors;

export const Fonts = Platform.select({
  ios: { rounded: 'ui-rounded', mono: 'ui-monospace' },
  web: { rounded: 'system-ui, sans-serif', mono: 'ui-monospace, monospace' },
  default: { rounded: 'normal', mono: 'monospace' },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  small: 8,
  medium: 14,
  large: 24,
} as const;

export const MaxContentWidth = 800;

/** Emojis, die Gratis-Nutzer wählen können. Pro kann später jedes Emoji nehmen. */
export const FREE_EMOJIS = ['😎', '🦊', '🐸', '🤠', '👻', '🦄', '🐙', '🔥'] as const;
