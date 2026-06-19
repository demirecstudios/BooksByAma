import { StyleSheet, ViewStyle } from "react-native";
import { useAppContext } from "../context/AppContext";
import { Theme, createTheme } from "../theme";

export function useTheme(): Theme {
  const { isDark, fontsLoaded } = useAppContext();
  return createTheme(isDark, fontsLoaded);
}

/** Build StyleSheet from the active theme */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (theme: Theme) => T,
): T {
  const theme = useTheme();
  return StyleSheet.create(factory(theme));
}

export function useStatusBarStyle(): "light-content" | "dark-content" {
  const { isDark } = useAppContext();
  return isDark ? "light-content" : "dark-content";
}

/** Common screen shell styles */
export function screenRoot(theme: Theme): ViewStyle {
  return {
    flex: 1,
    backgroundColor: theme.colors.background,
  };
}
