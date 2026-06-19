import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
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

const FAQS = [
  {
    category: "Account",
    items: [
      {
        q: "How do I reset my password?",
        a: "Go to Profile → Change Password. Enter your current password and your new one, then tap Save.",
      },
      {
        q: "Can I use CNP on multiple devices?",
        a: "Yes. Sign in with the same account on any device and your library syncs automatically.",
      },
      {
        q: "How do I delete my account?",
        a: "Contact our support team and we'll process your request within 7 business days.",
      },
    ],
  },
  {
    category: "Purchases",
    items: [
      {
        q: "How do I get a refund?",
        a: "Refunds are available within 7 days of purchase if you haven't read more than 10% of the book.",
      },
      {
        q: "Where are my purchased books?",
        a: "They appear in My Library → Purchased Books. They stay in your library permanently.",
      },
      {
        q: "Can I gift a book to someone?",
        a: "Yes. On any book page tap the gift icon, enter the recipient's email, and complete checkout.",
      },
    ],
  },
  {
    category: "Reading",
    items: [
      {
        q: "Can I read offline?",
        a: "Yes. Download any book from your library while connected, then read it anytime offline.",
      },
      {
        q: "How do I change the font size?",
        a: "While reading, tap the centre of the screen to reveal controls. Tap Aa to adjust font size and style.",
      },
      {
        q: "Does CNP support audiobooks?",
        a: "Yes. Audiobooks are available in My Library → Audiobooks with speed controls and a sleep timer.",
      },
    ],
  },
];

export default function FAQsScreen() {
  const router = useRouter();
  const { isDark } = useAppContext();
  const colors = isDark ? darkColors : lightColors;
  const styles = useMemo(() => createStyles(colors), [isDark]);

  const [openItem, setOpenItem] = useState<string | null>(null);

  function toggle(key: string) {
    setOpenItem((prev) => (prev === key ? null : key));
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
        <Text style={styles.headerTitle}>FAQs</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {FAQS.map((section) => (
          <View key={section.category} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.category}</Text>
            <View style={styles.card}>
              {section.items.map((item, idx) => {
                const key = `${section.category}-${idx}`;
                const isOpen = openItem === key;
                return (
                  <View key={key}>
                    <TouchableOpacity
                      style={[
                        styles.faqRow,
                        idx === section.items.length - 1 &&
                          !isOpen &&
                          styles.faqRowLast,
                      ]}
                      activeOpacity={0.7}
                      onPress={() => toggle(key)}
                    >
                      <Text style={styles.faqQ}>{item.q}</Text>
                      <Text
                        style={[
                          styles.faqChevron,
                          isOpen && styles.faqChevronOpen,
                        ]}
                      >
                        ›
                      </Text>
                    </TouchableOpacity>
                    {isOpen && (
                      <View
                        style={[
                          styles.faqAnswer,
                          idx === section.items.length - 1 &&
                            styles.faqAnswerLast,
                        ]}
                      >
                        <Text style={styles.faqAnswerText}>{item.a}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        ))}

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
    section: { marginBottom: 28 },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "800",
      color: c.text,
      marginBottom: 10,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
    },
    faqRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    faqRowLast: { borderBottomWidth: 0 },
    faqQ: { flex: 1, fontSize: 14, fontWeight: "600", color: c.text },
    faqChevron: {
      fontSize: 20,
      color: c.textMuted,
      fontWeight: "700",
      transform: [{ rotate: "0deg" }],
    },
    faqChevronOpen: { transform: [{ rotate: "90deg" }] },
    faqAnswer: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: c.cardAlt,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    faqAnswerLast: { borderBottomWidth: 0 },
    faqAnswerText: { fontSize: 13, color: c.textSecondary, lineHeight: 20 },
  });
}
