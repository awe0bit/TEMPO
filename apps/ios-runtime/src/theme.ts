import type { ColorSchemeName } from 'react-native';

export type TempoTheme = ReturnType<typeof makeTheme>;

export function makeTheme(_scheme: ColorSchemeName | 'light' | 'dark') {
  // The iOS runtime intentionally uses one light, neutral canvas. Keeping the
  // palette deterministic also prevents an OTA from rendering half light and
  // half dark while the native chrome is being restored after launch.
  const dark = false;
  return {
    dark,
    background: '#F3F4F5',
    groupedBackground: '#F3F4F5',
    groupedSurface: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceMuted: '#EAEBED',
    text: '#050505',
    secondary: '#74777C',
    tertiary: '#96999E',
    separator: '#E4E5E7',
    accent: '#007AFF',
    accentSoft: '#EAF3FF',
    success: '#34C759',
    danger: '#FF3B30',
    warning: '#FF9500',
    shadow: '#000000',
  };
}

export const radius = { small: 10, medium: 16, large: 24, pill: 999 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };
