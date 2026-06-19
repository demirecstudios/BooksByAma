import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import BottomNav from "./components/BottomNav";
import { ThemeColors, useAppContext } from "./context/AppContext";

// ─── Mock data ────────────────────────────────────────────────────────────

const STATS = [
  { label: "Books Read", value: "47", icon: "📖" },
  { label: "Purchased", value: "23", icon: "🛍️" },
  { label: "Reading Now", value: "3", icon: "📚" },
  { label: "Wishlist", value: "12", icon: "❤️" },
  { label: "Reviews", value: "8", icon: "✍️" },
];

const CURRENTLY_READING = [
  {
    id: "1",
    title: "The Missing Mango",
    author: "Tobi & Kemi Series · Book 1",
    progress: 0.65,
    color: "#1E3A5F",
  },
  {
    id: "2",
    title: "Whispers of the Forest",
    author: "N. Adeyemi",
    progress: 0.32,
    color: "#2D1B4E",
  },
  {
    id: "3",
    title: "Starlight Atlas",
    author: "K. Mensah",
    progress: 0.86,
    color: "#0D3B38",
  },
];

const LIBRARY_ITEMS = [
  { label: "Purchased Books", icon: "🛍️", count: 23 },
  { label: "Downloaded Books", icon: "⬇️", count: 14 },
  { label: "Audiobooks", icon: "🎧", count: 6 },
  { label: "Reading History", icon: "🕘", count: 47 },
];

const WISHLIST = [
  {
    id: "1",
    title: "The Lost Compass",
    author: "R. Okafor",
    price: 6.99,
    color: "#3B1A2E",
  },
  {
    id: "2",
    title: "Mango Season",
    author: "Tobi & Kemi",
    price: 4.5,
    color: "#1A3A2A",
  },
  {
    id: "3",
    title: "City of Echoes",
    author: "D. Mwangi",
    price: 8.0,
    color: "#3B2A0A",
  },
];

const ORDERS = [
  {
    id: "1",
    title: "The Missing Mango",
    date: "Jun 10, 2026",
    amount: 2.99,
    status: "Delivered",
  },
  {
    id: "2",
    title: "Whispers of the Forest",
    date: "May 28, 2026",
    amount: 5.49,
    status: "Delivered",
  },
  {
    id: "3",
    title: "Starlight Atlas",
    date: "May 14, 2026",
    amount: 0,
    status: "Free",
  },
];

// ─── Settings types ───────────────────────────────────────────────────────

////type SettingItem = {
////icon: string;
////label: string;
////action:
////   | "change-password"
////   | "notification-settings"
////   | "payment-methods"
////   | "shipping-addresses"
////   | "language-settings"
/// / | "help-center" // ← new
////   | "contact-support" // ← new
////   | "faqs" // ← new
////   | "report-problem" // ← new
////   | "coming-soon";
////};
type SettingItem = {
  icon: string;
  label: string;
  action: string; // route path or "coming-soon"
};

// ─── FIX 3: Removed "Edit Profile" from here (it's already in the header) ─
const SETTINGS_ITEMS: SettingItem[] = [
  { icon: "🔒", label: "Change Password", action: "change-password" },
  {
    icon: "🔔",
    label: "Notification Settings",
    action: "notification-settings",
  },
  { icon: "💳", label: "Payment Methods", action: "payment-methods" },
  { icon: "📍", label: "Shipping Addresses", action: "shipping-addresses" },
  { icon: "🌐", label: "Language Settings", action: "language-settings" },
];

const SUPPORT_ITEMS: SettingItem[] = [
  { icon: "❓", label: "Help Center", action: "help-center" },
  { icon: "💬", label: "Contact Support", action: "contact-support" },
  { icon: "📋", label: "FAQs", action: "faqs" },
  { icon: "🚩", label: "Report a Problem", action: "report-problem" },
];

// ─── Screen ───────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();

  const { isDark, toggleTheme, profile, reloadUser, colors } = useAppContext();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // ─── FIX 4: Toast state ───────────────────────────────────────────────
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  // Reload user every time this screen comes into focus
  useFocusEffect(
    useCallback(() => {
      reloadUser();
    }, [reloadUser]),
  );

  // ── Handlers ──────────────────────────────────────────────────────────

  function handleSettingPress(item: SettingItem) {
    if (item.action === "change-password") {
      router.push("/change-password");
    } else if (item.action === "notification-settings") {
      router.push("/notification-settings");
    } else if (item.action === "payment-methods") {
      router.push("/payment-methods");
    } else if (item.action === "shipping-addresses") {
      router.push("/shipping-addresses");
    } else if (item.action === "language-settings") {
      router.push("/language-settings");
    } else if (item.action === "help-center") {
      // ← new
      router.push("/help-center");
    } else if (item.action === "contact-support") {
      // ← new
      router.push("/contact-support");
    } else if (item.action === "faqs") {
      // ← new
      router.push("/faqs");
    } else if (item.action === "report-problem") {
      // ← new
      router.push("/report-problem");
    } else {
      showToast(`${item.label} — coming soon`);
    }
  }

  async function handleLogout() {
    const { error } = await (
      await import("../supabase")
    ).supabase.auth.signOut();
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    router.replace("/");
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.bg}
      />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity style={styles.themeToggle} onPress={toggleTheme}>
            <Text style={styles.themeToggleText}>{isDark ? "☀️" : "🌙"}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile.avatarInitial}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.userName}>{profile.displayName}</Text>
            <Text style={styles.userHandle}>{profile.displayHandle}</Text>
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>★ Premium Member</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.editProfileBtn}
          activeOpacity={0.85}
          onPress={() => router.push("/edit-profile")}
        >
          <Text style={styles.editProfileBtnText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── Reading Statistics ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsRow}
        >
          {STATS.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statIcon}>{s.icon}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </ScrollView>

        {/* ── Currently Reading ── */}
        <SectionHeader title="Continue Reading" colors={colors} />
        <View style={styles.section}>
          {CURRENTLY_READING.map((book) => (
            <View key={book.id} style={styles.readingCard}>
              <View
                style={[styles.readingCover, { backgroundColor: book.color }]}
              >
                <Text style={{ fontSize: 22 }}>📖</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.readingTitle} numberOfLines={1}>
                  {book.title}
                </Text>
                <Text style={styles.readingAuthor} numberOfLines={1}>
                  {book.author}
                </Text>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.round(book.progress * 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressLabel}>
                  {Math.round(book.progress * 100)}% completed
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── My Library ── */}
        <SectionHeader title="My Library" colors={colors} />
        <View style={[styles.section, styles.libraryGrid]}>
          {LIBRARY_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.libraryCard}
              activeOpacity={0.8}
            >
              <View style={styles.libraryIconWrap}>
                <Text style={styles.libraryIcon}>{item.icon}</Text>
              </View>
              <Text style={styles.libraryLabel}>{item.label}</Text>
              <Text style={styles.libraryCount}>{item.count}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Wishlist ── */}
        <SectionHeader title="Wishlist" actionLabel="See all" colors={colors} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.wishlistRow}
        >
          {WISHLIST.map((book) => (
            <View key={book.id} style={styles.wishlistCard}>
              <View
                style={[styles.wishlistCover, { backgroundColor: book.color }]}
              >
                <Text style={{ fontSize: 28 }}>📕</Text>
              </View>
              <Text style={styles.wishlistTitle} numberOfLines={1}>
                {book.title}
              </Text>
              <Text style={styles.wishlistAuthor} numberOfLines={1}>
                {book.author}
              </Text>
              <View style={styles.wishlistFooter}>
                <Text style={styles.wishlistPrice}>
                  ${book.price.toFixed(2)}
                </Text>
                <TouchableOpacity
                  style={styles.addToCartBtn}
                  activeOpacity={0.85}
                >
                  <Text style={styles.addToCartBtnText}>＋ Cart</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* ── Rewards & Membership ── */}
        <SectionHeader title="Rewards & Membership" colors={colors} />
        <View style={styles.section}>
          <View style={styles.rewardsCard}>
            <View style={styles.rewardsTopRow}>
              <View>
                <Text style={styles.rewardsPointsValue}>1,240</Text>
                <Text style={styles.rewardsPointsLabel}>Loyalty Points</Text>
              </View>
              <View style={styles.premiumStatusPill}>
                <Text style={styles.premiumStatusPillText}>
                  Premium · Active
                </Text>
              </View>
            </View>
            <View style={styles.rewardsDivider} />
            <View style={styles.rewardsBottomRow}>
              <View style={styles.rewardsMetric}>
                <Text style={styles.rewardsMetricValue}>5</Text>
                <Text style={styles.rewardsMetricLabel}>Badges</Text>
              </View>
              <View style={styles.rewardsMetricDivider} />
              <View style={styles.rewardsMetric}>
                <Text style={styles.rewardsMetricValue}>2</Text>
                <Text style={styles.rewardsMetricLabel}>Coupons</Text>
              </View>
              <View style={styles.rewardsMetricDivider} />
              <View style={styles.rewardsMetric}>
                <Text style={styles.rewardsMetricValue}>Dec 2026</Text>
                <Text style={styles.rewardsMetricLabel}>Renews</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Orders & Purchases ── */}
        <SectionHeader title="Orders & Purchases" colors={colors} />
        <View style={styles.section}>
          {ORDERS.map((order) => (
            <View key={order.id} style={styles.orderRow}>
              <View style={styles.orderIconWrap}>
                <Text style={{ fontSize: 16 }}>🧾</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.orderTitle} numberOfLines={1}>
                  {order.title}
                </Text>
                <Text style={styles.orderDate}>{order.date}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.orderAmount}>
                  {order.amount === 0 ? "Free" : `$${order.amount.toFixed(2)}`}
                </Text>
                <Text style={styles.orderStatus}>{order.status}</Text>
              </View>
            </View>
          ))}

          <View style={styles.orderActionsRow}>
            <TouchableOpacity style={styles.orderActionBtn} activeOpacity={0.8}>
              <Text style={styles.orderActionBtnText}>
                📥 Download Receipts
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.orderActionBtn} activeOpacity={0.8}>
              <Text style={styles.orderActionBtnText}>📦 Track Orders</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Account Settings ── */}
        <SectionHeader title="Account Settings" colors={colors} />
        <View style={styles.section}>
          <View style={styles.listCard}>
            {SETTINGS_ITEMS.map((item, idx) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.listRow,
                  idx === SETTINGS_ITEMS.length - 1 && styles.listRowLast,
                ]}
                activeOpacity={0.7}
                onPress={() => handleSettingPress(item)}
              >
                <View style={styles.listIconWrap}>
                  <Text style={{ fontSize: 15 }}>{item.icon}</Text>
                </View>
                <Text
                  style={[
                    styles.listLabel,
                    item.action === "coming-soon" && {
                      color: colors.textMuted,
                    },
                  ]}
                >
                  {item.label}
                </Text>
                <Text
                  style={[
                    styles.listChevron,
                    item.action === "coming-soon" && { opacity: 0.3 },
                  ]}
                >
                  ›
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Support ── */}
        <SectionHeader title="Support" colors={colors} />
        <View style={styles.section}>
          <View style={styles.listCard}>
            {/* FIX 4: coming-soon items are dimmed */}
            {SUPPORT_ITEMS.map((item, idx) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.listRow,
                  idx === SUPPORT_ITEMS.length - 1 && styles.listRowLast,
                ]}
                activeOpacity={0.7}
                onPress={() => handleSettingPress(item)}
              >
                <View style={styles.listIconWrap}>
                  <Text style={{ fontSize: 15 }}>{item.icon}</Text>
                </View>
                <Text
                  style={[
                    styles.listLabel,
                    item.action === "coming-soon" && {
                      color: colors.textMuted,
                    },
                  ]}
                >
                  {item.label}
                </Text>
                <Text
                  style={[
                    styles.listChevron,
                    item.action === "coming-soon" && { opacity: 0.3 },
                  ]}
                >
                  ›
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Logout ── */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.logoutBtn}
            activeOpacity={0.85}
            onPress={handleLogout}
          >
            <Text style={styles.logoutBtnText}>Log Out</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── FIX 4: Toast notification ── */}
      {toast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      {/* ── Bottom Navigation ── */}
      <BottomNav colors={colors} />
    </View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────

function SectionHeader({
  title,
  actionLabel,
  colors,
}: {
  title: string;
  actionLabel?: string;
  colors: ThemeColors;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        marginBottom: 12,
        marginTop: 8,
      }}
    >
      <Text
        style={{
          fontSize: 16,
          fontWeight: "800",
          color: colors.text,
          letterSpacing: -0.2,
        }}
      >
        {title}
      </Text>
      {actionLabel && (
        <TouchableOpacity>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: colors.primary,
            }}
          >
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },

    // Header
    header: {
      paddingHorizontal: 20,
      paddingTop: 56,
      paddingBottom: 18,
      backgroundColor: c.bg,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    headerTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 18,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: "800",
      color: c.text,
      letterSpacing: -0.4,
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

    profileRow: { flexDirection: "row", alignItems: "center" },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: c.gold,
    },
    avatarText: { fontSize: 28, fontWeight: "800", color: "#FFFFFF" },
    userName: {
      fontSize: 18,
      fontWeight: "800",
      color: c.text,
      letterSpacing: -0.3,
      marginBottom: 2,
    },
    userHandle: {
      fontSize: 13,
      color: c.textSecondary,
      marginBottom: 8,
    },
    premiumBadge: {
      alignSelf: "flex-start",
      backgroundColor: c.goldTint,
      borderWidth: 1,
      borderColor: c.gold,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
    },
    premiumBadgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: c.gold,
      letterSpacing: 0.3,
    },
    editProfileBtn: {
      marginTop: 18,
      backgroundColor: c.primary,
      borderRadius: 16,
      paddingVertical: 13,
      alignItems: "center",
    },
    editProfileBtnText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "800",
      letterSpacing: 0.3,
    },

    // Scroll
    scroll: { paddingTop: 20 },

    // Section header
    sectionHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      marginBottom: 12,
      marginTop: 8,
    },
    sectionHeaderTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: c.text,
      letterSpacing: -0.2,
    },
    sectionHeaderAction: {
      fontSize: 12,
      fontWeight: "700",
      color: c.primary,
    },
    section: { paddingHorizontal: 20, marginBottom: 28 },

    // Stats
    statsRow: {
      paddingHorizontal: 20,
      gap: 12,
      marginBottom: 8,
    },
    statCard: {
      width: 104,
      backgroundColor: c.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      alignItems: "flex-start",
      shadowColor: "#000",
      shadowOpacity: 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 1,
    },
    statIcon: { fontSize: 20, marginBottom: 8 },
    statValue: {
      fontSize: 20,
      fontWeight: "800",
      color: c.text,
      marginBottom: 2,
    },
    statLabel: {
      fontSize: 11,
      color: c.textMuted,
      fontWeight: "600",
    },

    // Currently reading
    readingCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOpacity: 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 1,
    },
    readingCover: {
      width: 52,
      height: 68,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    readingTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: c.text,
      marginBottom: 2,
    },
    readingAuthor: {
      fontSize: 11,
      color: c.textMuted,
      marginBottom: 8,
    },
    progressTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: c.cardAlt,
      overflow: "hidden",
      marginBottom: 6,
    },
    progressFill: {
      height: 6,
      borderRadius: 3,
      backgroundColor: c.primary,
    },
    progressLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: c.primary,
    },

    // Library grid
    libraryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    libraryCard: {
      width: "47%",
      backgroundColor: c.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
      shadowColor: "#000",
      shadowOpacity: 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 1,
    },
    libraryIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: c.primaryTint,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
    },
    libraryIcon: { fontSize: 18 },
    libraryLabel: {
      fontSize: 13,
      fontWeight: "700",
      color: c.text,
      marginBottom: 4,
    },
    libraryCount: {
      fontSize: 12,
      color: c.textMuted,
      fontWeight: "600",
    },

    // Wishlist
    wishlistRow: {
      paddingHorizontal: 20,
      gap: 12,
    },
    wishlistCard: {
      width: 150,
      backgroundColor: c.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 12,
      shadowColor: "#000",
      shadowOpacity: 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 1,
    },
    wishlistCover: {
      height: 110,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
    },
    wishlistTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: c.text,
      marginBottom: 2,
    },
    wishlistAuthor: {
      fontSize: 11,
      color: c.textMuted,
      marginBottom: 10,
    },
    wishlistFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    wishlistPrice: {
      fontSize: 14,
      fontWeight: "800",
      color: c.primary,
    },
    addToCartBtn: {
      backgroundColor: c.primaryTint,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    addToCartBtnText: {
      fontSize: 11,
      fontWeight: "800",
      color: c.primary,
    },

    // Rewards
    rewardsCard: {
      backgroundColor: c.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.border,
      padding: 18,
      shadowColor: "#000",
      shadowOpacity: 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 1,
    },
    rewardsTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 16,
    },
    rewardsPointsValue: {
      fontSize: 28,
      fontWeight: "800",
      color: c.text,
      letterSpacing: -0.5,
    },
    rewardsPointsLabel: {
      fontSize: 12,
      color: c.textMuted,
      fontWeight: "600",
      marginTop: 2,
    },
    premiumStatusPill: {
      backgroundColor: c.goldTint,
      borderWidth: 1,
      borderColor: c.gold,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    premiumStatusPillText: {
      fontSize: 11,
      fontWeight: "800",
      color: c.gold,
    },
    rewardsDivider: {
      height: 1,
      backgroundColor: c.border,
      marginBottom: 16,
    },
    rewardsBottomRow: { flexDirection: "row", alignItems: "center" },
    rewardsMetric: { flex: 1, alignItems: "center" },
    rewardsMetricValue: {
      fontSize: 15,
      fontWeight: "800",
      color: c.text,
      marginBottom: 2,
    },
    rewardsMetricLabel: {
      fontSize: 11,
      color: c.textMuted,
      fontWeight: "600",
    },
    rewardsMetricDivider: {
      width: 1,
      height: 28,
      backgroundColor: c.border,
    },

    // Orders
    orderRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      padding: 12,
      marginBottom: 10,
    },
    orderIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: c.cardAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    orderTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: c.text,
      marginBottom: 2,
    },
    orderDate: { fontSize: 11, color: c.textMuted },
    orderAmount: {
      fontSize: 13,
      fontWeight: "800",
      color: c.text,
      marginBottom: 2,
    },
    orderStatus: {
      fontSize: 11,
      color: c.primary,
      fontWeight: "700",
    },
    orderActionsRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 4,
    },
    orderActionBtn: {
      flex: 1,
      backgroundColor: c.cardAlt,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: "center",
    },
    orderActionBtnText: {
      fontSize: 12,
      fontWeight: "700",
      color: c.text,
    },

    // Lists
    listCard: {
      backgroundColor: c.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
    },
    listRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    listRowLast: { borderBottomWidth: 0 },
    listIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: c.cardAlt,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    listLabel: {
      flex: 1,
      fontSize: 14,
      fontWeight: "600",
      color: c.text,
    },
    listChevron: {
      fontSize: 18,
      color: c.textMuted,
      fontWeight: "700",
    },

    // Logout
    logoutBtn: {
      backgroundColor: c.dangerTint,
      borderWidth: 1,
      borderColor: c.danger,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: "center",
    },
    logoutBtnText: {
      fontSize: 15,
      fontWeight: "800",
      color: c.danger,
      letterSpacing: 0.3,
    },

    // FIX 4: Toast
    toast: {
      position: "absolute",
      bottom: 90,
      alignSelf: "center",
      backgroundColor: c.cardAlt,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 20,
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    toastText: {
      fontSize: 13,
      fontWeight: "600",
      color: c.textSecondary,
    },
  });
}
