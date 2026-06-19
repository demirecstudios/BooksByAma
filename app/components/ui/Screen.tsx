import { ReactNode } from "react";
import { ScrollView, ScrollViewProps, StatusBar, View, ViewProps } from "react-native";
import { useStatusBarStyle, useTheme } from "../../hooks/useTheme";

type ScreenProps = ViewProps & {
  children: ReactNode;
  scroll?: boolean;
  scrollProps?: ScrollViewProps;
  padded?: boolean;
  statusBar?: boolean;
};

export default function Screen({
  children,
  scroll = false,
  scrollProps,
  padded = false,
  statusBar = true,
  style,
  ...rest
}: ScreenProps) {
  const theme = useTheme();
  const barStyle = useStatusBarStyle();
  const padding = padded ? theme.spacing.screen : undefined;

  const content = scroll ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        padded ? { paddingHorizontal: theme.spacing.screen } : null,
        scrollProps?.contentContainerStyle,
      ]}
      {...scrollProps}
    >
      {children}
    </ScrollView>
  ) : (
    children
  );

  return (
    <View
      style={[{ flex: 1, backgroundColor: theme.colors.background }, style]}
      {...rest}
    >
      {statusBar && (
        <StatusBar
          barStyle={barStyle}
          backgroundColor={theme.colors.background}
        />
      )}
      {scroll ? (
        content
      ) : (
        <View style={[{ flex: 1 }, padding ? { paddingHorizontal: padding } : null]}>
          {content}
        </View>
      )}
    </View>
  );
}
