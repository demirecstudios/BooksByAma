import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../supabase";
import { Button, ThemedText } from "./components/ui";
import { useStatusBarStyle, useTheme } from "./hooks/useTheme";

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const router = useRouter();
  const theme = useTheme();
  const statusBarStyle = useStatusBarStyle();
  const styles = useMemo(() => createStyles(theme), [theme]);

  function isEmail(value: string) {
    return value.includes("@");
  }

  async function resolveEmail(
    value: string,
  ): Promise<{ email: string | null; dbError: boolean }> {
    if (isEmail(value))
      return { email: value.trim().toLowerCase(), dbError: false };

    const { data, error } = await supabase
      .from("profiles")
      .select("email")
      .eq("username", value.trim().toLowerCase())
      .single();

    if (error && error.code !== "PGRST116") {
      return { email: null, dbError: true };
    }
    if (!data) return { email: null, dbError: false };
    return { email: data.email, dbError: false };
  }

  async function signIn() {
    if (!identifier.trim() || !password) {
      Alert.alert(
        "Missing Info",
        "Please enter your email or username and password.",
      );
      return;
    }

    setLoading(true);

    try {
      const { email, dbError } = await resolveEmail(identifier);

      if (dbError) {
        Alert.alert("Error", "Could not reach the database. Please try again.");
        setLoading(false);
        return;
      }
      if (!email) {
        Alert.alert(
          "Not Found",
          "No account found with that username. Please check and try again.",
        );
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        Alert.alert("Login Failed", error.message);
      } else if (data?.session) {
        router.replace("/bookstore");
      } else {
        Alert.alert(
          "Check Email",
          "No session returned. You may need to confirm your email first.",
        );
      }
    } catch (err) {
      Alert.alert("Unexpected Error", String(err));
    }

    setLoading(false);
  }

  async function forgotPassword() {
    if (!identifier.trim()) {
      Alert.alert(
        "Enter Email or Username",
        "Please enter your email or username above first.",
      );
      return;
    }

    setResetLoading(true);
    const { email, dbError } = await resolveEmail(identifier);

    if (dbError) {
      setResetLoading(false);
      Alert.alert("Error", "Could not reach the database. Please try again.");
      return;
    }
    if (!email) {
      setResetLoading(false);
      Alert.alert("Not Found", "No account found with that username.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "cnpbookstore://reset-password",
    });
    setResetLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setResetSent(true);
      Alert.alert(
        "Check Your Email",
        `A password reset link was sent to ${email}.`,
      );
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={theme.colors.background}
      />

      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoContainer}>
          <Image
            source={require("../assets/Logo_v3.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <ThemedText variant="label" color="gold" style={styles.tagline}>
            Children's Story Books
          </ThemedText>
        </View>

        <View style={styles.card}>
          <ThemedText variant="displayMedium">Welcome Back</ThemedText>
          <ThemedText variant="bodySmall" color="gold" style={styles.cardSub}>
            Sign in with your email or username
          </ThemedText>

          <View style={styles.inputWrapper}>
            <ThemedText variant="label" color="white">
              Email or Username
            </ThemedText>
            <TextInput
              style={styles.input}
              placeholder="you@example.com or ama_reads"
              placeholderTextColor={theme.colors.textFaint}
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType={isEmail(identifier) ? "email-address" : "default"}
            />
          </View>

          <View style={styles.inputWrapper}>
            <ThemedText variant="label" color="white">
              Password
            </ThemedText>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={theme.colors.textFaint}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={forgotPassword}
            disabled={resetLoading || resetSent}
          >
            <ThemedText variant="caption" color="gold" align="right">
              {resetSent
                ? "✓ Reset link sent"
                : resetLoading
                  ? "Sending..."
                  : "Forgot Password?"}
            </ThemedText>
          </TouchableOpacity>

          <Button onPress={signIn} loading={loading} disabled={loading}>
            {loading ? "Please wait..." : "Login"}
          </Button>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <ThemedText variant="label">OR</ThemedText>
            <View style={styles.dividerLine} />
          </View>

          <Button
            variant="outline"
            onPress={() => router.push("/register")}
            disabled={loading}
          >
            Register Here
          </Button>
        </View>

        <ThemedText variant="subtitle" align="center" style={styles.footerText}>
          CNP Bookstore · Magical Stories for Little Minds
        </ThemedText>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  const { colors, spacing, radii, fonts } = theme;

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    glowTop: {
      position: "absolute",
      top: -80,
      left: -80,
      width: 280,
      height: 280,
      borderRadius: 140,
      backgroundColor: colors.gold,
      opacity: 0.07,
    },
    glowBottom: {
      position: "absolute",
      bottom: -60,
      right: -60,
      width: 220,
      height: 220,
      borderRadius: 110,
      backgroundColor: colors.accent,
      opacity: 0.07,
    },
    scroll: {
      flexGrow: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing["2xl"],
      paddingVertical: spacing["5xl"],
    },
    logoContainer: { alignItems: "center", marginBottom: spacing["3xl"] },
    logoImage: { width: 160, height: 160 },
    tagline: { marginTop: spacing.xs },
    card: {
      width: "100%",
      backgroundColor: colors.surface,
      borderRadius: radii["2xl"],
      padding: spacing["2xl"],
      borderWidth: 1,
      borderColor: colors.accentMuted,
      gap: spacing.xs,
    },
    cardSub: { marginBottom: spacing.lg },
    inputWrapper: { marginBottom: spacing.lg },
    input: {
      width: "100%",
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.accentMuted,
      borderRadius: radii.md,
      padding: spacing.md + 2,
      fontSize: 15,
      fontFamily: fonts.body,
      color: colors.textPrimary,
      marginTop: spacing.xs + 2,
    },
    forgotBtn: {
      alignSelf: "flex-end",
      marginBottom: spacing.lg,
      marginTop: -spacing.sm,
    },
    divider: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: spacing.lg,
      gap: spacing.sm + 2,
    },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
    footerText: {
      marginTop: spacing["3xl"] - 4,
      letterSpacing: 0.5,
    },
  });
}
