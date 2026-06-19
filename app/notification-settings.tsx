// app/notification-settings.tsx

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemeColors, useAppContext } from "./context/AppContext";

// ─── Types ────────────────────────────────────────────────────────────────

type NotifKey =
  | "push_enabled"
  | "email_enabled"
  | "weekly_digest"
  | "new_arrivals"
  | "order_updates"
  | "price_drops"
  | "reading_reminders";

type NotifState = Record<NotifKey, boolean>;

const STORAGE_KEY = "notif_settings";

const DEFAULT_STATE: NotifState = {
  push_enabled: true,
  email_enabled: true,
  weekly_digest: false,
  new_arrivals: true,
  order_updates: true,
  price_drops: false,
  reading_reminders: true,
};

// ─── Sections config ─────────────────────────────────────────────────────

type ToggleItem = {
  key: NotifKey;
  label: string;
  description: string;
  dependsOn?: NotifKey; // grayed out (and forced off) if this key is false
};

const SECTIONS: { title: string; items: ToggleItem[] }[] = [
  {
    title: "Channels",
    items: [
      {
        key: "push_enabled",
        label: "Push Notifications",
        description: "Receive alerts directly on your device",
      },
      {
        key: "email_enabled",
        label: "Email Notifications",
        description: "Get updates sent to your email address",
      },
    ],
  },
  {
    title: "Updates",
    items: [
      {
        key: "order_updates",
        label: "Order & Purchase Updates",
        description: "Receipts, delivery confirmations, and order status",
      },
      {
        key: "price_drops",
        label: "Price Drops",
        description: "Alert me when a wishlist item goes on sale",
        dependsOn: "push_enabled",
      },
      {
        key: "new_arrivals",
        label: "New Arrivals",
        description: "Books added that match your reading taste",
        dependsOn: "push_enabled",
      },
    ],
  },
  {
    title: "Engagement",
    items: [
      {
        key: "reading_reminders",
        label: "Reading Reminders",
        description: "Daily nudges to keep your streak going",
        dependsOn: "push_enabled",
      },
      {
        key: "weekly_digest",
        label: "Weekly Digest",
        description: "A summary of your reading progress every Sunday",
        dependsOn: "email_enabled",
      },
    ],
  },
];

// Notification-specific accent (kept separate from the global accent used on
// cart/checkout) plus a couple of warning colors that don't belong in the
// shared light/dark palette.
const PRIMARY = "#22BFA0";
const PRIMARY_TINT = "#0F2A26";
const WARNING_BG = "#2A1F0A";
const WARNING_BORDER = "#5C3D0A";
const WARNING_TEXT = "#E0A030";

// ─── Screen ───────────────────────────────────────────────────────────────

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppContext();
  const styles = createStyles(colors);
  const [settings, setSettings] = useState<NotifState>(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        setSettings({ ...DEFAULT_STATE, ...JSON.parse(raw) });
      }
    } catch (_) {
      // Fall back to defaults silently
    } finally {
      setLoaded(true);
    }
  }

  async function persist(next: NotifState) {
    setSettings(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (_) {}
  }

  async function toggle(key: NotifKey, value: boolean) {
    let next: NotifState = { ...settings, [key]: value };

    // If a channel (push/email) is turned off, also turn off anything that
    // depends on it so the UI and stored state stay consistent — a disabled
    // switch that's still "on" underneath would be confusing.
    if (!value) {
      for (const section of SECTIONS) {
        for (const item of section.items) {
          if (item.dependsOn === key) {
            next[item.key] = false;
          }
        }
      }
    }

    await persist(next);
  }

  // If push AND email are both off, warn the user gently via subtitle
  const allOff = !settings.push_enabled && !settings.email_enabled;

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Global off banner */}
        {loaded && allOff && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              ⚠️ All channels are off — you won't receive any notifications.
            </Text>
          </View>
        )}

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.card}>
              {section.items.map((item, idx) => {
                const isLast = idx === section.items.length - 1;
                const isDisabled =
                  item.dependsOn !== undefined && !settings[item.dependsOn];

                return (
                  <View
                    key={item.key}
                    style={[styles.row, isLast && styles.rowLast]}
                  >
                    <View style={styles.rowText}>
                      <Text
                        style={[
                          styles.rowLabel,
                          isDisabled && styles.rowLabelDim,
                        ]}
                      >
                        {item.label}
                      </Text>
                      <Text style={styles.rowDesc}>
                        {isDisabled
                          ? `Requires ${
                              item.dependsOn === "push_enabled"
                                ? "push notifications"
                                : "email notifications"
                            } to be on`
                          : item.description}
                      </Text>
                    </View>
                    <Switch
                      value={settings[item.key]}
                      onValueChange={(v) => toggle(item.key, v)}
                      disabled={isDisabled}
                      trackColor={{
                        false: colors.surfaceAlt,
                        true: PRIMARY_TINT,
                      }}
                      thumbColor={
                        settings[item.key] ? PRIMARY : colors.textFaint
                      }
                      ios_backgroundColor={colors.surfaceAlt}
                    />
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        <Text style={styles.footer}>
          Settings are saved automatically. System-level notification
          permissions can be managed in your device Settings app.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 56,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backText: { color: PRIMARY, fontSize: 14, fontWeight: "600" },
    headerTitle: { fontSize: 16, fontWeight: "800", color: colors.textPrimary },
    headerSpacer: { width: 50 },

    scroll: { padding: 20 },

    warningBanner: {
      backgroundColor: WARNING_BG,
      borderWidth: 1,
      borderColor: WARNING_BORDER,
      borderRadius: 12,
      padding: 14,
      marginBottom: 20,
    },
    warningText: {
      fontSize: 13,
      color: WARNING_TEXT,
      lineHeight: 19,
    },

    sectionWrap: { marginBottom: 24 },
    sectionTitle: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.textFaint,
      letterSpacing: 1,
      textTransform: "uppercase",
      marginBottom: 10,
      marginLeft: 4,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },

    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 12,
    },
    rowLast: { borderBottomWidth: 0 },
    rowText: { flex: 1 },
    rowLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: 3,
    },
    rowLabelDim: { color: colors.textFaint },
    rowDesc: {
      fontSize: 12,
      color: colors.textFaint,
      lineHeight: 17,
    },

    footer: {
      fontSize: 12,
      color: colors.textFaint,
      lineHeight: 18,
      textAlign: "center",
      paddingHorizontal: 16,
      marginTop: 4,
    },
  });
