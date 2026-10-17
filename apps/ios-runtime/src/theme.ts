import type { ColorSchemeName } from 'react-native';

export type TempoTheme = ReturnType<typeof makeTheme>;

export function makeTheme(scheme: ColorSchemeName | 'light' | 'dark') {
  const dark = scheme === 'dark';
  return {
    dark,
    background: dark ? '#0C0F12' : '#F3F4F5',
    groupedBackground: dark ? '#12161A' : '#F3F4F5',
    groupedSurface: dark ? '#1C2228' : '#FFFFFF',
    surface: dark ? '#181D22' : '#FFFFFF',
    surfaceElevated: dark ? '#232A31' : '#FFFFFF',
    surfaceMuted: dark ? '#272F37' : '#EAEBED',
    text: dark ? '#F2F4F6' : '#1A1C1F',
    secondary: dark ? '#ABB2BA' : '#74777C',
    tertiary: dark ? '#79828C' : '#96999E',
    separator: dark ? '#303840' : '#E4E5E7',
    accent: '#339CFF',
    accentSoft: dark ? '#132D45' : '#EAF5FF',
    success: dark ? '#56C596' : '#34C759',
    danger: dark ? '#FF6B65' : '#FF3B30',
    warning: dark ? '#E8AF57' : '#FF9500',
    shadow: '#000000',
  };
}

export const radius = { small: 10, medium: 16, large: 24, pill: 999 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };
