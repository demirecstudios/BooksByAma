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
  danger: "#FF6B6B",
  dangerTint: "#2A1414",
};

type C = typeof lightColors;

const PROBLEM_TYPES = [
  { icon: "💥", label: "App Crash" },
  { icon: "🐌", label: "Slow Performance" },
  { icon: "🖼️", label: "Display Issue" },
  { icon: "🔗", label: "Broken Link" },
  { icon: "🔐", label: "Login Problem" },
  { icon: "💳", label: "Payment Error" },
  { icon: "📖", label: "Content Error" },
  { icon: "🔧", label: "Other" },
];

const SEVERITY = [
  { label: "Low", desc: "Minor annoyance" },
  { label: "Medium", desc: "Affects usage" },
  { label: "High", desc: "Blocks me completely" },
];

export default function ReportProblemScreen() {
  const router = useRouter();
  const { isDark } = useAppContext();
  const colors = isDark ? darkColors : lightColors;
  const styles = useMemo(() => createStyles(colors), [isDark]);

  const [problemType, setProblemType] = useState<string | null>(null);
  const [severity, setSeverity] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!problemType) {
      Alert.alert("Missing info", "Please select a problem type.");
      return;
    }
    if (!severity) {
      Alert.alert("Missing info", "Please select a severity level.");
      return;
    }
    if (description.trim().length < 10) {
      Alert.alert(
        "Missing info",
        "Please describe the problem in more detail.",
      );
      return;
    }
    setSubmitting(true);
    // TODO: wire to real bug reporting API
    await new Promise((r) => setTimeout(r, 1200));
    setSubmitting(false);
    Alert.alert(
      "Report Submitted ✓",
      "Thank you for helping us improve CNP. We'll look into this shortly.",
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
        <Text style={styles.headerTitle}>Report a Problem</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>🚩</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Help us fix it</Text>
            <Text style={styles.infoSub}>
              Your report is anonymous and goes directly to our engineering
              team.
            </Text>
          </View>
        </View>

        {/* Problem type */}
        <Text style={styles.label}>Problem Type</Text>
        <View style={styles.typesGrid}>
          {PROBLEM_TYPES.map((t) => (
            <TouchableOpacity
              key={t.label}
              style={[
                styles.typeCard,
                problemType === t.label && styles.typeCardActive,
              ]}
              activeOpacity={0.8}
              onPress={() => setProblemType(t.label)}
            >
              <Text style={styles.typeIcon}>{t.icon}</Text>
              <Text
                style={[
                  styles.typeLabel,
                  problemType === t.label && styles.typeLabelActive,
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Severity */}
        <Text style={styles.label}>Severity</Text>
        <View style={styles.severityRow}>
          {SEVERITY.map((s) => (
            <TouchableOpacity
              key={s.label}
              style={[
                styles.severityCard,
                severity === s.label && styles.severityCardActive,
              ]}
              activeOpacity={0.8}
              onPress={() => setSeverity(s.label)}
            >
              <Text
                style={[
                  styles.severityLabel,
                  severity === s.label && styles.severityLabelActive,
                ]}
              >
                {s.label}
              </Text>
              <Text style={styles.severityDesc}>{s.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        <Text style={styles.label}>Describe the problem</Text>
        <TextInput
          style={styles.textArea}
          placeholder="What happened? What were you doing when it occurred?"
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          value={description}
          onChangeText={setDescription}
        />

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
          activeOpacity={0.85}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitBtnText}>
            {submitting ? "Submitting…" : "Submit Report"}
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
      alignItems: "flex-start",
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
      marginBottom: 4,
    },
    infoSub: { fontSize: 12, color: c.textMuted, lineHeight: 18 },
    label: { fontSize: 13, fontWeight: "700", color: c.text, marginBottom: 10 },
    typesGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 24,
    },
    typeCard: {
      width: "22%",
      alignItems: "center",
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: 12,
      paddingHorizontal: 4,
    },
    typeCardActive: { backgroundColor: c.primaryTint, borderColor: c.primary },
    typeIcon: { fontSize: 20, marginBottom: 6 },
    typeLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: c.textSecondary,
      textAlign: "center",
    },
    typeLabelActive: { color: c.primary },
    severityRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
    severityCard: {
      flex: 1,
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      alignItems: "center",
    },
    severityCardActive: {
      backgroundColor: c.primaryTint,
      borderColor: c.primary,
    },
    severityLabel: {
      fontSize: 13,
      fontWeight: "800",
      color: c.text,
      marginBottom: 4,
    },
    severityLabelActive: { color: c.primary },
    severityDesc: { fontSize: 10, color: c.textMuted, textAlign: "center" },
    textArea: {
      backgroundColor: c.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
      fontSize: 14,
      color: c.text,
      minHeight: 120,
      marginBottom: 24,
    },
    submitBtn: {
      backgroundColor: c.danger,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: "center",
    },
    submitBtnText: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
  });
}
