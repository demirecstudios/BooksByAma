import { ReactNode } from "react";
import { Text, TextProps, TextStyle } from "react-native";
import { useTheme } from "../../hooks/useTheme";
import { TextVariant } from "../../theme";

type ThemedTextProps = TextProps & {
  variant?: TextVariant;
  color?: keyof import("../../theme").ThemeColors | string;
  align?: TextStyle["textAlign"];
};

export default function ThemedText({
  variant = "body",
  color,
  align,
  style,
  children,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();
  const base = theme.text[variant];
  const colorValue =
    color && color in theme.colors
      ? theme.colors[color as keyof typeof theme.colors]
      : color;

  return (
    <Text
      style={[
        base,
        colorValue ? { color: colorValue } : null,
        align ? { textAlign: align } : null,
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}
