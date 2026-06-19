import { useRouter } from "expo-router";
import { useMemo } from "react";
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
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

const TOPICS = [
  {
    icon: "📖",
    title: "Getting Started",
    desc: "Learn the basics of using CNP.",
  },
  {
    icon: "🛍️",
    title: "Purchasing Books",
    desc: "How to buy, gift, and redeem books.",
  },
  {
    icon: "⬇️",
    title: "Downloads & Offline",
    desc: "Read without an internet connection.",
  },
  {
    icon: "🔐",
    title: "Account & Security",
    desc: "Manage your login and privacy settings.",
  },
  {
    icon: "💳",
    title: "Billing & Payments",
    desc: "Invoices, refunds, and payment methods.",
  },
  {
    icon: "🎧",
    title: "Audiobooks",
    desc: "Playing, speed controls, and sleep timer.",
  },
  {
    icon: "🌐",
    title: "Language & Region",
    desc: "Change your app language or region.",
  },
  {
    icon: "📱",
    title: "App & Device Issues",
    desc: "Troubleshoot crashes or display problems.",
  },
];

export default function HelpCenterScreen() {
  const router = useRouter();
  const { isDark } = useAppContext();
  const colors = isDark ? darkColors : lightColors;
  const styles = useMemo(() => createStyles(colors), [isDark]);

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
        <Text style={styles.headerTitle}>Help Center</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>🔍</Text>
          <Text style={styles.heroTitle}>How can we help?</Text>
          <Text style={styles.heroSub}>
            Browse topics below or contact support directly.
          </Text>
        </View>

        {/* Topics */}
        <Text style={styles.sectionTitle}>Browse Topics</Text>
        <View style={styles.topicsGrid}>
          {TOPICS.map((t) => (
            <TouchableOpacity
              key={t.title}
              style={styles.topicCard}
              activeOpacity={0.8}
            >
              <Text style={styles.topicIcon}>{t.icon}</Text>
              <Text style={styles.topicTitle}>{t.title}</Text>
              <Text style={styles.topicDesc}>{t.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Still need help */}
        <View style={styles.ctaCard}>
          <Text style={styles.ctaTitle}>Still need help?</Text>
          <Text style={styles.ctaSub}>
            Our support team is ready to assist you.
          </Text>
          <TouchableOpacity
            style={styles.ctaBtn}
            activeOpacity={0.85}
            onPress={() => router.push("/contact-support")}
          >
            <Text style={styles.ctaBtnText}>Contact Support</Text>
          </TouchableOpacity>
        </View>

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
    hero: {
      alignItems: "center",
      backgroundColor: c.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.border,
      padding: 28,
      marginBottom: 28,
    },
    heroIcon: { fontSize: 40, marginBottom: 12 },
    heroTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: c.text,
      marginBottom: 6,
    },
    heroSub: { fontSize: 13, color: c.textSecondary, textAlign: "center" },
    sectionTitle: {
      fontSize: 15,
      fontWeight: "800",
      color: c.text,
      marginBottom: 14,
    },
    topicsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      marginBottom: 28,
    },
    topicCard: {
      width: "47%",
      backgroundColor: c.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
    },
    topicIcon: { fontSize: 22, marginBottom: 8 },
    topicTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: c.text,
      marginBottom: 4,
    },
    topicDesc: { fontSize: 11, color: c.textMuted, lineHeight: 16 },
    ctaCard: {
      backgroundColor: c.primaryTint,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.primary,
      padding: 24,
      alignItems: "center",
    },
    ctaTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: c.text,
      marginBottom: 6,
    },
    ctaSub: {
      fontSize: 13,
      color: c.textSecondary,
      marginBottom: 16,
      textAlign: "center",
    },
    ctaBtn: {
      backgroundColor: c.primary,
      borderRadius: 14,
      paddingHorizontal: 28,
      paddingVertical: 12,
    },
    ctaBtnText: { fontSize: 14, fontWeight: "800", color: "#FFFFFF" },
  });
}
