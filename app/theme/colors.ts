/**
 * Books By AMA — semantic color tokens.
 * Dark mode is the brand default; light mode mirrors the same roles.
 */

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceElevated: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textFaint: string;
  textInverse: string;
  accent: string;
  accentSoft: string;
  accentMuted: string;
  gold: string;
  goldSoft: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  white: string;
  black: string;
  overlay: string;
  /** Legacy aliases used by profile and settings screens */
  bg: string;
  card: string;
  cardAlt: string;
  text: string;
  primary: string;
  primaryTint: string;
  goldTint: string;
  dangerTint: string;
};

const darkBase = {
  background: "#0A0A0F",
  surface: "#12121A",
  surfaceAlt: "#0D0D14",
  surfaceElevated: "#1A1A28",
  border: "#1E1E30",
  borderStrong: "#2A2A40",
  textPrimary: "#E8E8FF",
  textSecondary: "#C6C6EE",
  textMuted: "#8899BB",
  textFaint: "#445566",
  textInverse: "#0A0A0F",
  accent: "#2E86AB",
  accentSoft: "#0D2233",
  accentMuted: "#1A3A55",
  gold: "#B8860B",
  goldSoft: "#2A2410",
  success: "#22BFA0",
  successSoft: "#0F2A26",
  danger: "#FF6B6B",
  dangerSoft: "#2A1418",
  white: "#FFFFFF",
  black: "#000000",
  overlay: "rgba(0,0,0,0.55)",
};

const lightBase = {
  background: "#F5F7FA",
  surface: "#FFFFFF",
  surfaceAlt: "#EEF1F6",
  surfaceElevated: "#FFFFFF",
  border: "#E2E8F0",
  borderStrong: "#CBD5E1",
  textPrimary: "#15161F",
  textSecondary: "#33344A",
  textMuted: "#5A6B85",
  textFaint: "#94A3B8",
  textInverse: "#FFFFFF",
  accent: "#1A7A9E",
  accentSoft: "#E6F2F8",
  accentMuted: "#B8D9E8",
  gold: "#9A7209",
  goldSoft: "#FBF6E5",
  success: "#0F6B5B",
  successSoft: "#E3F0EC",
  danger: "#D63A3A",
  dangerSoft: "#FCEAEA",
  white: "#FFFFFF",
  black: "#000000",
  overlay: "rgba(0,0,0,0.45)",
};

function withAliases(base: typeof darkBase): ThemeColors {
  return {
    ...base,
    bg: base.background,
    card: base.surface,
    cardAlt: base.surfaceAlt,
    text: base.textPrimary,
    primary: base.success,
    primaryTint: base.successSoft,
    goldTint: base.goldSoft,
    dangerTint: base.dangerSoft,
  };
}

export const darkColors: ThemeColors = withAliases(darkBase);
export const lightColors: ThemeColors = withAliases(lightBase);

export function getColors(isDark: boolean): ThemeColors {
  return isDark ? darkColors : lightColors;
}
