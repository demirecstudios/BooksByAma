import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  Keyboard,
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

const COUNTRIES = [
  "Nigeria",
  "United States",
  "United Kingdom",
  "Canada",
  "Ghana",
  "South Africa",
  "Kenya",
  "Australia",
  "India",
  "Other",
];

export default function RegisterScreen() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [country, setCountry] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  function formatDob(text: string) {
    // Auto-format as DD/MM/YYYY
    const cleaned = text.replace(/\D/g, "");
    let formatted = cleaned;
    if (cleaned.length >= 3 && cleaned.length <= 4) {
      formatted = cleaned.slice(0, 2) + "/" + cleaned.slice(2);
    } else if (cleaned.length >= 5) {
      formatted =
        cleaned.slice(0, 2) +
        "/" +
        cleaned.slice(2, 4) +
        "/" +
        cleaned.slice(4, 8);
    }
    setDob(formatted);
  }

  function validateDob(value: string): string | null {
    // Must be exactly DD/MM/YYYY (10 chars after formatting)
    if (value.length < 10) return "Please enter a complete date (DD/MM/YYYY).";
    const [dd, mm, yyyy] = value.split("/").map(Number);
    if (!dd || !mm || !yyyy) return "Invalid date of birth.";
    if (mm < 1 || mm > 12) return "Month must be between 01 and 12.";
    if (dd < 1 || dd > 31) return "Day must be between 01 and 31.";
    const date = new Date(yyyy, mm - 1, dd);
    // JS Date will roll over invalid combos (e.g. 31 Feb → Mar 3)
    if (
      date.getFullYear() !== yyyy ||
      date.getMonth() !== mm - 1 ||
      date.getDate() !== dd
    ) {
      return "That date doesn't exist. Please check your date of birth.";
    }
    const now = new Date();
    if (date >= now) return "Date of birth must be in the past.";
    if (yyyy < 1900) return "Please enter a valid year (1900 or later).";
    return null;
  }

  async function checkUsernameAvailable(value: string): Promise<boolean> {
    const { data } = await supabase
      .from("profiles")
      .select("username")
      .eq("username", value.trim().toLowerCase())
      .maybeSingle();
    return !data; // true = available
  }

  function validate() {
    if (!fullName.trim()) return "Please enter your full name.";
    if (!username.trim()) return "Please enter a username.";
    if (username.trim().length < 3)
      return "Username must be at least 3 characters.";
    if (!phone.trim()) return "Please enter your phone number.";
    if (!dob.trim()) return "Please enter your date of birth.";
    const dobError = validateDob(dob.trim());
    if (dobError) return dobError;
    if (!country) return "Please select your country.";
    if (!email.trim()) return "Please enter your email.";
    if (!email.includes("@")) return "Please enter a valid email.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    if (password !== confirmPassword) return "Passwords do not match.";
    return null;
  }

  async function signUp() {
    const error = validate();
    if (error) {
      Alert.alert("Missing Info", error);
      return;
    }

    setLoading(true);

    try {
      // Check username is not already taken before creating the auth user
      const available = await checkUsernameAvailable(username);
      if (!available) {
        Alert.alert(
          "Username Taken",
          "That username is already in use. Please choose a different one.",
        );
        setLoading(false);
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            username: username.trim().toLowerCase(),
            phone: phone.trim(),
            date_of_birth: dob.trim(),
            country,
          },
        },
      });

      if (signUpError) {
        Alert.alert("Registration Failed", signUpError.message);
        setLoading(false);
        return;
      }

      if (data?.user && !data?.session) {
        Alert.alert(
          "Confirm Your Email",
          `A confirmation link was sent to ${email}. Please verify your email then log in.`,
          [{ text: "Go to Login", onPress: () => router.replace("/") }],
        );
        setLoading(false);
        return;
      }

      // Auto sign-in if no email confirmation needed
      router.replace("/bookstore");
    } catch (err) {
      Alert.alert("Unexpected Error", String(err));
    }

    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />

      {/* Background glow accents */}
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require("../assets/Logo_v3.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.tagline}>Children's Story Books</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create Account</Text>
          <Text style={styles.cardSub}>Join The AMA's Bookstore Today</Text>

          {/* Full Name */}
          <Field label="Full Name">
            <TextInput
              style={styles.input}
              placeholder="eg: Your name & Your Surname"
              placeholderTextColor="#2A2A3A"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </Field>

          {/* Username */}
          <Field label="Username">
            <TextInput
              style={styles.input}
              placeholder="e.g. ama_reads"
              placeholderTextColor="#2A2A3A"
              value={username}
              onChangeText={(t) =>
                setUsername(t.toLowerCase().replace(/\s/g, ""))
              }
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Field>

          {/* Phone */}
          <Field label="Phone Number">
            <TextInput
              style={styles.input}
              placeholder="+234 800 000 0000"
              placeholderTextColor="#2A2A3A"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </Field>

          {/* Date of Birth */}
          <Field label="Date of Birth">
            <TextInput
              style={styles.input}
              placeholder="DD/MM/YYYY"
              placeholderTextColor="#2A2A3A"
              value={dob}
              onChangeText={formatDob}
              keyboardType="number-pad"
              maxLength={10}
            />
          </Field>

          {/* Country */}
          <Field label="Country">
            <TouchableOpacity
              style={[styles.input, styles.pickerBtn]}
              onPress={() => {
                Keyboard.dismiss();
                setShowCountryPicker(!showCountryPicker);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={
                  country ? styles.pickerSelected : styles.pickerPlaceholder
                }
              >
                {country || "Select your country"}
              </Text>
              <Text style={styles.pickerChevron}>
                {showCountryPicker ? "▲" : "▼"}
              </Text>
            </TouchableOpacity>
            {showCountryPicker && (
              <ScrollView
                style={styles.dropdown}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
              >
                {COUNTRIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.dropdownItem,
                      country === c && styles.dropdownItemActive,
                    ]}
                    onPress={() => {
                      setCountry(c);
                      setShowCountryPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownText,
                        country === c && styles.dropdownTextActive,
                      ]}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </Field>

          {/* Divider */}
          <View style={styles.sectionDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.sectionLabel}>ACCOUNT CREDENTIALS</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email */}
          <Field label="Email Address">
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#2A2A3A"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
          </Field>

          {/* Password */}
          <Field label="Password">
            <TextInput
              style={styles.input}
              placeholder="Min. 6 characters"
              placeholderTextColor="#2A2A3A"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Field>

          {/* Confirm Password */}
          <Field label="Confirm Password">
            <TextInput
              style={[
                styles.input,
                confirmPassword.length > 0 &&
                  (password === confirmPassword
                    ? styles.inputValid
                    : styles.inputError),
              ]}
              placeholder="Re-enter password"
              placeholderTextColor="#2A2A3A"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            {confirmPassword.length > 0 && (
              <Text
                style={
                  password === confirmPassword
                    ? styles.matchText
                    : styles.noMatchText
                }
              >
                {password === confirmPassword
                  ? "✓ Passwords match"
                  : "✗ Passwords do not match"}
              </Text>
            )}
          </Field>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={signUp}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {loading ? "Creating Account..." : "Create Account"}
            </Text>
          </TouchableOpacity>

          {/* Back to login */}
          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.replace("/")}
          >
            <Text style={styles.loginLinkText}>
              Already have an account?{" "}
              <Text style={styles.loginLinkBold}>Login</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>
          CNP Bookstore · Magical stories for little minds
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Small helper wrapper for labelled fields
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.inputWrapper}>
      <Text style={styles.inputLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0F" },

  glowTop: {
    position: "absolute",
    top: -80,
    left: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#B8860B",
    opacity: 0.07,
  },
  glowBottom: {
    position: "absolute",
    bottom: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#2E86AB",
    opacity: 0.07,
  },

  scroll: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 48,
  },

  logoContainer: { alignItems: "center", marginBottom: 28 },
  logoImage: { width: 110, height: 110 },
  tagline: {
    fontSize: 11,
    color: "#B8860B",
    fontWeight: "600",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 6,
  },

  card: {
    width: "100%",
    backgroundColor: "#12121A",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#1E1E30",
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#E8E8FF",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  cardSub: { fontSize: 13, color: "#3A3A55", marginBottom: 24 },

  inputWrapper: { marginBottom: 16 },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    backgroundColor: "#0D0D14",
    borderWidth: 1,
    borderColor: "#1E1E30",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#E8E8FF",
  },
  inputValid: { borderColor: "#1A5C2E" },
  inputError: { borderColor: "#5C1A1A" },
  matchText: {
    fontSize: 11,
    color: "#2E8B57",
    marginTop: 4,
    fontWeight: "600",
  },
  noMatchText: {
    fontSize: 11,
    color: "#8B2E2E",
    marginTop: 4,
    fontWeight: "600",
  },

  // Country picker
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerPlaceholder: { color: "#999999", fontSize: 15 },
  pickerSelected: { color: "#E8E8FF", fontSize: 15 },
  pickerChevron: { color: "#004872", fontSize: 11 },
  dropdown: {
    backgroundColor: "#35383a",
    borderWidth: 1,
    borderColor: "#707070",
    borderRadius: 12,
    marginTop: 4,
    overflow: "hidden",
    maxHeight: 220,
  },
  dropdownItem: {
    padding: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A28",
  },
  dropdownItemActive: { backgroundColor: "#0D2233" },
  dropdownText: { color: "#ffffff", fontSize: 14 },
  dropdownTextActive: { color: "#B8860B", fontWeight: "700" },

  // Section divider
  sectionDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    gap: 10,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#1E1E30" },
  sectionLabel: {
    fontSize: 10,
    color: "#d4d4df",
    fontWeight: "700",
    letterSpacing: 1.5,
  },

  // Button
  button: {
    width: "100%",
    backgroundColor: "#0b95b8",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: {
    color: "#022338",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  loginLink: { alignItems: "center", paddingVertical: 4 },
  loginLinkText: { color: "#ffffff", fontSize: 18 },
  loginLinkBold: { color: "#B8860B", fontWeight: "700" },

  footerText: {
    marginTop: 28,
    fontSize: 11,
    color: "#ffffff",
    textAlign: "center",
    letterSpacing: 0.5,
  },
});
