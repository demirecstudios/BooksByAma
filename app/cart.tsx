import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { supabase } from "../supabase";
import BottomNav from "./components/BottomNav";
import { ThemeColors, useAppContext } from "./context/AppContext";
import { useCart } from "./context/CartContext";

// Paystack public key comes from the environment so it isn't hardcoded in
// source. Add EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY to your .env (see .env.example).
const PAYSTACK_PUBLIC_KEY = process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY ?? "";

if (__DEV__ && !PAYSTACK_PUBLIC_KEY) {
  console.warn(
    "EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY is not set — checkout will not work until it is configured in your .env file.",
  );
}

type PendingPurchase = {
  reference: string;
  rows: {
    user_id: string;
    book_id: string;
    book_title: string;
    book_author: string;
    book_color: string;
    book_category: string;
    price: number;
    purchased_at: string;
  }[];
};

export default function CartScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppContext();
  const styles = createStyles(colors);
  const { cart, updateQuantity, removeFromCart, clearCart, itemCount, total } =
    useCart();

  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showPaystack, setShowPaystack] = useState(false);
  // Set when a payment has been confirmed by Paystack but we failed to save
  // the order to Supabase. The cart is preserved so the user can retry
  // without losing the items, and we surface the reference for support.
  const [pendingPurchase, setPendingPurchase] =
    useState<PendingPurchase | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data?.user?.email ?? null);
    });
  }, []);

  function handleCheckout() {
    if (cart.length === 0) return;
    if (!PAYSTACK_PUBLIC_KEY) {
      Alert.alert(
        "Checkout unavailable",
        "Payments aren't configured yet. Please try again later.",
      );
      return;
    }
    if (!userEmail) {
      Alert.alert(
        "Error",
        "Could not find your account email. Please log in again.",
      );
      return;
    }
    setShowPaystack(true);
  }

  async function handlePaystackSuccess(reference: string) {
    setShowPaystack(false);
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      // 1. Verify payment
      const { data, error } = await supabase.functions.invoke("hyper-action", {
        body: { reference },
      });

      if (error) {
        console.error("Verification request failed:", error);
        Alert.alert(
          "Couldn't verify payment",
          `We couldn't reach our server to confirm this payment. If you were charged, please contact support with reference ${reference} and we'll sort it out.`,
        );
        return;
      }

      if (!data?.success) {
        console.error("Verification response:", data);
        Alert.alert(
          "Payment not confirmed",
          `We couldn't confirm this payment went through. If you were charged, please contact support with reference ${reference}.`,
        );
        return;
      }

      // 2. Save each cart item to purchases table
      const purchaseRows: PendingPurchase["rows"] = cart.map((item) => ({
        user_id: user.id,
        book_id: item.id,
        book_title: item.title,
        book_author: item.author || "Unknown",
        book_color: item.color,
        book_category: item.category,
        price: item.price,
        purchased_at: new Date().toISOString(),
      }));

      const { error: purchaseError } = await supabase
        .from("purchases")
        .insert(purchaseRows);

      if (purchaseError) {
        console.error("Failed to save purchases:", purchaseError);
        // Don't clear the cart — keep the items and the verified reference
        // so the user can retry saving the order without paying again.
        setPendingPurchase({ reference, rows: purchaseRows });
        Alert.alert(
          "Payment received",
          `Your payment went through (ref ${reference}), but we couldn't record your order yet. Tap "Retry order" on the cart screen, or contact support with this reference if it keeps failing.`,
        );
        return;
      }

      // 3. Clear cart and confirm
      setPendingPurchase(null);
      clearCart();
      Alert.alert("🎉 Success", "Purchase complete! Enjoy your books.");
      router.push("/bookstore");
    } catch (err) {
      console.error(err);
      Alert.alert(
        "Error",
        "Something went wrong while confirming your payment.",
      );
    } finally {
      setLoading(false);
    }
  }

  // Retries saving an already-confirmed payment that previously failed to
  // write to the purchases table.
  async function retrySavePurchase() {
    if (!pendingPurchase) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("purchases")
        .insert(pendingPurchase.rows);

      if (error) {
        console.error("Retry failed to save purchases:", error);
        Alert.alert(
          "Still couldn't save order",
          `We still couldn't record your order. Please contact support with reference ${pendingPurchase.reference}.`,
        );
        return;
      }

      const reference = pendingPurchase.reference;
      setPendingPurchase(null);
      clearCart();
      Alert.alert("🎉 Success", "Purchase recorded! Enjoy your books.");
      console.log("Recovered order for reference", reference);
      router.push("/bookstore");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Build the Paystack inline HTML page
  const paystackHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: ${colors.background}; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
        #loader { color: ${colors.accent}; font-family: sans-serif; font-size: 16px; text-align: center; }
      </style>
    </head>
    <body>
      <div id="loader">Loading payment...</div>
      <script src="https://js.paystack.co/v1/inline.js"></script>
      <script>
        window.onload = function() {
          var handler = PaystackPop.setup({
            key: '${PAYSTACK_PUBLIC_KEY}',
            email: '${userEmail}',
            amount: ${Math.round(total * 100)},
            currency: 'NGN',
            callback: function(response) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'success',
                reference: response.reference
              }));
            },
            onClose: function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'cancel' }));
            }
          });
          handler.openIframe();
        };
      </script>
    </body>
    </html>
  `;

  function handleWebViewMessage(event: any) {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "success") {
        handlePaystackSuccess(data.reference);
      } else if (data.type === "cancel") {
        setShowPaystack(false);
      }
    } catch (e) {
      console.error("WebView message parse error", e);
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      {/* Paystack Modal */}
      <Modal
        visible={showPaystack}
        animationType="slide"
        onRequestClose={() => setShowPaystack(false)}
      >
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Secure Payment</Text>
            <TouchableOpacity
              onPress={() => setShowPaystack(false)}
              style={styles.modalClose}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <WebView
            source={{ html: paystackHtml }}
            onMessage={handleWebViewMessage}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            renderLoading={() => (
              <View style={styles.webviewLoader}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={styles.webviewLoaderText}>Loading payment...</Text>
              </View>
            )}
          />
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Cart</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>
            {itemCount} item{itemCount !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {/* Banner shown if a payment succeeded but the order failed to save */}
      {pendingPurchase && (
        <View style={styles.issueBanner}>
          <Text style={styles.issueBannerTitle}>
            ⚠️ Payment received, order not saved
          </Text>
          <Text style={styles.issueBannerText}>
            Your payment (ref {pendingPurchase.reference}) went through, but we
            couldn't save your order yet. Tap retry below — your cart items are
            safe.
          </Text>
          <TouchableOpacity
            style={[styles.issueBannerBtn, loading && { opacity: 0.6 }]}
            onPress={retrySavePurchase}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.issueBannerBtnText}>Retry order</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {cart.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyHint}>
            Browse the bookstore and add some titles to get started.
          </Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => router.push("/bookstore")}
            activeOpacity={0.85}
          >
            <Text style={styles.browseBtnText}>📚 Browse Books</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
          >
            {cart.map((item) => (
              <View key={item.id} style={styles.cartRow}>
                <View style={[styles.cover, { backgroundColor: item.color }]}>
                  <Text style={{ fontSize: 20 }}>📖</Text>
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.itemCategory} numberOfLines={1}>
                    {item.category}
                  </Text>
                  <Text style={styles.itemPrice}>₦{item.price.toFixed(2)}</Text>
                </View>

                <View style={styles.qtyControls}>
                  <View style={styles.qtyRow}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(item.id, -1)}
                    >
                      <Text style={styles.qtyBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyValue}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(item.id, 1)}
                    >
                      <Text style={styles.qtyBtnText}>＋</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => removeFromCart(item.id)}>
                    <Text style={styles.removeText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Summary + Checkout */}
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>₦{total.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotalLabel}>Total</Text>
              <Text style={styles.summaryTotalValue}>₦{total.toFixed(2)}</Text>
            </View>
            <TouchableOpacity
              style={[styles.checkoutBtn, loading && { opacity: 0.6 }]}
              onPress={handleCheckout}
              activeOpacity={0.85}
              disabled={loading || !!pendingPurchase}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.checkoutBtnText}>
                  Checkout · ₦{total.toFixed(2)}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}

      <BottomNav />
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    modalRoot: { flex: 1, backgroundColor: colors.background },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 56,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    modalTitle: { fontSize: 18, fontWeight: "700", color: colors.textPrimary },
    modalClose: { padding: 8 },
    modalCloseText: {
      color: colors.textMuted,
      fontSize: 16,
      fontWeight: "700",
    },
    webviewLoader: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
    },
    webviewLoaderText: { color: colors.textMuted, marginTop: 12, fontSize: 14 },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 56,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.textPrimary,
      letterSpacing: -0.4,
    },
    countBadge: {
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.accent,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
    },
    countBadgeText: { color: colors.accent, fontSize: 11, fontWeight: "700" },
    issueBanner: {
      marginHorizontal: 20,
      marginTop: 16,
      padding: 14,
      borderRadius: 14,
      backgroundColor: colors.dangerSoft,
      borderWidth: 1,
      borderColor: colors.danger,
    },
    issueBannerTitle: {
      fontSize: 13,
      fontWeight: "800",
      color: colors.danger,
      marginBottom: 4,
    },
    issueBannerText: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 18,
      marginBottom: 10,
    },
    issueBannerBtn: {
      backgroundColor: colors.danger,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 38,
    },
    issueBannerBtnText: {
      color: colors.white,
      fontSize: 13,
      fontWeight: "800",
    },
    scroll: { padding: 20, paddingBottom: 12 },
    cartRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      marginBottom: 12,
    },
    cover: {
      width: 52,
      height: 68,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    itemTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.textSecondary,
      marginBottom: 2,
    },
    itemCategory: { fontSize: 11, color: colors.textFaint, marginBottom: 8 },
    itemPrice: { fontSize: 14, fontWeight: "800", color: colors.accent },
    qtyControls: { alignItems: "flex-end", gap: 8 },
    qtyRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surfaceAlt,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    qtyBtn: {
      width: 28,
      height: 28,
      alignItems: "center",
      justifyContent: "center",
    },
    qtyBtnText: { color: colors.textPrimary, fontSize: 16, fontWeight: "700" },
    qtyValue: {
      minWidth: 24,
      textAlign: "center",
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: "700",
    },
    removeText: { fontSize: 11, color: colors.danger, fontWeight: "700" },
    emptyBox: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 40,
    },
    emptyEmoji: { fontSize: 56, marginBottom: 16 },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: 8,
    },
    emptyHint: {
      fontSize: 13,
      color: colors.textFaint,
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 24,
    },
    browseBtn: {
      backgroundColor: colors.accent,
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: 14,
    },
    browseBtnText: { color: colors.white, fontSize: 14, fontWeight: "800" },
    summary: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    summaryLabel: { fontSize: 13, color: colors.textFaint, fontWeight: "600" },
    summaryValue: { fontSize: 13, color: colors.textMuted, fontWeight: "700" },
    summaryDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 8,
    },
    summaryTotalLabel: {
      fontSize: 16,
      color: colors.textPrimary,
      fontWeight: "800",
    },
    summaryTotalValue: {
      fontSize: 18,
      color: colors.accent,
      fontWeight: "800",
    },
    checkoutBtn: {
      marginTop: 14,
      backgroundColor: colors.accent,
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 52,
    },
    checkoutBtnText: {
      color: colors.white,
      fontSize: 15,
      fontWeight: "800",
      letterSpacing: 0.3,
    },
  });
