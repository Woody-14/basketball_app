/**
 * Design constants for the mobile app.
 * Matches the admin dashboard's design system but adapted for mobile.
 */

export const COLORS = {
  // Primary palette
  bg: '#F8F7F4',
  surface: '#FFFFFF',
  dark: '#1A1A2E',
  darkLight: '#25254A',
  darkAccent: '#2D2D5E',

  // Accent — basketball orange
  accent: '#E8712A',
  accentDark: '#D4631F',
  accentLight: '#FFF0E6',
  accentGlow: 'rgba(232, 113, 42, 0.15)',

  // Text
  text: '#1A1A2E',
  textSecondary: '#6B7080',
  textLight: '#9BA1B0',
  textWhite: '#FFFFFF',

  // Borders
  border: '#E8E9ED',
  borderLight: '#F0F1F3',

  // Status
  success: '#2ECC71',
  successLight: '#E8F8F0',
  warning: '#F1C40F',
  warningLight: '#FEF3E2',
  danger: '#E74C3C',
  dangerLight: '#FDECEB',
  info: '#3498DB',

  // Difficulty
  beginner: '#2ECC71',
  intermediate: '#F39C12',
  advanced: '#E74C3C',
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
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
};

export const FONTS = {
  regular: { fontWeight: '400' },
  medium: { fontWeight: '500' },
  semibold: { fontWeight: '600' },
  bold: { fontWeight: '700' },
  sizes: {
    xs: 11,
    sm: 13,
    body: 15,
    md: 17,
    lg: 20,
    xl: 24,
    xxl: 32,
    hero: 40,
  },
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 8,
  },
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
  beginner: { bg: COLORS.successLight, text: '#1B8A4E' },
  intermediate: { bg: COLORS.warningLight, text: '#C27A0E' },
  advanced: { bg: COLORS.dangerLight, text: '#C0392B' },
};
