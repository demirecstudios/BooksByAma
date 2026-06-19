import { Platform, ViewStyle } from "react-native";

type ShadowStyle = Pick<
  ViewStyle,
  "shadowColor" | "shadowOffset" | "shadowOpacity" | "shadowRadius" | "elevation"
>;

function makeShadow(
  color: string,
  offsetY: number,
  opacity: number,
  radius: number,
  elevation: number,
): ShadowStyle {
  return Platform.select({
    ios: {
      shadowColor: color,
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
    android: { elevation },
    default: {},
  }) as ShadowStyle;
}

export const shadows = {
  sm: makeShadow("#000", 1, 0.12, 3, 2),
  md: makeShadow("#000", 4, 0.18, 8, 4),
  lg: makeShadow("#000", 8, 0.22, 16, 8),
  accent: makeShadow("#2E86AB", 4, 0.35, 10, 6),
} as const;

export type Shadows = typeof shadows;
