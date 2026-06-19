// app/payment-methods.tsx

import { supabase } from "@/supabase"; // adjust to your supabase client path
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────

type Brand = "visa" | "mastercard" | "verve";

type Card = {
  id: string;
  brand: Brand;
  last4: string;
  expiry: string;
  is_default: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────

const BRAND_LABEL: Record<Brand, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  verve: "Verve",
};

const BRAND_COLOR: Record<Brand, string> = {
  visa: "#1A3A6B",
  mastercard: "#3B1A0A",
  verve: "#0D3B38",
};

const BRAND_ICON: Record<Brand, string> = {
  visa: "VISA",
  mastercard: "MC",
  verve: "VV",
};

// ─── Theme ────────────────────────────────────────────────────────────────

function useTheme() {
  const scheme = useColorScheme();
  const dark = scheme === "dark";
  return {
    bg: dark ? "#0A0A0F" : "#F5F5F7",
    card: dark ? "#12121A" : "#FFFFFF",
    cardAlt: dark ? "#1A1A28" : "#F0F0F5",
    border: dark ? "#1E1E2E" : "#E0E0E8",
    text: dark ? "#ECEEF5" : "#0A0A1A",
    textSecondary: dark ? "#9AA6C0" : "#5A6478",
    textMuted: dark ? "#5A6478" : "#9AA6C0",
    primary: "#22BFA0",
    primaryTint: dark ? "#0F2A26" : "#E0F7F3",
    danger: "#FF6B6B",
    dangerTint: dark ? "#2A1414" : "#FFF0F0",
    gold: "#E0C04A",
    input: dark ? "#1A1A28" : "#FFFFFF",
    inputBorder: dark ? "#2E2E44" : "#C8C8D8",
    statusBar: dark ? "light-content" : ("dark-content" as const),
  };
}

// ─── Utility ──────────────────────────────────────────────────────────────

function detectBrand(cardNumber: string): Brand {
  const n = cardNumber.replace(/\s/g, "");
  if (/^4/.test(n)) return "visa";
  if (/^5[1-5]/.test(n)) return "mastercard";
  return "verve";
}

function formatCardNumber(raw: string): string {
  return raw
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

// ─── Add Card Sheet ───────────────────────────────────────────────────────

type AddCardSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (card: Omit<Card, "id" | "is_default">) => Promise<void>;
  C: ReturnType<typeof useTheme>;
};

function AddCardSheet({ visible, onClose, onSave, C }: AddCardSheetProps) {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function reset() {
    setCardNumber("");
    setExpiry("");
    setCvv("");
    setName("");
    setErrors({});
    setSaving(false);
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    const digits = cardNumber.replace(/\s/g, "");
    if (digits.length < 13) e.cardNumber = "Enter a valid card number";
    const parts = expiry.split("/");
    const month = parseInt(parts[0], 10);
    const year = parseInt("20" + (parts[1] ?? ""), 10);
    const now = new Date();
    if (
      parts.length !== 2 ||
      isNaN(month) ||
      month < 1 ||
      month > 12 ||
      isNaN(year) ||
      year < now.getFullYear() ||
      (year === now.getFullYear() && month < now.getMonth() + 1)
    ) {
      e.expiry = "Enter a valid expiry date (MM/YY)";
    }
    if (cvv.length < 3) e.cvv = "Enter a valid CVV";
    if (name.trim().length < 2) e.name = "Enter the cardholder name";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    const digits = cardNumber.replace(/\s/g, "");
    try {
      await onSave({
        brand: detectBrand(digits),
        last4: digits.slice(-4),
        expiry,
      });
      reset();
      onClose();
    } catch {
      setSaving(false);
      Alert.alert("Error", "Could not save card. Please try again.");
    }
  }

  const s = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: C.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 36,
    },
    handle: {
      width: 36,
      height: 4,
      backgroundColor: C.border,
      borderRadius: 2,
      alignSelf: "center",
      marginBottom: 20,
    },
    title: {
      fontSize: 17,
      fontWeight: "800",
      color: C.text,
      marginBottom: 20,
    },
    label: {
      fontSize: 11,
      fontWeight: "700",
      color: C.textMuted,
      letterSpacing: 0.8,
      textTransform: "uppercase",
      marginBottom: 6,
      marginLeft: 2,
    },
    input: {
      backgroundColor: C.input,
      borderWidth: 1,
      borderColor: C.inputBorder,
      borderRadius: 12,
      padding: 13,
      fontSize: 15,
      color: C.text,
      marginBottom: 4,
    },
    inputError: { borderColor: C.danger },
    errorText: {
      fontSize: 12,
      color: C.danger,
      marginBottom: 10,
      marginLeft: 2,
    },
    row: { flexDirection: "row", gap: 12 },
    saveBtn: {
      backgroundColor: C.primary,
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: "center",
      marginTop: 10,
      opacity: saving ? 0.6 : 1,
    },
    saveBtnText: { fontSize: 15, fontWeight: "800", color: "#fff" },
    cancelBtn: { alignItems: "center", marginTop: 12, paddingVertical: 6 },
    cancelBtnText: { fontSize: 14, color: C.textSecondary },
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.title}>Add New Card</Text>

          <Text style={s.label}>Cardholder Name</Text>
          <TextInput
            style={[s.input, errors.name ? s.inputError : undefined]}
            placeholder="Full name on card"
            placeholderTextColor={C.textMuted}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            returnKeyType="next"
          />
          {errors.name && <Text style={s.errorText}>{errors.name}</Text>}

          <Text style={s.label}>Card Number</Text>
          <TextInput
            style={[s.input, errors.cardNumber ? s.inputError : undefined]}
            placeholder="0000 0000 0000 0000"
            placeholderTextColor={C.textMuted}
            value={cardNumber}
            onChangeText={(v) => setCardNumber(formatCardNumber(v))}
            keyboardType="numeric"
            returnKeyType="next"
          />
          {errors.cardNumber && (
            <Text style={s.errorText}>{errors.cardNumber}</Text>
          )}

          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Expiry</Text>
              <TextInput
                style={[s.input, errors.expiry ? s.inputError : undefined]}
                placeholder="MM/YY"
                placeholderTextColor={C.textMuted}
                value={expiry}
                onChangeText={(v) => setExpiry(formatExpiry(v))}
                keyboardType="numeric"
                maxLength={5}
                returnKeyType="next"
              />
              {errors.expiry && (
                <Text style={s.errorText}>{errors.expiry}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>CVV</Text>
              <TextInput
                style={[s.input, errors.cvv ? s.inputError : undefined]}
                placeholder="•••"
                placeholderTextColor={C.textMuted}
                value={cvv}
                onChangeText={(v) => setCvv(v.replace(/\D/g, "").slice(0, 4))}
                keyboardType="numeric"
                secureTextEntry
                maxLength={4}
                returnKeyType="done"
              />
              {errors.cvv && <Text style={s.errorText}>{errors.cvv}</Text>}
            </View>
          </View>

          <TouchableOpacity
            style={s.saveBtn}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Text style={s.saveBtnText}>
              {saving ? "Saving…" : "Save Card"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
            <Text style={s.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const C = useTheme();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);

  // ── Load cards from Supabase ──────────────────────────────────────────

  useEffect(() => {
    loadCards();
  }, []);

  async function loadCards() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("payment_cards")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      Alert.alert("Error", "Could not load your cards.");
    } else {
      setCards(data ?? []);
    }
    setLoading(false);
  }

  // ── Set default ───────────────────────────────────────────────────────

  async function handleSetDefault(id: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Unset all, then set the chosen one
    const { error: unsetErr } = await supabase
      .from("payment_cards")
      .update({ is_default: false })
      .eq("user_id", user.id);

    const { error: setErr } = await supabase
      .from("payment_cards")
      .update({ is_default: true })
      .eq("id", id);

    if (unsetErr || setErr) {
      Alert.alert("Error", "Could not update default card.");
      return;
    }

    setCards((prev) => prev.map((c) => ({ ...c, is_default: c.id === id })));
  }

  // ── Remove ────────────────────────────────────────────────────────────

  function handleRemove(id: string) {
    const card = cards.find((c) => c.id === id);
    if (!card) return;
    if (card.is_default) {
      Alert.alert(
        "Can't remove default",
        "Set another card as default before removing this one.",
      );
      return;
    }
    Alert.alert("Remove card", `Remove •••• ${card.last4}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("payment_cards")
            .delete()
            .eq("id", id);
          if (error) {
            Alert.alert("Error", "Could not remove card.");
            return;
          }
          setCards((prev) => prev.filter((c) => c.id !== id));
        },
      },
    ]);
  }

  // ── Add card ──────────────────────────────────────────────────────────

  async function handleSaveCard(newCard: Omit<Card, "id" | "is_default">) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in");

    const isFirst = cards.length === 0;

    const { data, error } = await supabase
      .from("payment_cards")
      .insert({
        user_id: user.id,
        brand: newCard.brand,
        last4: newCard.last4,
        expiry: newCard.expiry,
        is_default: isFirst,
      })
      .select()
      .single();

    if (error) throw error;

    setCards((prev) => [...prev, data]);
  }

  // ─── Render ───────────────────────────────────────────────────────────

  const styles = makeStyles(C);

  return (
    <View style={styles.root}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.bg} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Methods</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Saved Cards ── */}
        <Text style={styles.sectionLabel}>Saved Cards</Text>

        {loading ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Loading…</Text>
          </View>
        ) : cards.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>💳</Text>
            <Text style={styles.emptyTitle}>No cards saved yet</Text>
            <Text style={styles.emptyDesc}>
              Add a card to speed up checkout.
            </Text>
          </View>
        ) : (
          cards.map((card) => (
            <View key={card.id} style={styles.cardWrap}>
              {/* Visual card */}
              <View
                style={[
                  styles.cardVisual,
                  { backgroundColor: BRAND_COLOR[card.brand] },
                ]}
              >
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardBrandText}>
                    {BRAND_ICON[card.brand]}
                  </Text>
                  {card.is_default && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>★ Default</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardNumber}>
                  •••• •••• •••• {card.last4}
                </Text>
                <View style={styles.cardBottomRow}>
                  <View>
                    <Text style={styles.cardFieldLabel}>Expires</Text>
                    <Text style={styles.cardFieldValue}>{card.expiry}</Text>
                  </View>
                  <Text style={styles.cardBrandFull}>
                    {BRAND_LABEL[card.brand]}
                  </Text>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.cardActions}>
                {!card.is_default && (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    activeOpacity={0.75}
                    onPress={() => handleSetDefault(card.id)}
                  >
                    <Text style={styles.actionBtnText}>Set as Default</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnDanger]}
                  activeOpacity={0.75}
                  onPress={() => handleRemove(card.id)}
                >
                  <Text style={styles.actionBtnDangerText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* ── Add Card Button ── */}
        <TouchableOpacity
          style={styles.addBtn}
          activeOpacity={0.85}
          onPress={() => setShowAddSheet(true)}
        >
          <Text style={styles.addBtnText}>＋ Add New Card</Text>
        </TouchableOpacity>

        {/* ── Info note ── */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>🔒</Text>
          <Text style={styles.infoText}>
            Card details are encrypted and never stored on our servers. Payments
            are processed securely via our payment provider.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Add Card Sheet ── */}
      <AddCardSheet
        visible={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        onSave={handleSaveCard}
        C={C}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────

function makeStyles(C: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 56,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
      backgroundColor: C.bg,
    },
    backText: { color: C.primary, fontSize: 14, fontWeight: "600" },
    headerTitle: { fontSize: 16, fontWeight: "800", color: C.text },
    headerSpacer: { width: 50 },

    scroll: { padding: 20 },

    sectionLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: C.textMuted,
      letterSpacing: 1,
      textTransform: "uppercase",
      marginBottom: 14,
      marginLeft: 4,
    },

    // Card visual
    cardWrap: { marginBottom: 16 },
    cardVisual: {
      borderRadius: 18,
      padding: 20,
      marginBottom: 10,
      minHeight: 160,
      justifyContent: "space-between",
    },
    cardTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 24,
    },
    cardBrandText: {
      fontSize: 18,
      fontWeight: "800",
      color: "rgba(255,255,255,0.9)",
      letterSpacing: 1,
    },
    defaultBadge: {
      backgroundColor: "rgba(224,192,74,0.2)",
      borderWidth: 1,
      borderColor: "rgba(224,192,74,0.5)",
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    defaultBadgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: C.gold,
    },
    cardNumber: {
      fontSize: 17,
      fontWeight: "700",
      color: "rgba(255,255,255,0.85)",
      letterSpacing: 2,
      marginBottom: 16,
    },
    cardBottomRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
    },
    cardFieldLabel: {
      fontSize: 10,
      color: "rgba(255,255,255,0.5)",
      fontWeight: "600",
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    cardFieldValue: {
      fontSize: 14,
      fontWeight: "700",
      color: "rgba(255,255,255,0.9)",
    },
    cardBrandFull: {
      fontSize: 13,
      fontWeight: "800",
      color: "rgba(255,255,255,0.6)",
      letterSpacing: 1,
    },

    // Card actions
    cardActions: {
      flexDirection: "row",
      gap: 10,
    },
    actionBtn: {
      flex: 1,
      backgroundColor: C.cardAlt,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 12,
      paddingVertical: 11,
      alignItems: "center",
    },
    actionBtnText: {
      fontSize: 13,
      fontWeight: "700",
      color: C.primary,
    },
    actionBtnDanger: {
      backgroundColor: C.dangerTint,
      borderColor: C.danger,
    },
    actionBtnDangerText: {
      fontSize: 13,
      fontWeight: "700",
      color: C.danger,
    },

    // Empty state
    emptyCard: {
      backgroundColor: C.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: C.border,
      padding: 32,
      alignItems: "center",
      marginBottom: 16,
    },
    emptyIcon: { fontSize: 36, marginBottom: 12 },
    emptyTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: C.text,
      marginBottom: 6,
    },
    emptyDesc: {
      fontSize: 13,
      color: C.textMuted,
      textAlign: "center",
    },

    // Add button
    addBtn: {
      backgroundColor: C.primaryTint,
      borderWidth: 1,
      borderColor: C.primary,
      borderRadius: 16,
      paddingVertical: 15,
      alignItems: "center",
      marginBottom: 20,
    },
    addBtnText: {
      fontSize: 14,
      fontWeight: "800",
      color: C.primary,
    },

    // Info box
    infoBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 14,
      padding: 14,
      gap: 10,
    },
    infoIcon: { fontSize: 16, marginTop: 1 },
    infoText: {
      flex: 1,
      fontSize: 12,
      color: C.textMuted,
      lineHeight: 18,
    },
  });
}
