// Suggested location: app/edit-profile.tsx

import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

export default function EditProfileScreen() {
  const router = useRouter();
  const { colors, isDark, reloadUser } = useAppContext();
  const styles = createStyles(colors);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      Alert.alert("Error", "Could not load your profile.");
      router.back();
      return;
    }
    const user = data.user;
    setEmail(user.email || "");
    setFullName((user.user_metadata?.full_name as string) || "");
    setUsername((user.user_metadata?.username as string) || "");
    setLoading(false);
  }

  async function handleSave() {
    if (!fullName.trim()) {
      Alert.alert("Missing Name", "Please enter your full name.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: fullName.trim(),
        username: username.trim(),
      },
    });

    if (error) {
      setSaving(false);
      Alert.alert("Error", error.message);
      return;
    }

    // Refresh the shared profile (display name, handle, avatar initial) so
    // other screens like the profile tab reflect these changes immediately.
    await reloadUser();
    setSaving(false);

    Alert.alert("Profile Updated", "Your changes have been saved.", [
      { text: "OK", onPress: () => router.back() },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          backgroundColor={colors.background}
        />
        <ActivityIndicator size="large" color="#22BFA0" />
      </View>
    );
  }

  const avatarLetter = (fullName || username || email || "?")
    .charAt(0)
    .toUpperCase();

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
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarLetter}</Text>
          </View>
        </View>

        <Text style={styles.fieldLabel}>Full Name</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Your full name"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="words"
        />

        <Text style={styles.fieldLabel}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="username"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.fieldLabel}>Email</Text>
        <View style={styles.inputDisabled}>
          <Text style={styles.disabledText}>{email}</Text>
        </View>
        <Text style={styles.hint}>
          Email changes require verification and aren't supported here yet.
        </Text>

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Text style={styles.saveBtnText}>
            {saving ? "Saving..." : "💾 Save Changes"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    center: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
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
    avatarWrap: { alignItems: "center", marginBottom: 28 },
    avatar: {
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: "#22BFA0",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "#E0C04A",
    },
    avatarText: { fontSize: 32, fontWeight: "800", color: "#0A0A0F" },
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
    inputDisabled: {
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
    },
    disabledText: { color: colors.textMuted, fontSize: 15 },
    hint: {
      fontSize: 12,
      color: colors.textFaint,
      lineHeight: 18,
      marginBottom: 28,
    },
    saveBtn: {
      backgroundColor: "#1A6B3A",
      padding: 16,
      borderRadius: 14,
      alignItems: "center",
    },
    saveBtnText: { color: colors.white, fontSize: 15, fontWeight: "800" },
  });
