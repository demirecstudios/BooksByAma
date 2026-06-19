import { ReactNode } from "react";
import { Pressable, PressableProps, View, ViewStyle } from "react-native";
import { useTheme } from "../../hooks/useTheme";

type CardProps = Omit<PressableProps, "style"> & {
  children: ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  padded?: boolean;
};

export default function Card({
  children,
  style,
  elevated = false,
  padded = true,
  onPress,
  ...rest
}: CardProps) {
  const theme = useTheme();
  const { colors, radii, shadows, spacing } = theme;

  const cardStyle: ViewStyle = {
    backgroundColor: elevated ? colors.surfaceElevated : colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: padded ? spacing.lg : 0,
    ...(elevated ? shadows.sm : null),
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          cardStyle,
          pressed ? { opacity: 0.85 } : null,
          style,
        ]}
        {...rest}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={[cardStyle, style]} {...rest}>
      {children}
    </View>
  );
}
