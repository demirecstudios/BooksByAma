import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../../supabase";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Purchase = {
  id: string;
  user_id: string;
  book_id: string;
  book_title: string;
  book_author: string;
  book_color: string;
  book_category: string;
  price: number;
  purchased_at: string;
};

// A "virtual order" is purchases by the same user within a 5-minute window
type VirtualOrder = {
  key: string; // user_id + window bucket
  user_id: string;
  items: Purchase[];
  total: number;
  purchased_at: string; // earliest timestamp in group
};

type DateFilter = "all" | "today" | "week";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function groupIntoOrders(purchases: Purchase[]): VirtualOrder[] {
  // Sort by user + time ascending
  const sorted = [...purchases].sort(
    (a, b) =>
      a.user_id.localeCompare(b.user_id) ||
      new Date(a.purchased_at).getTime() - new Date(b.purchased_at).getTime(),
  );

  const groups: VirtualOrder[] = [];

  for (const p of sorted) {
    const ts = new Date(p.purchased_at).getTime();
    // Try to find an existing group for this user within 5 minutes
    const existing = groups.find(
      (g) =>
        g.user_id === p.user_id &&
        Math.abs(new Date(g.purchased_at).getTime() - ts) < 5 * 60 * 1000,
    );
    if (existing) {
      existing.items.push(p);
      existing.total += p.price;
    } else {
      groups.push({
        key: `${p.user_id}_${ts}`,
        user_id: p.user_id,
        items: [p],
        total: p.price,
        purchased_at: p.purchased_at,
      });
    }
  }

  // Sort newest first
  return groups.sort(
    (a, b) =>
      new Date(b.purchased_at).getTime() - new Date(a.purchased_at).getTime(),
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isThisWeek(iso: string): boolean {
  const d = new Date(iso).getTime();
  const now = Date.now();
  return now - d <= 7 * 24 * 60 * 60 * 1000;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function OrdersTab() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  useEffect(() => {
    fetchPurchases();
  }, []);

  async function fetchPurchases(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const { data, error } = await supabase
      .from("purchases")
      .select("*")
      .order("purchased_at", { ascending: false });

    if (!error) setPurchases(data || []);
    setLoading(false);
    setRefreshing(false);
  }

  // Apply date filter then group
  const filtered = purchases.filter((p) => {
    if (dateFilter === "today") return isToday(p.purchased_at);
    if (dateFilter === "week") return isThisWeek(p.purchased_at);
    return true;
  });

  const orders = groupIntoOrders(filtered);

  // Summary stats
  const totalRevenue = filtered.reduce((sum, p) => sum + p.price, 0);
  const uniqueBuyers = new Set(filtered.map((p) => p.user_id)).size;

  function toggleExpand(key: string) {
    setExpandedKey((prev) => (prev === key ? null : key));
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchPurchases(true)}
          tintColor="#2E86AB"
        />
      }
    >
      {/* Migration notice */}
      <View style={styles.noticeBanner}>
        <Text style={styles.noticeTitle}>📋 Using purchases table</Text>
        <Text style={styles.noticeText}>
          Purchases are grouped into virtual orders by user + time window. When
          you wire up the <Text style={styles.noticeCode}>orders</Text> table in
          checkout, swap the data source here for status management.
        </Text>
      </View>

      {/* Summary cards */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{orders.length}</Text>
          <Text style={styles.statLabel}>Orders</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{uniqueBuyers}</Text>
          <Text style={styles.statLabel}>Buyers</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            ₦{totalRevenue.toLocaleString()}
          </Text>
          <Text style={styles.statLabel}>Revenue</Text>
        </View>
      </View>

      {/* Date filter pills */}
      <View style={styles.filterRow}>
        {(["all", "today", "week"] as DateFilter[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterPill, dateFilter === f && styles.filterPillActive]}
            onPress={() => setDateFilter(f)}
          >
            <Text
              style={[
                styles.filterPillText,
                dateFilter === f && styles.filterPillTextActive,
              ]}
            >
              {f === "all" ? "All time" : f === "today" ? "Today" : "This week"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Orders list */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>
            {orders.length} ORDER{orders.length !== 1 ? "S" : ""}
          </Text>
          <TouchableOpacity onPress={() => fetchPurchases()}>
            <Text style={styles.refreshText}>↻ Refresh</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#2E86AB" />
            <Text style={styles.loadingText}>Loading orders...</Text>
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptyText}>
              {dateFilter !== "all"
                ? "No purchases in this time range. Try 'All time'."
                : "Orders will appear here once customers make purchases."}
            </Text>
          </View>
        ) : (
          orders.map((order) => {
            const isExpanded = expandedKey === order.key;
            return (
              <View key={order.key} style={styles.orderCard}>
                {/* Order header row — tap to expand */}
                <TouchableOpacity
                  style={styles.orderHeader}
                  onPress={() => toggleExpand(order.key)}
                  activeOpacity={0.75}
                >
                  <View style={styles.orderHeaderLeft}>
                    <View style={styles.orderIconWrap}>
                      <Text style={styles.orderIcon}>🛍️</Text>
                    </View>
                    <View>
                      <Text style={styles.orderUserId} numberOfLines={1}>
                        {order.user_id.slice(0, 12)}…
                      </Text>
                      <Text style={styles.orderDate}>
                        {formatDate(order.purchased_at)} ·{" "}
                        {formatTime(order.purchased_at)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.orderHeaderRight}>
                    <Text style={styles.orderTotal}>
                      ₦{order.total.toLocaleString()}
                    </Text>
                    <View style={styles.itemCountBadge}>
                      <Text style={styles.itemCountText}>
                        {order.items.length} book
                        {order.items.length !== 1 ? "s" : ""}
                      </Text>
                    </View>
                    <Text style={styles.chevron}>{isExpanded ? "▲" : "▼"}</Text>
                  </View>
                </TouchableOpacity>

                {/* Expanded line items */}
                {isExpanded && (
                  <View style={styles.lineItems}>
                    <View style={styles.lineItemsDivider} />
                    {order.items.map((item) => (
                      <View key={item.id} style={styles.lineItem}>
                        <View
                          style={[
                            styles.lineItemDot,
                            { backgroundColor: item.book_color },
                          ]}
                        />
                        <View style={styles.lineItemInfo}>
                          <Text style={styles.lineItemTitle} numberOfLines={1}>
                            {item.book_title}
                          </Text>
                          <Text style={styles.lineItemMeta}>
                            {item.book_category} ·{" "}
                            {item.book_author || "Unknown author"}
                          </Text>
                        </View>
                        <Text style={styles.lineItemPrice}>
                          ₦{item.price.toLocaleString()}
                        </Text>
                      </View>
                    ))}
                    <View style={styles.lineItemsDivider} />
                    <View style={styles.orderTotalRow}>
                      <Text style={styles.orderTotalLabel}>Order total</Text>
                      <Text style={styles.orderTotalValue}>
                        ₦{order.total.toLocaleString()}
                      </Text>
                    </View>
                    {/* Placeholder for future status management */}
                    <View style={styles.statusPlaceholder}>
                      <Text style={styles.statusPlaceholderText}>
                        🔒 Status management available after migrating to orders
                        table
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { padding: 20 },

  // Migration notice
  noticeBanner: {
    backgroundColor: "#0D1A12",
    borderWidth: 1,
    borderColor: "#1A4A2E",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  noticeTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#22BFA0",
    marginBottom: 4,
  },
  noticeText: { fontSize: 11, color: "#445566", lineHeight: 16 },
  noticeCode: {
    fontFamily: "monospace",
    color: "#2E86AB",
    backgroundColor: "#0D2233",
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
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

  // Date filter
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#12121A",
    borderWidth: 1,
    borderColor: "#1E1E30",
  },
  filterPillActive: {
    backgroundColor: "#2E86AB",
    borderColor: "#2E86AB",
  },
  filterPillText: { fontSize: 12, fontWeight: "600", color: "#445566" },
  filterPillTextActive: { color: "#fff" },

  // Section
  section: { marginBottom: 8 },
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
  loadingBox: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
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

  // Order card
  orderCard: {
    backgroundColor: "#12121A",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E1E30",
    marginBottom: 10,
    overflow: "hidden",
  },
  orderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  orderHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  orderIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#0D2233",
    alignItems: "center",
    justifyContent: "center",
  },
  orderIcon: { fontSize: 16 },
  orderUserId: {
    fontSize: 13,
    fontWeight: "700",
    color: "#D0D0EE",
    marginBottom: 2,
    fontFamily: "monospace",
  },
  orderDate: { fontSize: 11, color: "#445566" },
  orderHeaderRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  orderTotal: {
    fontSize: 15,
    fontWeight: "800",
    color: "#2E86AB",
  },
  itemCountBadge: {
    backgroundColor: "#0D2233",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  itemCountText: { fontSize: 10, color: "#2E86AB", fontWeight: "600" },
  chevron: { fontSize: 9, color: "#445566", marginTop: 2 },

  // Line items (expanded)
  lineItems: { paddingHorizontal: 14, paddingBottom: 14 },
  lineItemsDivider: {
    height: 1,
    backgroundColor: "#1E1E30",
    marginVertical: 10,
  },
  lineItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  lineItemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  lineItemInfo: { flex: 1 },
  lineItemTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#C0C0DD",
    marginBottom: 2,
  },
  lineItemMeta: { fontSize: 11, color: "#445566" },
  lineItemPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: "#E8E8FF",
  },
  orderTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  orderTotalLabel: { fontSize: 12, color: "#445566", fontWeight: "600" },
  orderTotalValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#2E86AB",
  },
  statusPlaceholder: {
    backgroundColor: "#0D0D14",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1E1E30",
    borderStyle: "dashed",
    padding: 10,
    alignItems: "center",
  },
  statusPlaceholderText: {
    fontSize: 10,
    color: "#334455",
    fontWeight: "600",
    textAlign: "center",
  },
});
