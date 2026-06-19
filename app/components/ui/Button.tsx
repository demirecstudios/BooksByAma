import { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";
import { useTheme } from "../../hooks/useTheme";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "gold";
type ButtonSize = "md" | "sm";

type ButtonProps = Omit<PressableProps, "children"> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = true,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const { colors, radii, fonts } = theme;
  const isDisabled = disabled || loading;

  const variantStyles: Record<
    ButtonVariant,
    { container: ViewStyle; label: string }
  > = {
    primary: {
      container: { backgroundColor: colors.accent },
      label: colors.textInverse,
    },
    secondary: {
      container: { backgroundColor: colors.success },
      label: colors.white,
    },
    outline: {
      container: {
        backgroundColor: "transparent",
        borderWidth: 1,
        borderColor: colors.borderStrong,
      },
      label: colors.textPrimary,
    },
    ghost: {
      container: { backgroundColor: colors.surface },
      label: colors.textPrimary,
    },
    gold: {
      container: { backgroundColor: colors.gold },
      label: colors.textInverse,
    },
  };

  const { container, label } = variantStyles[variant];
  const paddingVertical = size === "sm" ? 10 : 16;
  const fontSize = size === "sm" ? 13 : 15;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        {
          borderRadius: radii.md,
          paddingVertical,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          width: fullWidth ? "100%" : undefined,
        },
        container,
        style as ViewStyle,
      ]}
      disabled={isDisabled}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={label} />
      ) : typeof children === "string" ? (
        <Text
          style={{
            color: label,
            fontSize,
            fontFamily: fonts.bodyExtraBold,
            fontWeight: "800",
            textAlign: "center",
            letterSpacing: 0.3,
          }}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
});
