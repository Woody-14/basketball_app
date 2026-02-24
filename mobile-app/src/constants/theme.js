/**
 * Design constants for the mobile app.
 * Matches the admin dashboard's premium design system but adapted for mobile.
 */

export const COLORS = {
  // Primary palette
  bg: '#EAECEF',
  surface: '#FFFFFF',
  dark: '#090B11',
  darkLight: '#171A21',
  darkAccent: '#242835',

  // Accent — premium vibrant orange
  accent: '#FF5C16',
  accentDark: '#E34A0B',
  accentLight: '#FFF0E6',
  accentGlow: 'rgba(255, 92, 22, 0.25)',

  // Text
  text: '#171A21',
  textSecondary: '#586376',
  textLight: '#8E9BAE',
  textWhite: '#FFFFFF',

  // Borders
  border: 'rgba(23, 26, 33, 0.08)',
  borderLight: 'rgba(23, 26, 33, 0.04)',

  // Status
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  info: '#3B82F6',

  // Difficulty
  beginner: '#10B981',
  intermediate: '#F59E0B',
  advanced: '#EF4444',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const FONTS = {
  regular: { fontWeight: '400' },
  medium: { fontWeight: '500' },
  semibold: { fontWeight: '600' },
  bold: { fontWeight: '700' },
  heavy: { fontWeight: '800' },
  sizes: {
    xs: 12,
    sm: 14,
    body: 16,
    md: 18,
    lg: 22,
    xl: 28,
    xxl: 36,
    hero: 44,
  },
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 8,
  },
  glow: {
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  }
};

// Drill category display labels
export const CATEGORY_LABELS = {
  ball_handling: 'Ball Handling',
  shooting_form: 'Shooting Form',
  shooting_midrange: 'Midrange',
  shooting_three: '3-Point',
  free_throws: 'Free Throws',
  finishing: 'Finishing',
  footwork: 'Footwork',
  defense: 'Defense',
  passing: 'Passing',
  conditioning: 'Conditioning',
  basketball_iq: 'Basketball IQ',
  warmup: 'Warm Up',
  cooldown: 'Cool Down',
};

export const DIFFICULTY_LABELS = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export const DIFFICULTY_COLORS = {
  beginner: { bg: COLORS.successLight, text: '#065F46' },
  intermediate: { bg: COLORS.warningLight, text: '#92400E' },
  advanced: { bg: COLORS.dangerLight, text: '#991B1B' },
};
