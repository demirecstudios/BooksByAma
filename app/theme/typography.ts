import { TextStyle } from "react-native";

/** Font family names — loaded in app/_layout.tsx via @expo-google-fonts */
export const fontFamilies = {
  display: "Fraunces_700Bold",
  displaySemi: "Fraunces_600SemiBold",
  body: "Nunito_400Regular",
  bodySemi: "Nunito_600SemiBold",
  bodyBold: "Nunito_700Bold",
  bodyExtraBold: "Nunito_800ExtraBold",
} as const;

/** System fallbacks when custom fonts are still loading */
export const fontFamiliesFallback = {
  display: undefined,
  displaySemi: undefined,
  body: undefined,
  bodySemi: undefined,
  bodyBold: undefined,
  bodyExtraBold: undefined,
} as const;

export type FontFamilies = typeof fontFamilies;

export type TextVariant =
  | "displayLarge"
  | "displayMedium"
  | "title"
  | "subtitle"
  | "body"
  | "bodySmall"
  | "label"
  | "caption"
  | "button";

export function createTextStyles(
  fonts: FontFamilies,
  colors: { textPrimary: string; textSecondary: string; textMuted: string; accent: string },
): Record<TextVariant, TextStyle> {
  return {
    displayLarge: {
      fontFamily: fonts.display,
      fontSize: 28,
      lineHeight: 34,
      fontWeight: "700",
      color: colors.textPrimary,
      letterSpacing: -0.5,
    },
    displayMedium: {
      fontFamily: fonts.displaySemi,
      fontSize: 22,
      lineHeight: 28,
      fontWeight: "600",
      color: colors.textPrimary,
      letterSpacing: -0.3,
    },
    title: {
      fontFamily: fonts.bodyExtraBold,
      fontSize: 17,
      lineHeight: 22,
      fontWeight: "800",
      color: colors.textPrimary,
      letterSpacing: -0.2,
    },
    subtitle: {
      fontFamily: fonts.bodySemi,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    body: {
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 24,
      fontWeight: "400",
      color: colors.textSecondary,
    },
    bodySmall: {
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 20,
      fontWeight: "400",
      color: colors.textMuted,
    },
    label: {
      fontFamily: fonts.bodyBold,
      fontSize: 11,
      lineHeight: 14,
      fontWeight: "700",
      color: colors.textMuted,
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    caption: {
      fontFamily: fonts.bodySemi,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: "600",
      color: colors.textMuted,
    },
    button: {
      fontFamily: fonts.bodyExtraBold,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: "800",
      letterSpacing: 0.3,
    },
  };
}
