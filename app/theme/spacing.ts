/** 4px base grid */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  /** Bottom nav + safe area padding */
  tabBar: 90,
  /** Standard screen horizontal padding */
  screen: 20,
  /** Status bar / notch offset */
  headerTop: 56,
} as const;

export type Spacing = typeof spacing;
