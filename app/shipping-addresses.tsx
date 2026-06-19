import { supabase } from "@/supabase";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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

// ─── Types ────────────────────────────────────────────────────────────────

type Address = {
  id: string;
  label: string; // "Home", "Work", "Other"
  recipientName: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

const LABEL_OPTIONS = ["Home", "Work", "School", "Other"] as const;
type LabelOption = (typeof LABEL_OPTIONS)[number];

// ─── Seed data ───────────────────────────────────────────────────────────

const SEED_ADDRESSES: Address[] = [
  {
    id: "1",
    label: "Home",
    recipientName: "Reader",
    line1: "12 Adeola Odeku Street",
    line2: "Flat 4B",
    city: "Lagos",
    state: "Lagos",
    postalCode: "101233",
    country: "Nigeria",
    isDefault: true,
  },
  {
    id: "2",
    label: "Work",
    recipientName: "Reader",
    line1: "Plot 7, Ring Road",
    city: "Ibadan",
    state: "Oyo",
    postalCode: "200285",
    country: "Nigeria",
    isDefault: false,
  },
];

// ─── Label icon map ───────────────────────────────────────────────────────

const LABEL_ICONS: Record<string, string> = {
  Home: "🏠",
  Work: "💼",
  School: "🎓",
  Other: "📍",
};

const EMPTY_FORM: Omit<Address, "id" | "isDefault"> = {
  label: "Home",
  recipientName: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "Nigeria",
};

// ─── Screen ───────────────────────────────────────────────────────────────

export default function ShippingAddressesScreen() {
  const router = useRouter();

  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = isDark ? darkColors : lightColors;
  const styles = useMemo(() => createStyles(colors), [isDark]);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] =
    useState<Omit<Address, "id" | "isDefault">>(EMPTY_FORM);

  // ── Load from Supabase ────────────────────────────────────────────────

  useEffect(() => {
    loadAddresses();
  }, []);

  async function loadAddresses() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("shipping_addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      Alert.alert("Error", "Could not load your addresses.");
    } else {
      // Map snake_case DB fields to camelCase
      setAddresses(
        (data ?? []).map((row: any) => ({
          id: row.id,
          label: row.label,
          recipientName: row.recipient_name,
          line1: row.line1,
          line2: row.line2 ?? "",
          city: row.city,
          state: row.state,
          postalCode: row.postal_code,
          country: row.country,
          isDefault: row.is_default,
        })),
      );
    }
    setLoading(false);
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  function openNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  }

  function openEdit(addr: Address) {
    setEditingId(addr.id);
    setForm({
      label: addr.label,
      recipientName: addr.recipientName,
      line1: addr.line1,
      line2: addr.line2 ?? "",
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      country: addr.country,
    });
    setModalVisible(true);
  }

  async function handleSave() {
    const required: (keyof typeof form)[] = [
      "recipientName",
      "line1",
      "city",
      "state",
      "postalCode",
      "country",
    ];
    for (const field of required) {
      if (!form[field]?.trim()) {
        Alert.alert(
          "Missing field",
          `Please fill in ${field
            .replace(/([A-Z])/g, " $1")
            .toLowerCase()
            .trim()}.`,
        );
        return;
      }
    }

    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const payload = {
      user_id: user.id,
      label: form.label,
      recipient_name: form.recipientName,
      line1: form.line1,
      line2: form.line2 || null,
      city: form.city,
      state: form.state,
      postal_code: form.postalCode,
      country: form.country,
    };

    if (editingId) {
      const { error } = await supabase
        .from("shipping_addresses")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        Alert.alert("Error", "Could not update address.");
        setSaving(false);
        return;
      }
      setAddresses((prev) =>
        prev.map((a) => (a.id === editingId ? { ...a, ...form } : a)),
      );
    } else {
      const isFirst = addresses.length === 0;
      const { data, error } = await supabase
        .from("shipping_addresses")
        .insert({ ...payload, is_default: isFirst })
        .select()
        .single();

      if (error) {
        Alert.alert("Error", "Could not save address.");
        setSaving(false);
        return;
      }
      setAddresses((prev) => [
        ...prev,
        {
          id: data.id,
          label: data.label,
          recipientName: data.recipient_name,
          line1: data.line1,
          line2: data.line2 ?? "",
          city: data.city,
          state: data.state,
          postalCode: data.postal_code,
          country: data.country,
          isDefault: data.is_default,
        },
      ]);
    }

    setSaving(false);
    setModalVisible(false);
  }

  async function handleSetDefault(id: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("shipping_addresses")
      .update({ is_default: false })
      .eq("user_id", user.id);

    const { error } = await supabase
      .from("shipping_addresses")
      .update({ is_default: true })
      .eq("id", id);

    if (error) {
      Alert.alert("Error", "Could not update default address.");
      return;
    }
    setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
  }

  async function handleDelete(id: string) {
    const target = addresses.find((a) => a.id === id);
    Alert.alert("Remove address", `Remove "${target?.label}" address?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("shipping_addresses")
            .delete()
            .eq("id", id);

          if (error) {
            Alert.alert("Error", "Could not remove address.");
            return;
          }
          setAddresses((prev) => {
            const remaining = prev.filter((a) => a.id !== id);
            if (target?.isDefault && remaining.length > 0) {
              // Promote the first remaining address to default in DB too
              supabase
                .from("shipping_addresses")
                .update({ is_default: true })
                .eq("id", remaining[0].id);
              remaining[0].isDefault = true;
            }
            return remaining;
          });
        },
      },
    ]);
  }

  // ── Render ───────────────────────────────────────────────────────────

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
        <Text style={styles.headerTitle}>Shipping Addresses</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Address cards */}
        {loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Loading…</Text>
          </View>
        ) : addresses.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>No saved addresses</Text>
            <Text style={styles.emptySubtitle}>
              Add an address so your books arrive at the right door.
            </Text>
          </View>
        ) : (
          addresses.map((addr) => (
            <AddressCard
              key={addr.id}
              address={addr}
              styles={styles}
              colors={colors}
              onEdit={() => openEdit(addr)}
              onDelete={() => handleDelete(addr.id)}
              onSetDefault={() => handleSetDefault(addr.id)}
            />
          ))
        )}

        {/* Add new button */}
        <TouchableOpacity
          style={styles.addBtn}
          activeOpacity={0.85}
          onPress={openNew}
        >
          <Text style={styles.addBtnIcon}>＋</Text>
          <Text style={styles.addBtnText}>Add New Address</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add / Edit modal */}
      <AddressModal
        visible={modalVisible}
        isEditing={editingId !== null}
        saving={saving}
        form={form}
        onChange={(field, value) => setForm((f) => ({ ...f, [field]: value }))}
        onSave={handleSave}
        onClose={() => setModalVisible(false)}
        styles={styles}
        colors={colors}
      />
    </View>
  );
}

// ─── Address Card ─────────────────────────────────────────────────────────

function AddressCard({
  address,
  styles,
  colors,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  address: Address;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  const icon = LABEL_ICONS[address.label] ?? "📍";

  const line2Part = address.line2 ? `, ${address.line2}` : "";
  const fullAddress = `${address.line1}${line2Part}, ${address.city}, ${address.state} ${address.postalCode}, ${address.country}`;

  return (
    <View style={[styles.card, address.isDefault && styles.cardDefault]}>
      {/* Top row */}
      <View style={styles.cardTopRow}>
        <View style={styles.cardLabelWrap}>
          <View style={styles.cardIconWrap}>
            <Text style={styles.cardIcon}>{icon}</Text>
          </View>
          <View>
            <Text style={styles.cardLabel}>{address.label}</Text>
            <Text style={styles.cardRecipient}>{address.recipientName}</Text>
          </View>
        </View>
        {address.isDefault && (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultBadgeText}>Default</Text>
          </View>
        )}
      </View>

      {/* Address text */}
      <Text style={styles.cardAddress}>{fullAddress}</Text>

      {/* Actions */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.cardActionBtn}
          onPress={onEdit}
          activeOpacity={0.75}
        >
          <Text style={styles.cardActionBtnText}>✏️ Edit</Text>
        </TouchableOpacity>

        {!address.isDefault && (
          <TouchableOpacity
            style={styles.cardActionBtn}
            onPress={onSetDefault}
            activeOpacity={0.75}
          >
            <Text style={styles.cardActionBtnText}>⭐ Set default</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.cardActionBtn, styles.cardActionBtnDanger]}
          onPress={onDelete}
          activeOpacity={0.75}
        >
          <Text style={styles.cardActionBtnDangerText}>🗑 Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────

function AddressModal({
  visible,
  isEditing,
  saving,
  form,
  onChange,
  onSave,
  onClose,
  styles,
  colors,
}: {
  visible: boolean;
  isEditing: boolean;
  saving: boolean;
  form: Omit<Address, "id" | "isDefault">;
  onChange: (field: keyof typeof form, value: string) => void;
  onSave: () => void;
  onClose: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.bg }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Modal header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
            <Text style={styles.modalCloseBtnText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {isEditing ? "Edit Address" : "New Address"}
          </Text>
          <TouchableOpacity onPress={onSave} style={styles.modalSaveBtn}>
            <Text style={styles.modalSaveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.modalScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Label picker */}
          <Text style={styles.fieldLabel}>Address label</Text>
          <View style={styles.labelPicker}>
            {LABEL_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.labelChip,
                  form.label === opt && styles.labelChipActive,
                ]}
                onPress={() => onChange("label", opt)}
                activeOpacity={0.8}
              >
                <Text style={styles.labelChipIcon}>{LABEL_ICONS[opt]}</Text>
                <Text
                  style={[
                    styles.labelChipText,
                    form.label === opt && styles.labelChipTextActive,
                  ]}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Fields */}
          <FormField
            label="Recipient name"
            value={form.recipientName}
            placeholder="Full name"
            onChangeText={(v) => onChange("recipientName", v)}
            styles={styles}
            colors={colors}
          />
          <FormField
            label="Address line 1"
            value={form.line1}
            placeholder="Street address, P.O. box"
            onChangeText={(v) => onChange("line1", v)}
            styles={styles}
            colors={colors}
          />
          <FormField
            label="Address line 2 (optional)"
            value={form.line2 ?? ""}
            placeholder="Apartment, suite, floor"
            onChangeText={(v) => onChange("line2", v)}
            styles={styles}
            colors={colors}
          />

          <View style={styles.fieldRow}>
            <View style={{ flex: 1 }}>
              <FormField
                label="City"
                value={form.city}
                placeholder="City"
                onChangeText={(v) => onChange("city", v)}
                styles={styles}
                colors={colors}
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <FormField
                label="State"
                value={form.state}
                placeholder="State"
                onChangeText={(v) => onChange("state", v)}
                styles={styles}
                colors={colors}
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <View style={{ flex: 1 }}>
              <FormField
                label="Postal code"
                value={form.postalCode}
                placeholder="000000"
                keyboardType="number-pad"
                onChangeText={(v) => onChange("postalCode", v)}
                styles={styles}
                colors={colors}
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <FormField
                label="Country"
                value={form.country}
                placeholder="Country"
                onChangeText={(v) => onChange("country", v)}
                styles={styles}
                colors={colors}
              />
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── FormField helper ─────────────────────────────────────────────────────

function FormField({
  label,
  value,
  placeholder,
  onChangeText,
  keyboardType,
  styles,
  colors,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (v: string) => void;
  keyboardType?: "default" | "number-pad" | "email-address";
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType ?? "default"}
        autoCorrect={false}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },

    // Header
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

    scroll: { padding: 20 },

    // Address card
    card: {
      backgroundColor: c.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
      marginBottom: 14,
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    cardDefault: {
      borderColor: c.primary,
      borderWidth: 1.5,
    },
    cardTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 10,
    },
    cardLabelWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    cardIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: c.primaryTint,
      alignItems: "center",
      justifyContent: "center",
    },
    cardIcon: { fontSize: 18 },
    cardLabel: {
      fontSize: 14,
      fontWeight: "800",
      color: c.text,
      marginBottom: 1,
    },
    cardRecipient: {
      fontSize: 12,
      color: c.textSecondary,
      fontWeight: "500",
    },
    defaultBadge: {
      backgroundColor: c.primaryTint,
      borderWidth: 1,
      borderColor: c.primary,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    defaultBadgeText: {
      fontSize: 11,
      fontWeight: "800",
      color: c.primary,
    },
    cardAddress: {
      fontSize: 13,
      color: c.textSecondary,
      lineHeight: 19,
      marginBottom: 14,
    },
    cardActions: {
      flexDirection: "row",
      gap: 8,
      flexWrap: "wrap",
    },
    cardActionBtn: {
      backgroundColor: c.cardAlt,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    cardActionBtnText: {
      fontSize: 12,
      fontWeight: "700",
      color: c.text,
    },
    cardActionBtnDanger: {
      backgroundColor: c.dangerTint,
      borderColor: c.danger,
    },
    cardActionBtnDangerText: {
      fontSize: 12,
      fontWeight: "700",
      color: c.danger,
    },

    // Empty state
    emptyState: {
      alignItems: "center",
      paddingVertical: 60,
      paddingHorizontal: 40,
    },
    emptyIcon: { fontSize: 52, marginBottom: 16 },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: c.text,
      marginBottom: 8,
      textAlign: "center",
    },
    emptySubtitle: {
      fontSize: 13,
      color: c.textMuted,
      textAlign: "center",
      lineHeight: 19,
    },

    // Add button
    addBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: c.primary,
      borderRadius: 16,
      paddingVertical: 16,
      marginTop: 4,
    },
    addBtnIcon: {
      fontSize: 18,
      color: "#FFFFFF",
      fontWeight: "800",
      lineHeight: 22,
    },
    addBtnText: {
      fontSize: 15,
      fontWeight: "800",
      color: "#FFFFFF",
      letterSpacing: 0.3,
    },

    // Modal
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: Platform.OS === "ios" ? 20 : 28,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      backgroundColor: c.bg,
    },
    modalCloseBtn: { paddingHorizontal: 4, paddingVertical: 4 },
    modalCloseBtnText: {
      fontSize: 15,
      color: c.textSecondary,
      fontWeight: "600",
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: c.text,
      letterSpacing: -0.2,
    },
    modalSaveBtn: {
      backgroundColor: c.primary,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 7,
    },
    modalSaveBtnText: {
      fontSize: 14,
      fontWeight: "800",
      color: "#FFFFFF",
    },
    modalScroll: { padding: 20 },

    // Label picker chips
    labelPicker: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 20,
      flexWrap: "wrap",
    },
    labelChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: c.cardAlt,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    labelChipActive: {
      backgroundColor: c.primaryTint,
      borderColor: c.primary,
    },
    labelChipIcon: { fontSize: 14 },
    labelChipText: {
      fontSize: 13,
      fontWeight: "700",
      color: c.textSecondary,
    },
    labelChipTextActive: { color: c.primary },

    // Form fields
    fieldRow: { flexDirection: "row" },
    fieldWrap: { marginBottom: 16 },
    fieldLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: c.textMuted,
      marginBottom: 8,
      letterSpacing: 0.4,
      textTransform: "uppercase",
    },
    fieldInput: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 14,
      color: c.text,
      fontWeight: "500",
    },
  });
}
