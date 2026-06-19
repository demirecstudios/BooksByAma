import { useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../../supabase";

export default function NotificationsTab() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  async function sendToAll() {
    if (!title.trim() || !body.trim()) {
      Alert.alert("Missing Info", "Please enter both a title and message.");
      return;
    }

    setSending(true);

    try {
      const { data: tokens, error } = await supabase
        .from("push_tokens")
        .select("token");

      if (error) {
        Alert.alert("Error", "Could not fetch push tokens.");
        setSending(false);
        return;
      }

      if (!tokens || tokens.length === 0) {
        Alert.alert("No Users", "No push tokens found.");
        setSending(false);
        return;
      }

      const messages = tokens.map((t) => ({
        to: t.token,
        sound: "default",
        title: title.trim(),
        body: body.trim(),
      }));

      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(messages),
      });

      const result = await response.json();
      console.log("Push result:", result);

      Alert.alert(
        "Sent! 🎉",
        `Notification sent to ${tokens.length} user${tokens.length > 1 ? "s" : ""}.`,
      );

      setTitle("");
      setBody("");
    } catch (err) {
      Alert.alert("Error", String(err));
    }

    setSending(false);
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.sectionTitle}>SEND PUSH NOTIFICATION</Text>

      <View style={styles.card}>
        <Text style={styles.label}>TITLE</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. New Book Available!"
          placeholderTextColor="#334455"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>MESSAGE</Text>
        <TextInput
          style={[styles.input, styles.inputMulti]}
          placeholder="e.g. Check out our latest book in the store..."
          placeholderTextColor="#334455"
          value={body}
          onChangeText={setBody}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
          onPress={sendToAll}
          disabled={sending}
        >
          <Text style={styles.sendBtnText}>
            {sending ? "Sending..." : "🔔 Send to All Users"}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>
        This will send a push notification to all users who have logged into the
        app.
      </Text>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2E86AB",
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#12121A",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1E1E30",
    padding: 20,
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#0D0D14",
    borderWidth: 1,
    borderColor: "#1E1E30",
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: "#E8E8FF",
    marginBottom: 16,
  },
  inputMulti: {
    height: 100,
  },
  sendBtn: {
    backgroundColor: "#2E86AB",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 4,
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  hint: {
    fontSize: 12,
    color: "#445566",
    textAlign: "center",
    lineHeight: 18,
  },
});
