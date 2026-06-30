export const COLORS = {
  primary: '#0084FF',
  primaryDark: '#0073E6',
  background: '#FFFFFF',
  backgroundLight: '#F0F2F5',
  text: '#000000',
  textSecondary: '#65676B',
  textTertiary: '#8A8D91',
  border: '#E5E7EB',
  online: '#31A24C',
  messageUser: '#0084FF',
  messageOther: '#E4E6EB',
  shadow: '#00000015',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const BORDER_RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
};

export const TYPOGRAPHY = {
  largeTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  title: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400' as const,
  },
};
