/**
 * Glass Ledger Design System
 * "Quiet Luxury for Data" — dark glassmorphism theme
 */

export const GlassColors = {
  // Background
  bg: '#0B0E0D',
  bgLight: '#17130a',

  // Surfaces (glass)
  glass: 'rgba(26, 33, 30, 0.45)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  glassBorderStrong: 'rgba(255, 255, 255, 0.12)',

  // Primary (Gold)
  primary: '#FFD773',
  primaryDim: '#F3C01E',
  primaryMuted: 'rgba(255, 215, 115, 0.12)',
  primaryGlow: 'rgba(212, 175, 55, 0.3)',

  // Text
  textMain: '#F4F6F5',
  textMuted: '#828E87',
  textDim: '#5A635D',

  // Accents
  red: '#C44536',
  redMuted: 'rgba(196, 69, 54, 0.15)',
  green: '#4ADE80',
  greenMuted: 'rgba(74, 222, 128, 0.12)',

  // Misc
  overlay: 'rgba(0, 0, 0, 0.6)',
  track: 'rgba(255, 255, 255, 0.06)',
} as const;

export const GlassTypography = {
  // Display — Playfair Display
  headline: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.02,
  },
  headlineMobile: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.02,
  },
  headlineSm: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 18,
    lineHeight: 24,
  },

  // Body — Outfit (geometric sans)
  body: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 16,
    lineHeight: 24,
  },
  bodySm: {
    fontFamily: 'Outfit_300Light',
    fontSize: 14,
    lineHeight: 20,
  },

  // Data — JetBrains Mono
  dataLg: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 36,
    lineHeight: 40,
  },
  dataMd: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 16,
    lineHeight: 20,
  },

  // Labels
  label: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.05,
  },
} as const;

export const GlassSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const GlassRadius = {
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;
