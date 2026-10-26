export const colors = {
  // Primary Navy Blue Theme
  primary: '#1E3A8A',           // Deep navy blue
  primaryDark: '#1E293B',       // Darker navy
  primaryLight: '#3B82F6',      // Lighter blue accent
  primarySoft: '#EFF6FF',       // Very soft blue background

  // Neutrals
  background: '#F8FAFC',        // Soft grey-white background
  surface: '#FFFFFF',           // Pure white cards/surfaces
  surfaceElevated: '#FFFFFF',   // Elevated surfaces
  surfaceMuted: '#F1F5F9',      // Muted grey surface
  border: '#E2E8F0',            // Soft grey border
  borderLight: '#F1F5F9',       // Lighter border

  // Text
  text: '#0F172A',              // Near black for primary text
  textSecondary: '#64748B',     // Grey for secondary text
  textTertiary: '#94A3B8',      // Light grey for tertiary text
  textInverse: '#FFFFFF',       // White text for dark backgrounds

  // Emergency Red (used sparingly)
  danger: '#DC2626',            // Emergency red
  dangerDark: '#B91C1C',        // Darker red
  dangerSoft: '#FEE2E2',        // Soft red background
  dangerLight: '#FEF2F2',       // Very light red

  // Accent Colors
  accent: '#1E3A8A',            // Navy blue accent
  accentStrong: '#1E293B',      // Strong accent
  accentSoft: '#EFF6FF',        // Soft accent background

  // Status Colors
  success: '#059669',           // Green for success
  successSoft: '#D1FAE5',       // Soft green
  successDark: '#047857',       // Dark green

  warning: '#D97706',           // Orange for warnings
  warningSoft: '#FEF3C7',       // Soft orange
  warningDark: '#B45309',       // Dark orange

  info: '#0284C7',              // Info blue
  infoSoft: '#E0F2FE',          // Soft info blue

  // Utility
  placeholder: '#94A3B8',       // Placeholder text
  disabled: '#CBD5E1',          // Disabled elements
  overlay: 'rgba(15, 23, 42, 0.6)',  // Dark overlay
  overlayLight: 'rgba(15, 23, 42, 0.3)',  // Light overlay

  // Shadows (for consistency)
  shadowColor: '#1E293B',

  // Emergency SOS specific
  emergency: '#DC2626',         // SOS emergency color
  emergencyGlow: 'rgba(220, 38, 38, 0.2)',  // Glow effect
} as const;

// Typography scale
export const typography = {
  // Font sizes
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 40,
    '6xl': 48,
  },

  // Font weights
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

// Spacing scale (using 4px base unit)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
  '6xl': 80,
} as const;

// Border radius
export const borderRadius = {
  none: 0,
  sm: 6,
  base: 10,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const;

// Shadows
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  base: {
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  lg: {
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;
