import { Platform } from 'react-native';

export const colors = {
  bg: '#0E0F12',
  surface: '#17191E',
  surfaceAlt: '#20232A',
  border: '#2A2E36',
  text: '#F4F5F7',
  textMuted: '#9AA0AA',
  textFaint: '#666C77',
  accent: '#FF5A1F',
  accentSoft: 'rgba(255, 90, 31, 0.14)',
  success: '#2FBF71',
  danger: '#FF4D5E',
  // Workout kinds
  strength: '#5B8CFF',
  metcon: '#FF5A1F',
  run: '#2FBF71',
  hybrid: '#B57BFF',
  endurance: '#20C1C9',
  gymnastics: '#F5B82E',
  recovery: '#8A94A6',
  rest: '#4A505B',
} as const;

export const kindColor = (kind: string): string =>
  (colors as Record<string, string>)[kind] ?? colors.hybrid;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
export const maxContentWidth = 720;

export const fonts = {
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, monospace' }),
};
