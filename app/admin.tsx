import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../supabase";
import AdminAuthorsScreen from "./admin/authors";
import AnalyticsTab from "./components/admin/AnalyticsTab";
import BooksTab from "./components/admin/BooksTab";
import CategoriesTab from "./components/admin/CategoriesTab";
import NotificationsTab from "./components/admin/NotificationsTab";
import OrdersTab from "./components/admin/OrdersTab";
import UsersTab from "./components/admin/UsersTab";
import { usePushNotifications } from "./hooks/usePushNotifications";

type TabName =
  | "overview"
  | "books"
  | "categories"
  | "orders"
  | "users"
  | "analytics"
  | "notifications"
  | "authors";

type Book = {
  id: string;
  title: string;
  description: string;
  age: string;
  category: string;
  color: string;
  price: number;
  cover_image: string | null;
  author: string | null;
  publisher: string | null;
};

type Category = {
  id: string;
  name: string;
  cover_url: string | null;
};

type Order = {
  id: string;
  user_id: string;
  items: any[];
  total: number;
  status: string;
  created_at: string;
};

const TABS: { key: TabName; label: string }[] = [
  { key: "overview", label: "📊 Overview" },
  { key: "books", label: "📚 Books" },
  { key: "categories", label: "🗂 Categories" },
  { key: "orders", label: "🛍️ Orders" },
  { key: "users", label: "👤 Users" },
  { key: "analytics", label: "📈 Analytics" },
  { key: "notifications", label: "🔔 Notify" },
  { key: "authors", label: "✍️ Authors" },
];

export default function AdminScreen() {
  const router = useRouter();

  const [userEmail, setUserEmail] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  usePushNotifications();

  const [activeTab, setActiveTab] = useState<TabName>("overview");

  const [totalBooks, setTotalBooks] = useState(0);
  const [totalCategories, setTotalCategories] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [totalAuthors, setTotalAuthors] = useState(0);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [books, setBooks] = useState<Book[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user;
      const email = user?.email || "";
      const meta = user?.user_metadata ?? {};

      setUserEmail(email);

      const isAdmin =
        meta.is_admin === true || email === "demirecstudios@gmail.com";

      setAuthorized(isAdmin);
      setChecking(false);

      if (isAdmin) {
        fetchCategories();
        fetchBooks();
        fetchStats();
      }
    });
  }, []);

  async function fetchStats() {
    const [booksRes, catsRes, ordersRes, authorsRes] = await Promise.all([
      supabase.from("books").select("*", { count: "exact", head: true }),
      supabase.from("categories").select("*", { count: "exact", head: true }),
      supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("authors").select("*", { count: "exact", head: true }),
    ]);

    setTotalBooks(booksRes.count ?? 0);
    setTotalCategories(catsRes.count ?? 0);
    setTotalAuthors(authorsRes.count ?? 0);

    const orders: Order[] = ordersRes.data ?? [];
    setTotalOrders(orders.length);
    setTotalRevenue(orders.reduce((sum, o) => sum + (o.total ?? 0), 0));
    setRecentOrders(orders.slice(0, 5));
  }

  async function fetchCategories() {
    setLoadingCategories(true);
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true });
    if (!error) setCategories(data || []);
    setLoadingCategories(false);
  }

  async function fetchBooks() {
    setLoadingBooks(true);
    const { data, error } = await supabase
      .from("books")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setBooks(data || []);
    setLoadingBooks(false);
  }

  if (checking) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Checking access...</Text>
      </View>
    );
  }

  if (!authorized) {
    return (
      <View style={styles.center}>
        <Text style={styles.denyEmoji}>🚫</Text>
        <Text style={styles.denyTitle}>Access Denied</Text>
        <Text style={styles.denySub}>
          This panel is restricted to admins only.
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <View style={styles.adminBadge}>
          <Text style={styles.adminBadgeText}>⚙️ Admin</Text>
        </View>
      </View>

      {/* Tab Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={tabStyles.tabBarScroll}
        contentContainerStyle={tabStyles.tabBar}
      >
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              tabStyles.tab,
              activeTab === tab.key && tabStyles.tabActive,
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text
              style={[
                tabStyles.tabText,
                activeTab === tab.key && tabStyles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === "overview" && (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={tabStyles.statsGrid}>
            <View style={tabStyles.statCard}>
              <Text style={tabStyles.statEmoji}>📚</Text>
              <Text style={tabStyles.statNumber}>{totalBooks}</Text>
              <Text style={tabStyles.statLabel}>Books</Text>
            </View>
            <View style={tabStyles.statCard}>
              <Text style={tabStyles.statEmoji}>🗂</Text>
              <Text style={tabStyles.statNumber}>{totalCategories}</Text>
              <Text style={tabStyles.statLabel}>Categories</Text>
            </View>
            <View style={tabStyles.statCard}>
              <Text style={tabStyles.statEmoji}>🛍️</Text>
              <Text style={tabStyles.statNumber}>{totalOrders}</Text>
              <Text style={tabStyles.statLabel}>Orders</Text>
            </View>
            <View style={tabStyles.statCard}>
              <Text style={tabStyles.statEmoji}>💰</Text>
              <Text style={tabStyles.statNumber}>
                ₦{totalRevenue.toLocaleString()}
              </Text>
              <Text style={tabStyles.statLabel}>Revenue</Text>
            </View>

            <View style={tabStyles.statCard}>
              <Text style={tabStyles.statEmoji}>✍️</Text>
              <Text style={tabStyles.statNumber}>{totalAuthors}</Text>
              <Text style={tabStyles.statLabel}>Authors</Text>
            </View>
          </View>

          <Text style={tabStyles.sectionTitle}>Quick Actions</Text>
          <View style={tabStyles.actionsRow}>
            <TouchableOpacity
              style={tabStyles.actionBtn}
              onPress={() => setActiveTab("books")}
            >
              <Text style={tabStyles.actionBtnEmoji}>➕</Text>
              <Text style={tabStyles.actionBtnText}>Add Book</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={tabStyles.actionBtn}
              onPress={() => setActiveTab("categories")}
            >
              <Text style={tabStyles.actionBtnEmoji}>🗂</Text>
              <Text style={tabStyles.actionBtnText}>Add Category</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={tabStyles.actionBtn}
              onPress={() => setActiveTab("analytics")}
            >
              <Text style={tabStyles.actionBtnEmoji}>📈</Text>
              <Text style={tabStyles.actionBtnText}>Analytics</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={tabStyles.actionBtn}
              onPress={() => {
                fetchStats();
                fetchBooks();
                fetchCategories();
              }}
            >
              <Text style={tabStyles.actionBtnEmoji}>🔄</Text>
              <Text style={tabStyles.actionBtnText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          <Text style={tabStyles.sectionTitle}>Recent Orders</Text>
          {recentOrders.length === 0 ? (
            <View style={tabStyles.emptyCard}>
              <Text style={tabStyles.emptyText}>No orders yet</Text>
            </View>
          ) : (
            recentOrders.map((order) => (
              <View key={order.id} style={tabStyles.orderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={tabStyles.orderUser} numberOfLines={1}>
                    {order.user_id?.slice(0, 8)}...
                  </Text>
                  <Text style={tabStyles.orderDate}>
                    {new Date(order.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View
                  style={[
                    tabStyles.statusBadge,
                    order.status === "fulfilled" && tabStyles.statusFulfilled,
                    order.status === "refunded" && tabStyles.statusRefunded,
                  ]}
                >
                  <Text
                    style={[
                      tabStyles.statusText,
                      order.status === "fulfilled" && tabStyles.statusTextGreen,
                      order.status === "refunded" && tabStyles.statusTextRed,
                    ]}
                  >
                    {order.status}
                  </Text>
                </View>
                <Text style={tabStyles.orderTotal}>
                  ₦{order.total?.toLocaleString()}
                </Text>
              </View>
            ))
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ── BOOKS TAB ── */}
      {activeTab === "books" && (
        <BooksTab
          categories={categories}
          loadingCategories={loadingCategories}
          books={books}
          loadingBooks={loadingBooks}
          setBooks={setBooks}
          setTotalBooks={setTotalBooks}
          fetchBooks={fetchBooks}
        />
      )}

      {/* ── CATEGORIES TAB ── */}
      {activeTab === "categories" && (
        <CategoriesTab
          categories={categories}
          loadingCategories={loadingCategories}
          books={books}
          setCategories={setCategories}
          setTotalCategories={setTotalCategories}
        />
      )}

      {/* ── ORDERS TAB ── */}
      {activeTab === "orders" && <OrdersTab />}

      {/* ── USERS TAB ── */}
      {activeTab === "users" && <UsersTab />}

      {/* ── ANALYTICS TAB ── */}
      {activeTab === "analytics" && <AnalyticsTab />}

      {/* ── NOTIFICATIONS TAB ── */}
      {activeTab === "notifications" && <NotificationsTab />}

      {/* ── AUTHORS TAB ── */}
      {activeTab === "authors" && <AdminAuthorsScreen />}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  tabBarScroll: {
    backgroundColor: "#0D0D14",
    borderBottomWidth: 1,
    borderBottomColor: "#1E1E30",
    flexGrow: 0,
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
  },
  tab: { paddingVertical: 12, paddingHorizontal: 14, marginRight: 4 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#2E86AB" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#445566" },
  tabTextActive: { color: "#2E86AB" },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: "47%",
    backgroundColor: "#12121A",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1E1E30",
    padding: 16,
    alignItems: "center",
  },
  statEmoji: { fontSize: 28, marginBottom: 8 },
  statNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#E8E8FF",
    marginBottom: 4,
  },
  statLabel: { fontSize: 12, color: "#445566", fontWeight: "600" },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2E86AB",
    letterSpacing: 1.5,
    marginBottom: 12,
    marginTop: 8,
  },
  actionsRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  actionBtn: {
    flex: 1,
    backgroundColor: "#12121A",
    borderWidth: 1,
    borderColor: "#1E1E30",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  actionBtnEmoji: { fontSize: 22 },
  actionBtnText: { fontSize: 11, color: "#C0C0DD", fontWeight: "600" },
  emptyCard: {
    backgroundColor: "#12121A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E1E30",
    padding: 24,
    alignItems: "center",
  },
  emptyText: { color: "#445566", fontSize: 13 },
  orderRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#12121A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E1E30",
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  orderUser: { fontSize: 13, fontWeight: "600", color: "#D0D0EE" },
  orderDate: { fontSize: 11, color: "#445566", marginTop: 2 },
  orderTotal: { fontSize: 14, fontWeight: "800", color: "#2E86AB" },
  statusBadge: {
    backgroundColor: "#1A1200",
    borderWidth: 1,
    borderColor: "#3B2A0A",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusFulfilled: { backgroundColor: "#0A1A0A", borderColor: "#1A6B3A" },
  statusRefunded: { backgroundColor: "#1A0A0A", borderColor: "#6B1A1A" },
  statusText: { fontSize: 10, fontWeight: "700", color: "#B8860B" },
  statusTextGreen: { color: "#22BFA0" },
  statusTextRed: { color: "#FF6B6B" },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0F" },
  center: {
    flex: 1,
    backgroundColor: "#0A0A0F",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: { color: "#445566", fontSize: 14, textAlign: "center" },
  denyEmoji: { fontSize: 48, marginBottom: 12 },
  denyTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#E8E8FF",
    marginBottom: 8,
  },
  denySub: {
    fontSize: 14,
    color: "#445566",
    marginBottom: 24,
    textAlign: "center",
  },
  backBtn: {
    backgroundColor: "#12121A",
    borderWidth: 1,
    borderColor: "#1A1A28",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backBtnText: { color: "#E8E8FF", fontWeight: "700" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#12121A",
  },
  backText: { color: "#2E86AB", fontSize: 14, fontWeight: "600" },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#E8E8FF" },
  adminBadge: {
    backgroundColor: "#0D2233",
    borderWidth: 1,
    borderColor: "#2E86AB",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  adminBadgeText: { color: "#2E86AB", fontSize: 11, fontWeight: "700" },
  scroll: { padding: 20 },
});
