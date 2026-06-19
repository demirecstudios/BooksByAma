// Suggested location: app/change-password.tsx

import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../supabase";
import { ThemeColors, useAppContext } from "./context/AppContext";

const MIN_PASSWORD_LENGTH = 6;

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { colors, isDark, reloadUser } = useAppContext();
  const styles = createStyles(colors);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  function validate(): string | null {
    if (!newPassword || !confirmPassword) {
      return "Please fill in both fields.";
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (newPassword !== confirmPassword) {
      return "Passwords do not match.";
    }
    return null;
  }

  async function handleSave() {
    const validationError = validate();
    if (validationError) {
      Alert.alert("Check Your Input", validationError);
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setSaving(false);
      Alert.alert("Error", error.message);
      return;
    }

    // Refresh shared user/profile state so the rest of the app reflects the
    // latest auth session, consistent with other screens that mutate the
    // account.
    await reloadUser();
    setSaving(false);

    Alert.alert("Password Updated", "Your password has been changed.", [
      { text: "OK", onPress: () => router.back() },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.lockWrap}>
          <Text style={styles.lockEmoji}>🔒</Text>
        </View>

        <Text style={styles.intro}>
          Choose a new password. You'll stay signed in on this device after
          saving.
        </Text>

        <Text style={styles.fieldLabel}>New Password</Text>
        <TextInput
          style={styles.input}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="At least 6 characters"
          placeholderTextColor={colors.textFaint}
          secureTextEntry
          autoCapitalize="none"
        />

        <Text style={styles.fieldLabel}>Confirm New Password</Text>
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Re-enter new password"
          placeholderTextColor={colors.textFaint}
          secureTextEntry
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Text style={styles.saveBtnText}>
            {saving ? "Updating..." : "🔒 Update Password"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

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
    backText: { color: colors.accent, fontSize: 14, fontWeight: "600" },
    headerTitle: { fontSize: 16, fontWeight: "800", color: colors.textPrimary },
    headerSpacer: { width: 50 },
    scroll: { padding: 24 },
    lockWrap: { alignItems: "center", marginBottom: 16 },
    lockEmoji: { fontSize: 48 },
    intro: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 28,
    },
    fieldLabel: {
      fontSize: 11,
      color: colors.textFaint,
      fontWeight: "700",
      letterSpacing: 1,
      textTransform: "uppercase",
      marginBottom: 8,
      marginTop: 4,
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
      color: colors.textPrimary,
      fontSize: 15,
      marginBottom: 18,
    },
    saveBtn: {
      backgroundColor: "#1A6B3A",
      padding: 16,
      borderRadius: 14,
      alignItems: "center",
      marginTop: 8,
    },
    saveBtnText: { color: colors.white, fontSize: 15, fontWeight: "800" },
  });
