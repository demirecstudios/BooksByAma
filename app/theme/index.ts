export {
  darkColors,
  getColors,
  lightColors,
  type ThemeColors,
} from "./colors";
export { radii, type Radii } from "./radii";
export { shadows, type Shadows } from "./shadows";
export { spacing, type Spacing } from "./spacing";
export {
  createTextStyles,
  fontFamilies,
  fontFamiliesFallback,
  type FontFamilies,
  type TextVariant,
} from "./typography";

import { getColors, type ThemeColors } from "./colors";
import { radii, type Radii } from "./radii";
import { shadows, type Shadows } from "./shadows";
import { spacing, type Spacing } from "./spacing";
import {
  createTextStyles,
  fontFamilies,
  type FontFamilies,
  type TextVariant,
} from "./typography";

export type Theme = {
  colors: ThemeColors;
  spacing: Spacing;
  radii: Radii;
  shadows: Shadows;
  fonts: FontFamilies;
  text: Record<TextVariant, import("react-native").TextStyle>;
  isDark: boolean;
};

export function createTheme(isDark: boolean, fontsLoaded: boolean): Theme {
  const colors = getColors(isDark);
  const fonts = fontsLoaded ? fontFamilies : fontFamilies;
  const text = createTextStyles(fonts, colors);

  if (!fontsLoaded) {
    for (const key of Object.keys(text) as TextVariant[]) {
      delete text[key].fontFamily;
    }
  }

  return {
    colors,
    spacing,
    radii,
    shadows,
    fonts,
    text,
    isDark,
  };
}
