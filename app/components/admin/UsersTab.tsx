import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../../supabase";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Profile = {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  phone: string | null;
  date_of_birth: string | null;
  country: string | null;
  created_at: string;
  is_admin?: boolean; // hydrated from auth.users metadata via admin API
};

type Purchase = {
  id: string;
  book_title: string;
  book_category: string;
  book_color: string;
  price: number;
  purchased_at: string;
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getInitials(profile: Profile): string {
  const name = profile.full_name || profile.username || profile.email;
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const AVATAR_COLORS = [
  "#1E3A5F",
  "#0D3B38",
  "#2D1B4E",
  "#1A3A2A",
  "#3B1A2E",
  "#1A2E3B",
];

function avatarColor(id: string): string {
  const sum = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function UsersTab() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [purchases, setPurchases] = useState<Record<string, Purchase[]>>({});
  const [loadingPurchases, setLoadingPurchases] = useState<
    Record<string, boolean>
  >({});
  const [togglingAdmin, setTogglingAdmin] = useState<Record<string, boolean>>(
    {},
  );

  useEffect(() => {
    fetchProfiles();
  }, []);

  async function fetchProfiles(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      Alert.alert("Error", "Failed to load users: " + error.message);
    } else {
      setProfiles(data || []);
    }

    setLoading(false);
    setRefreshing(false);
  }

  async function fetchUserPurchases(userId: string) {
    if (purchases[userId]) return; // already loaded
    setLoadingPurchases((prev) => ({ ...prev, [userId]: true }));
    const { data, error } = await supabase
      .from("purchases")
      .select("id, book_title, book_category, book_color, price, purchased_at")
      .eq("user_id", userId)
      .order("purchased_at", { ascending: false });
    if (!error) {
      setPurchases((prev) => ({ ...prev, [userId]: data || [] }));
    }
    setLoadingPurchases((prev) => ({ ...prev, [userId]: false }));
  }

  function toggleExpand(userId: string) {
    if (expandedId === userId) {
      setExpandedId(null);
    } else {
      setExpandedId(userId);
      fetchUserPurchases(userId);
    }
  }

  async function handleToggleAdmin(profile: Profile) {
    const newValue = !profile.is_admin;
    const action = newValue ? "promote to admin" : "remove admin access from";
    Alert.alert(
      newValue ? "Promote to Admin" : "Remove Admin",
      `Are you sure you want to ${action} ${profile.full_name || profile.email}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: newValue ? "Promote" : "Remove",
          style: newValue ? "default" : "destructive",
          onPress: async () => {
            setTogglingAdmin((prev) => ({ ...prev, [profile.id]: true }));
            // Update auth.users metadata via Supabase admin API
            const { error } = await supabase.auth.admin.updateUserById(
              profile.id,
              { user_metadata: { is_admin: newValue } },
            );
            setTogglingAdmin((prev) => ({ ...prev, [profile.id]: false }));
            if (error) {
              Alert.alert(
                "Error",
                "Failed to update admin status: " + error.message,
              );
              return;
            }
            // Update local state
            setProfiles((prev) =>
              prev.map((p) =>
                p.id === profile.id ? { ...p, is_admin: newValue } : p,
              ),
            );
            Alert.alert(
              "Done",
              newValue
                ? `${profile.full_name || profile.email} is now an admin.`
                : `Admin access removed from ${profile.full_name || profile.email}.`,
            );
          },
        },
      ],
    );
  }

  // ─── Filtered list ──────────────────────────────────────────────────────────

  const filtered = profiles.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.email?.toLowerCase().includes(q) ||
      p.full_name?.toLowerCase().includes(q) ||
      p.username?.toLowerCase().includes(q) ||
      p.country?.toLowerCase().includes(q)
    );
  });

  const adminCount = profiles.filter((p) => p.is_admin).length;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchProfiles(true)}
          tintColor="#2E86AB"
        />
      }
    >
      {/* Summary row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{profiles.length}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{adminCount}</Text>
          <Text style={styles.statLabel}>Admins</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {
              profiles.filter((p) => {
                const d = new Date(p.created_at).getTime();
                return Date.now() - d <= 7 * 24 * 60 * 60 * 1000;
              }).length
            }
          </Text>
          <Text style={styles.statLabel}>New (7d)</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email, username…"
          placeholderTextColor="#334"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Text style={styles.searchClear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Admin-API notice */}
      <View style={styles.noticeBanner}>
        <Text style={styles.noticeText}>
          🔒 Admin promotion uses the Supabase service-role key via{" "}
          <Text style={styles.noticeCode}>auth.admin.updateUserById</Text>. Make
          sure your Supabase client is initialised with the service-role key in
          a secure server context, not in the app bundle.
        </Text>
      </View>

      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>
          {filtered.length} USER{filtered.length !== 1 ? "S" : ""}
          {search ? ` matching "${search}"` : ""}
        </Text>
        <TouchableOpacity onPress={() => fetchProfiles()}>
          <Text style={styles.refreshText}>↻ Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* User list */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#2E86AB" />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>👤</Text>
          <Text style={styles.emptyTitle}>No users found</Text>
          <Text style={styles.emptyText}>
            {search
              ? "Try a different search term."
              : "No registered users yet."}
          </Text>
        </View>
      ) : (
        filtered.map((profile) => {
          const isExpanded = expandedId === profile.id;
          const userPurchases = purchases[profile.id] || [];
          const isLoadingP = loadingPurchases[profile.id];
          const isTogglingA = togglingAdmin[profile.id];
          const totalSpent = userPurchases.reduce((s, p) => s + p.price, 0);

          return (
            <View key={profile.id} style={styles.userCard}>
              {/* User row */}
              <TouchableOpacity
                style={styles.userRow}
                onPress={() => toggleExpand(profile.id)}
                activeOpacity={0.75}
              >
                {/* Avatar */}
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: avatarColor(profile.id) },
                  ]}
                >
                  <Text style={styles.avatarText}>{getInitials(profile)}</Text>
                </View>

                {/* Info */}
                <View style={styles.userInfo}>
                  <View style={styles.userNameRow}>
                    <Text style={styles.userName} numberOfLines={1}>
                      {profile.full_name || profile.username || "—"}
                    </Text>
                    {profile.is_admin && (
                      <View style={styles.adminBadge}>
                        <Text style={styles.adminBadgeText}>Admin</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.userEmail} numberOfLines={1}>
                    {profile.email}
                  </Text>
                  <Text style={styles.userMeta}>
                    {profile.country || "—"} · Joined{" "}
                    {formatDate(profile.created_at)}
                  </Text>
                </View>

                <Text style={styles.chevron}>{isExpanded ? "▲" : "▼"}</Text>
              </TouchableOpacity>

              {/* Expanded detail */}
              {isExpanded && (
                <View style={styles.expandedArea}>
                  <View style={styles.divider} />

                  {/* Profile fields */}
                  <View style={styles.detailGrid}>
                    <DetailRow label="Username" value={profile.username} />
                    <DetailRow label="Phone" value={profile.phone} />
                    <DetailRow
                      label="Date of birth"
                      value={profile.date_of_birth}
                    />
                    <DetailRow label="Country" value={profile.country} />
                    <DetailRow
                      label="User ID"
                      value={profile.id.slice(0, 16) + "…"}
                      mono
                    />
                  </View>

                  <View style={styles.divider} />

                  {/* Admin toggle */}
                  <View style={styles.adminToggleRow}>
                    <View>
                      <Text style={styles.adminToggleLabel}>Admin access</Text>
                      <Text style={styles.adminToggleSub}>
                        {profile.is_admin
                          ? "Can access admin panel"
                          : "Standard user"}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.adminToggleBtn,
                        profile.is_admin && styles.adminToggleBtnActive,
                        isTogglingA && { opacity: 0.6 },
                      ]}
                      onPress={() => handleToggleAdmin(profile)}
                      disabled={isTogglingA}
                    >
                      {isTogglingA ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.adminToggleBtnText}>
                          {profile.is_admin ? "Remove admin" : "Make admin"}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  <View style={styles.divider} />

                  {/* Purchase history */}
                  <View style={styles.purchasesHeader}>
                    <Text style={styles.purchasesTitle}>Purchase history</Text>
                    {userPurchases.length > 0 && (
                      <Text style={styles.purchasesTotal}>
                        ₦{totalSpent.toLocaleString()} total
                      </Text>
                    )}
                  </View>

                  {isLoadingP ? (
                    <View style={styles.purchasesLoading}>
                      <ActivityIndicator size="small" color="#2E86AB" />
                    </View>
                  ) : userPurchases.length === 0 ? (
                    <Text style={styles.noPurchases}>No purchases yet</Text>
                  ) : (
                    userPurchases.map((p) => (
                      <View key={p.id} style={styles.purchaseRow}>
                        <View
                          style={[
                            styles.purchaseDot,
                            { backgroundColor: p.book_color },
                          ]}
                        />
                        <View style={styles.purchaseInfo}>
                          <Text style={styles.purchaseTitle} numberOfLines={1}>
                            {p.book_title}
                          </Text>
                          <Text style={styles.purchaseMeta}>
                            {p.book_category} · {formatDate(p.purchased_at)}
                          </Text>
                        </View>
                        <Text style={styles.purchasePrice}>
                          ₦{p.price.toLocaleString()}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>
          );
        })
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Detail row helper ─────────────────────────────────────────────────────────

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, mono && styles.detailValueMono]}>
        {value || "—"}
      </Text>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { padding: 20 },

  // Stats
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: "#12121A",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E1E30",
    padding: 14,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "800",
    color: "#E8E8FF",
    marginBottom: 2,
  },
  statLabel: { fontSize: 10, color: "#445566", fontWeight: "600" },

  // Search
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#12121A",
    borderWidth: 1,
    borderColor: "#1A1A28",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 14,
    gap: 8,
  },
  searchIcon: { fontSize: 14 },
  searchInput: {
    flex: 1,
    color: "#E8E8FF",
    fontSize: 14,
    paddingVertical: 12,
  },
  searchClear: {
    color: "#445566",
    fontSize: 14,
    fontWeight: "700",
    padding: 4,
  },

  // Notice
  noticeBanner: {
    backgroundColor: "#0D1A12",
    borderWidth: 1,
    borderColor: "#1A4A2E",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  noticeText: { fontSize: 11, color: "#445566", lineHeight: 16 },
  noticeCode: { fontFamily: "monospace", color: "#2E86AB" },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2E86AB",
    letterSpacing: 1.5,
  },
  refreshText: { fontSize: 12, color: "#2E86AB", fontWeight: "700" },

  // Loading / empty
  loadingBox: { alignItems: "center", paddingVertical: 40, gap: 12 },
  loadingText: { color: "#445566", fontSize: 13 },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 40,
    backgroundColor: "#12121A",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1E1E30",
    paddingHorizontal: 24,
  },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#D0D0EE",
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 12,
    color: "#445566",
    textAlign: "center",
    lineHeight: 18,
  },

  // User card
  userCard: {
    backgroundColor: "#12121A",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E1E30",
    marginBottom: 10,
    overflow: "hidden",
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  userInfo: { flex: 1, minWidth: 0 },
  userNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  userName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#D0D0EE",
    flexShrink: 1,
  },
  adminBadge: {
    backgroundColor: "#0D2233",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#2E86AB",
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  adminBadgeText: { fontSize: 9, color: "#2E86AB", fontWeight: "800" },
  userEmail: { fontSize: 11, color: "#445566", marginBottom: 2 },
  userMeta: { fontSize: 10, color: "#334455" },
  chevron: { fontSize: 9, color: "#445566" },

  // Expanded area
  expandedArea: { paddingHorizontal: 14, paddingBottom: 14 },
  divider: { height: 1, backgroundColor: "#1E1E30", marginVertical: 12 },

  // Detail grid
  detailGrid: { gap: 8 },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: { fontSize: 11, color: "#445566", fontWeight: "600" },
  detailValue: {
    fontSize: 11,
    color: "#C0C0DD",
    fontWeight: "600",
    maxWidth: "60%",
    textAlign: "right",
  },
  detailValueMono: { fontFamily: "monospace", fontSize: 10 },

  // Admin toggle
  adminToggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  adminToggleLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#D0D0EE",
    marginBottom: 2,
  },
  adminToggleSub: { fontSize: 11, color: "#445566" },
  adminToggleBtn: {
    backgroundColor: "#1A6B3A",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 34,
  },
  adminToggleBtnActive: { backgroundColor: "#6B1A1A" },
  adminToggleBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  // Purchases
  purchasesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  purchasesTitle: { fontSize: 12, fontWeight: "700", color: "#C0C0DD" },
  purchasesTotal: { fontSize: 12, fontWeight: "800", color: "#2E86AB" },
  purchasesLoading: { alignItems: "center", paddingVertical: 12 },
  noPurchases: { fontSize: 12, color: "#334455", fontStyle: "italic" },
  purchaseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  purchaseDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  purchaseInfo: { flex: 1 },
  purchaseTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#C0C0DD",
    marginBottom: 1,
  },
  purchaseMeta: { fontSize: 10, color: "#445566" },
  purchasePrice: { fontSize: 12, fontWeight: "700", color: "#E8E8FF" },
});
