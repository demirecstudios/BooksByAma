import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
    Alert,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useAppContext } from "./context/AppContext";

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
};

type C = typeof lightColors;

const CATEGORIES = [
  "Account Issue",
  "Payment Problem",
  "Download Error",
  "Book Not Found",
  "App Bug",
  "Other",
];

export default function ContactSupportScreen() {
  const router = useRouter();
  const { isDark } = useAppContext();
  const colors = isDark ? darkColors : lightColors;
  const styles = useMemo(() => createStyles(colors), [isDark]);

  const [category, setCategory] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!category) {
      Alert.alert("Missing info", "Please select a category.");
      return;
    }
    if (message.trim().length < 10) {
      Alert.alert("Missing info", "Please describe your issue in more detail.");
      return;
    }
    setSubmitting(true);
    // TODO: wire to real support API
    await new Promise((r) => setTimeout(r, 1200));
    setSubmitting(false);
    Alert.alert(
      "Message Sent ✓",
      "We've received your message and will respond within 24 hours.",
      [{ text: "OK", onPress: () => router.back() }],
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>💬</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>We're here to help</Text>
            <Text style={styles.infoSub}>
              Typical response time: under 24 hours
            </Text>
          </View>
        </View>

        {/* Category */}
        <Text style={styles.label}>What's the issue about?</Text>
        <View style={styles.categoriesWrap}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.categoryChip,
                category === c && styles.categoryChipActive,
              ]}
              activeOpacity={0.8}
              onPress={() => setCategory(c)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  category === c && styles.categoryChipTextActive,
                ]}
              >
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Message */}
        <Text style={styles.label}>Describe your issue</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Tell us what happened in detail…"
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          value={message}
          onChangeText={setMessage}
        />
        <Text style={styles.charCount}>{message.length} / 500</Text>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
          activeOpacity={0.85}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitBtnText}>
            {submitting ? "Sending…" : "Send Message"}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function createStyles(c: C) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
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
      alignItems: "center",
      justifyContent: "center",
    },
    backText: { fontSize: 32, color: c.primary, lineHeight: 36 },
    headerTitle: { fontSize: 17, fontWeight: "800", color: c.text },
    scroll: { paddingHorizontal: 20, paddingTop: 24 },
    infoCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
      gap: 14,
      marginBottom: 28,
    },
    infoIcon: { fontSize: 28 },
    infoTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: c.text,
      marginBottom: 2,
    },
    infoSub: { fontSize: 12, color: c.textMuted },
    label: { fontSize: 13, fontWeight: "700", color: c.text, marginBottom: 10 },
    categoriesWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 24,
    },
    categoryChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: c.cardAlt,
      borderWidth: 1,
      borderColor: c.border,
    },
    categoryChipActive: {
      backgroundColor: c.primaryTint,
      borderColor: c.primary,
    },
    categoryChipText: {
      fontSize: 13,
      fontWeight: "600",
      color: c.textSecondary,
    },
    categoryChipTextActive: { color: c.primary },
    textArea: {
      backgroundColor: c.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
      fontSize: 14,
      color: c.text,
      minHeight: 140,
      marginBottom: 6,
    },
    charCount: {
      fontSize: 11,
      color: c.textMuted,
      textAlign: "right",
      marginBottom: 24,
    },
    submitBtn: {
      backgroundColor: c.primary,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: "center",
    },
    submitBtnText: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
  });
}
