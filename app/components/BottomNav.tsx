import { Ionicons } from "@expo/vector-icons";
import { useRouter, useSegments } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../hooks/useTheme";
import { useCart } from "../context/CartContext";

type TabRoute = "/bookstore" | "/cart" | "/profile";

type Tab = {
  label: string;
  route: TabRoute;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  badge?: number;
};

export default function BottomNav() {
  const router = useRouter();
  const segments = useSegments();
  const { itemCount } = useCart();
  const theme = useTheme();
  const { colors, spacing, radii, fonts } = theme;
  const current = "/" + (segments[0] || "");

  const TABS: Tab[] = [
    {
      label: "Books",
      route: "/bookstore",
      icon: "book-outline",
      iconActive: "book",
    },
    {
      label: "Cart",
      route: "/cart",
      icon: "cart-outline",
      iconActive: "cart",
      badge: itemCount,
    },
    {
      label: "Profile",
      route: "/profile",
      icon: "person-outline",
      iconActive: "person",
    },
  ];

  const styles = createStyles(colors, spacing, radii, fonts);

  return (
    <View style={styles.nav}>
      {TABS.map((tab) => {
        const active = current === tab.route;
        return (
          <TouchableOpacity
            key={tab.route}
            style={styles.tab}
            onPress={() => router.push(tab.route)}
            activeOpacity={0.7}
          >
            <View style={styles.iconWrap}>
              <Ionicons
                name={active ? tab.iconActive : tab.icon}
                size={22}
                color={active ? colors.accent : colors.textFaint}
              />
              {tab.badge ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{tab.badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, active && styles.labelActive]}>
              {tab.label}
            </Text>
            {active && <View style={styles.dot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useTheme>["colors"],
  spacing: ReturnType<typeof useTheme>["spacing"],
  radii: ReturnType<typeof useTheme>["radii"],
  fonts: ReturnType<typeof useTheme>["fonts"],
) {
  return StyleSheet.create({
    nav: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingBottom: spacing.lg,
      paddingTop: spacing.sm + 2,
    },
    tab: { flex: 1, alignItems: "center", gap: spacing.xs },
    iconWrap: { position: "relative" },
    badge: {
      position: "absolute",
      top: -4,
      right: -10,
      backgroundColor: colors.accent,
      borderRadius: radii.sm,
      minWidth: 16,
      height: 16,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 3,
    },
    badgeText: {
      color: colors.white,
      fontSize: 9,
      fontFamily: fonts.bodyExtraBold,
      fontWeight: "800",
    },
    label: {
      fontSize: 11,
      fontFamily: fonts.bodySemi,
      fontWeight: "600",
      color: colors.textFaint,
    },
    labelActive: { color: colors.accent },
    dot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.accent,
      marginTop: 2,
    },
  });
}
