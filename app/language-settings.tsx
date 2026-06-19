import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ─── Storage key ─────────────────────────────────────────────────────────
const LANGUAGE_KEY = "@app:language";

// ─── Theme (mirrors profile.tsx) ─────────────────────────────────────────

const lightColors = {
  bg: "#F8F9FA",
  card: "#FFFFFF",
  cardAlt: "#F1F3F5",
  border: "#E8EAED",
  text: "#222222",
  textSecondary: "#5C6670",
  textMuted: "#9AA5B1",
  primary: "#0F6B5B",
  primaryTint: "#E3F0EC",
  gold: "#D4AF37",
  goldTint: "#FBF6E5",
  danger: "#E0554F",
  dangerTint: "#FCEAE9",
};

const darkColors = {
  bg: "#0A0A0F",
  card: "#12121A",
  cardAlt: "#1A1A28",
  border: "#1E1E2E",
  text: "#ECEEF5",
  textSecondary: "#9AA6C0",
  textMuted: "#5A6478",
  primary: "#22BFA0",
  primaryTint: "#0F2A26",
  gold: "#E0C04A",
  goldTint: "#2A2410",
  danger: "#FF6B6B",
  dangerTint: "#2A1414",
};

type ThemeColors = typeof lightColors;

// ─── Data ─────────────────────────────────────────────────────────────────

type Language = {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
};

type Region = {
  title: string;
  languages: Language[];
};

const REGIONS: Region[] = [
  {
    title: "West Africa",
    languages: [
      {
        code: "en-NG",
        name: "English (Nigeria)",
        nativeName: "English",
        flag: "🇳🇬",
      },
      { code: "yo", name: "Yorùbá", nativeName: "Yorùbá", flag: "🇳🇬" },
      { code: "ig", name: "Igbo", nativeName: "Igbo", flag: "🇳🇬" },
      { code: "ha", name: "Hausa", nativeName: "Hausa", flag: "🇳🇬" },
      {
        code: "fr-SN",
        name: "French (Senegal)",
        nativeName: "Français",
        flag: "🇸🇳",
      },
      {
        code: "en-GH",
        name: "English (Ghana)",
        nativeName: "English",
        flag: "🇬🇭",
      },
    ],
  },
  {
    title: "East & Southern Africa",
    languages: [
      { code: "sw", name: "Swahili", nativeName: "Kiswahili", flag: "🇰🇪" },
      { code: "am", name: "Amharic", nativeName: "አማርኛ", flag: "🇪🇹" },
      {
        code: "en-ZA",
        name: "English (South Africa)",
        nativeName: "English",
        flag: "🇿🇦",
      },
      { code: "zu", name: "Zulu", nativeName: "isiZulu", flag: "🇿🇦" },
    ],
  },
  {
    title: "Global",
    languages: [
      { code: "en", name: "English", nativeName: "English", flag: "🌐" },
      { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
      { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦" },
      { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇵🇹" },
    ],
  },
];

const ALL_LANGUAGES = REGIONS.flatMap((r) => r.languages);
const DEFAULT_CODE = "en-NG";

// ─── Screen ───────────────────────────────────────────────────────────────

export default function LanguageSettingsScreen() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(true);
  const colors = isDark ? darkColors : lightColors;
  const styles = useMemo(() => createStyles(colors), [isDark]);

  // loading = true while we read AsyncStorage on mount
  const [loading, setLoading] = useState(true);
  const [selectedCode, setSelectedCode] = useState(DEFAULT_CODE);
  // pendingCode tracks what the user has tapped but not yet saved
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // ── Load persisted language on mount ─────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_KEY)
      .then((stored) => {
        if (stored) setSelectedCode(stored);
      })
      .finally(() => setLoading(false));
  }, []);

  // ── User taps a language row ──────────────────────────────────────────
  function handleSelect(code: string) {
    setPendingCode(code);
    setSaved(false);
  }

  // ── User taps Apply ──────────────────────────────────────────────────
  async function handleSave() {
    const codeToSave = pendingCode ?? selectedCode;
    await AsyncStorage.setItem(LANGUAGE_KEY, codeToSave);
    setSelectedCode(codeToSave);
    setPendingCode(null);
    setSaved(true);
  }

  // The code shown highlighted in the list:
  // pendingCode while user is choosing, selectedCode once saved
  const activeCode = pendingCode ?? selectedCode;

  const activeLang =
    ALL_LANGUAGES.find((l) => l.code === activeCode) ??
    ALL_LANGUAGES.find((l) => l.code === DEFAULT_CODE)!;

  const hasUnsavedChange = pendingCode !== null && pendingCode !== selectedCode;

  // ── Render ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.bg}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Language</Text>
        <TouchableOpacity
          style={styles.themeToggle}
          onPress={() => setIsDark((d) => !d)}
        >
          <Text style={styles.themeToggleText}>{isDark ? "☀️" : "🌙"}</Text>
        </TouchableOpacity>
      </View>

      {/* Summary bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryLeft}>
          <Text style={styles.summaryFlag}>{activeLang.flag}</Text>
          <View>
            <Text style={styles.summaryLabel}>
              {hasUnsavedChange ? "Unsaved selection" : "Current language"}
            </Text>
            <Text style={styles.summaryName}>{activeLang.name}</Text>
          </View>
        </View>

        {saved && !hasUnsavedChange ? (
          <View style={styles.savedPill}>
            <Text style={styles.savedPillText}>✓ Saved</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.saveBtn,
              !hasUnsavedChange && styles.saveBtnDisabled,
            ]}
            activeOpacity={hasUnsavedChange ? 0.85 : 1}
            onPress={hasUnsavedChange ? handleSave : undefined}
          >
            <Text style={styles.saveBtnText}>Apply</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {REGIONS.map((region) => (
          <View key={region.title}>
            <Text style={styles.regionTitle}>{region.title}</Text>

            <View style={styles.listCard}>
              {region.languages.map((lang, idx) => {
                const isActive = lang.code === activeCode;
                const isSavedActive =
                  lang.code === selectedCode && !hasUnsavedChange;
                const isLast = idx === region.languages.length - 1;

                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.row,
                      isLast && styles.rowLast,
                      isActive && styles.rowSelected,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => handleSelect(lang.code)}
                  >
                    <View style={styles.flagWrap}>
                      <Text style={styles.flag}>{lang.flag}</Text>
                    </View>

                    <View style={styles.rowNames}>
                      <Text
                        style={[
                          styles.rowName,
                          isActive && styles.rowNameSelected,
                        ]}
                      >
                        {lang.name}
                      </Text>
                      {lang.nativeName !== lang.name && (
                        <Text style={styles.rowNative}>{lang.nativeName}</Text>
                      )}
                    </View>

                    {isActive ? (
                      <View
                        style={[
                          styles.checkCircle,
                          !isSavedActive && styles.checkCirclePending,
                        ]}
                      >
                        <Text style={styles.checkMark}>
                          {isSavedActive ? "✓" : "●"}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.emptyCircle} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {/* Note */}
        <View style={styles.noteCard}>
          <Text style={styles.noteIcon}>💡</Text>
          <Text style={styles.noteText}>
            Changing your language updates the app interface. Book content stays
            in its original language unless a translation is available.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    centered: { alignItems: "center", justifyContent: "center" },

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 56,
      paddingBottom: 16,
      backgroundColor: c.bg,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.cardAlt,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    backBtnText: {
      fontSize: 24,
      color: c.text,
      lineHeight: 28,
      fontWeight: "600",
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: c.text,
      letterSpacing: -0.3,
    },
    themeToggle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.cardAlt,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    themeToggleText: { fontSize: 17 },

    summaryBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: c.primaryTint,
      borderBottomWidth: 1,
      borderBottomColor: c.primary,
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    summaryLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    summaryFlag: { fontSize: 26 },
    summaryLabel: {
      fontSize: 11,
      color: c.primary,
      fontWeight: "600",
      marginBottom: 1,
    },
    summaryName: {
      fontSize: 14,
      fontWeight: "800",
      color: c.text,
    },
    saveBtn: {
      backgroundColor: c.primary,
      borderRadius: 10,
      paddingHorizontal: 18,
      paddingVertical: 8,
    },
    saveBtnDisabled: {
      opacity: 0.4,
    },
    saveBtnText: {
      fontSize: 13,
      fontWeight: "800",
      color: "#FFFFFF",
    },
    savedPill: {
      backgroundColor: c.primaryTint,
      borderWidth: 1,
      borderColor: c.primary,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 7,
    },
    savedPillText: {
      fontSize: 13,
      fontWeight: "800",
      color: c.primary,
    },

    scroll: { padding: 20 },

    regionTitle: {
      fontSize: 12,
      fontWeight: "700",
      color: c.textMuted,
      letterSpacing: 0.6,
      textTransform: "uppercase",
      marginBottom: 10,
      marginTop: 8,
    },

    listCard: {
      backgroundColor: c.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
      marginBottom: 20,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    rowLast: { borderBottomWidth: 0 },
    rowSelected: { backgroundColor: c.primaryTint },

    flagWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: c.cardAlt,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    flag: { fontSize: 18 },

    rowNames: { flex: 1 },
    rowName: {
      fontSize: 14,
      fontWeight: "600",
      color: c.text,
      marginBottom: 1,
    },
    rowNameSelected: {
      fontWeight: "800",
      color: c.primary,
    },
    rowNative: {
      fontSize: 12,
      color: c.textMuted,
      fontWeight: "500",
    },

    checkCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    checkCirclePending: {
      backgroundColor: c.gold, // gold dot = selected but not yet saved
    },
    checkMark: {
      fontSize: 13,
      color: "#FFFFFF",
      fontWeight: "800",
    },
    emptyCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: c.border,
    },

    noteCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      backgroundColor: c.cardAlt,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
    },
    noteIcon: { fontSize: 16, marginTop: 1 },
    noteText: {
      flex: 1,
      fontSize: 12,
      color: c.textMuted,
      lineHeight: 18,
      fontWeight: "500",
    },
  });
}
