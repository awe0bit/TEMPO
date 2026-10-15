import type { ColorSchemeName } from 'react-native';

export type TempoTheme = ReturnType<typeof makeTheme>;

export function makeTheme(scheme: ColorSchemeName | 'light' | 'dark') {
  const dark = scheme === 'dark';
  return {
    dark,
    background: dark ? '#101214' : '#F3F4F5',
    groupedBackground: dark ? '#101214' : '#F3F4F5',
    groupedSurface: dark ? '#1A1C1F' : '#FFFFFF',
    surface: dark ? '#1A1C1F' : '#FFFFFF',
    surfaceElevated: dark ? '#22252A' : '#FFFFFF',
    surfaceMuted: dark ? '#272A2F' : '#EAEBED',
    text: dark ? '#FFFFFF' : '#1A1C1F',
    secondary: dark ? '#A8ABB0' : '#74777C',
    tertiary: dark ? '#777B81' : '#96999E',
    separator: dark ? '#30343A' : '#E4E5E7',
    accent: '#339CFF',
    accentSoft: dark ? '#162B40' : '#EAF5FF',
    success: '#34C759',
    danger: '#FF3B30',
    warning: '#FF9500',
    shadow: '#000000',
  };
}

export const radius = { small: 10, medium: 16, large: 24, pill: 999 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };
