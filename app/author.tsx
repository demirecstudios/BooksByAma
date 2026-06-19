import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../supabase";

// ─── Constants ────────────────────────────────────────────────────────────────

const AUTHOR_SHARE = 0.75; // 75% of each sale goes to author

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthorProfile = {
  id: string;
  name: string;
  bio: string | null;
  photo_url: string | null;
  created_at: string;
};

type Book = {
  id: string;
  title: string;
  cover_image: string | null;
  price: number;
  description: string | null;
  sales: number;
  gross: number;
  earnings: number;
};

type OrderItem = {
  id: string;
  title?: string;
  price?: number;
};

type Order = {
  id: string;
  items: OrderItem[];
  total: number;
  status: string;
  created_at: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function fmt(n: number) {
  return `₦${n.toLocaleString()}`;
}

// ─── Profile Edit Modal ───────────────────────────────────────────────────────

function EditProfileModal({
  visible,
  profile,
  onClose,
  onSaved,
}: {
  visible: boolean;
  profile: AuthorProfile;
  onClose: () => void;
  onSaved: (updated: Partial<AuthorProfile>) => void;
}) {
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localPhoto, setLocalPhoto] = useState<string | null>(null);

  async function handlePickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Permission to access photos is required.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true, // ← get base64 directly from picker
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const uri = asset.uri;
    const base64 = asset.base64; // ← no FileSystem needed

    if (!base64) {
      setError("Failed to read image data.");
      return;
    }

    setUploadingPhoto(true);
    setError(null);

    try {
      const ext = uri.split(".").pop()?.toLowerCase() ?? "jpg";
      const filePath = `${profile.id}/avatar.${ext}`;
      const contentType = `image/${ext === "jpg" ? "jpeg" : ext}`;

      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const { error: uploadError } = await supabase.storage
        .from("author-photos")
        .upload(filePath, bytes.buffer, {
          upsert: true,
          contentType,
        });

      if (uploadError) {
        setError("Photo upload failed: " + uploadError.message);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("author-photos")
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl + `?t=${Date.now()}`;

      const { error: dbError } = await supabase
        .from("authors")
        .update({ photo_url: publicUrl })
        .eq("id", profile.id);

      if (dbError) {
        setError("Failed to save photo URL: " + dbError.message);
        return;
      }

      setLocalPhoto(publicUrl);
      onSaved({ photo_url: publicUrl });
    } catch (e: any) {
      setError("Something went wrong: " + e.message);
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      setError("Name cannot be empty.");
      return;
    }
    setSaving(true);
    setError(null);
    const { error: err } = await supabase
      .from("authors")
      .update({ name: name.trim(), bio: bio.trim() || null })
      .eq("id", profile.id);
    setSaving(false);
    if (err) {
      setError(err.message);
    } else {
      onSaved({ name: name.trim(), bio: bio.trim() || null });
      onClose();
    }
  }

  const photoToShow = localPhoto ?? profile.photo_url;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Edit Profile</Text>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Photo Picker */}
          <TouchableOpacity
            style={styles.photoPicker}
            onPress={handlePickPhoto}
            disabled={uploadingPhoto}
          >
            {uploadingPhoto ? (
              <ActivityIndicator color="#2E86AB" />
            ) : photoToShow ? (
              <Image
                source={{ uri: photoToShow }}
                style={styles.photoPickerImage}
              />
            ) : (
              <View style={styles.photoPickerPlaceholder}>
                <Text style={styles.photoPickerEmoji}>📷</Text>
                <Text style={styles.photoPickerText}>Tap to add photo</Text>
              </View>
            )}
            <View style={styles.photoPickerBadge}>
              <Text style={styles.photoPickerBadgeText}>✎</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>Display Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor="#555"
          />

          <Text style={styles.fieldLabel}>Bio</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell readers about yourself…"
            placeholderTextColor="#555"
            multiline
            numberOfLines={4}
          />

          <View style={styles.modalActions}>
            <Pressable style={styles.btnOutline} onPress={onClose}>
              <Text style={styles.btnOutlineText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.btnPrimary, saving && styles.btnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnPrimaryText}>Save Changes</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Book Earnings Card ───────────────────────────────────────────────────────

function BookCard({ book }: { book: Book }) {
  return (
    <View style={styles.bookCard}>
      {book.cover_image ? (
        <Image source={{ uri: book.cover_image }} style={styles.bookCover} />
      ) : (
        <View style={[styles.bookCover, styles.bookCoverFallback]}>
          <Text style={styles.bookCoverEmoji}>📖</Text>
        </View>
      )}

      <View style={{ flex: 1 }}>
        <Text style={styles.bookTitle} numberOfLines={2}>
          {book.title}
        </Text>
        <Text style={styles.bookPrice}>{fmt(book.price)}</Text>

        <View style={styles.bookStats}>
          <View style={styles.bookStat}>
            <Text style={styles.bookStatValue}>{book.sales}</Text>
            <Text style={styles.bookStatLabel}>Sales</Text>
          </View>
          <View style={styles.bookStatDivider} />
          <View style={styles.bookStat}>
            <Text style={styles.bookStatValue}>{fmt(book.gross)}</Text>
            <Text style={styles.bookStatLabel}>Gross</Text>
          </View>
          <View style={styles.bookStatDivider} />
          <View style={styles.bookStat}>
            <Text style={[styles.bookStatValue, { color: "#22BFA0" }]}>
              {fmt(book.earnings)}
            </Text>
            <Text style={styles.bookStatLabel}>Your Cut</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AuthorScreen() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [profile, setProfile] = useState<AuthorProfile | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [totalSales, setTotalSales] = useState(0);
  const [totalGross, setTotalGross] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);

  const [editVisible, setEditVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"books" | "earnings">("books");

  // ── Auth check ──────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const user = session?.user;
      if (!user) {
        setChecking(false);
        return;
      }

      // Check author profile exists for this user
      const { data: authorData, error } = await supabase
        .from("authors")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error || !authorData) {
        setAuthorized(false);
        setChecking(false);
        return;
      }

      setProfile(authorData);
      setAuthorized(true);
      setChecking(false);

      await loadDashboard(authorData);
    });
  }, []);

  // ── Load books + earnings ────────────────────────────────────────────────────
  async function loadDashboard(author: AuthorProfile) {
    setLoadingData(true);

    // 1. Fetch author's books
    const { data: booksData, error: booksErr } = await supabase
      .from("books")
      .select("id, title, cover_image, price, description")
      .eq("author_id", author.id)
      .order("title");

    if (booksErr || !booksData) {
      setLoadingData(false);
      return;
    }

    // 2. Fetch all fulfilled orders
    const { data: ordersData } = await supabase
      .from("orders")
      .select("id, items, total, status, created_at")
      .eq("status", "fulfilled");

    const orders: Order[] = ordersData ?? [];

    // 3. Build a map: book_id → { sales, gross }
    const salesMap: Record<string, { sales: number; gross: number }> = {};

    for (const order of orders) {
      const items: OrderItem[] = Array.isArray(order.items) ? order.items : [];
      for (const item of items) {
        if (!item.id) continue;
        if (!salesMap[item.id]) salesMap[item.id] = { sales: 0, gross: 0 };
        salesMap[item.id].sales += 1;
        salesMap[item.id].gross += item.price ?? 0;
      }
    }

    // 4. Enrich books with sales data
    const enriched: Book[] = booksData.map((b) => {
      const s = salesMap[b.id] ?? { sales: 0, gross: 0 };
      return {
        ...b,
        sales: s.sales,
        gross: s.gross,
        earnings: Math.round(s.gross * AUTHOR_SHARE),
      };
    });

    // 5. Totals
    const tSales = enriched.reduce((a, b) => a + b.sales, 0);
    const tGross = enriched.reduce((a, b) => a + b.gross, 0);
    const tEarnings = enriched.reduce((a, b) => a + b.earnings, 0);

    setBooks(enriched);
    setTotalSales(tSales);
    setTotalGross(tGross);
    setTotalEarnings(tEarnings);
    setLoadingData(false);
  }

  // ── Render: checking ─────────────────────────────────────────────────────────
  if (checking) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#2E86AB" size="large" />
      </View>
    );
  }

  // ── Render: not authorized ───────────────────────────────────────────────────
  if (!authorized || !profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.denyEmoji}>✍️</Text>
        <Text style={styles.denyTitle}>Author Access Only</Text>
        <Text style={styles.denySub}>
          Your account isn't registered as an author. Contact the admin to get
          set up.
        </Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace("/bookstore")}
        >
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Render: dashboard ────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace("/bookstore")}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Author Dashboard</Text>
        <View style={styles.authorBadge}>
          <Text style={styles.authorBadgeText}>✍️ Author</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileRow}>
            {profile.photo_url ? (
              <Image
                source={{ uri: profile.photo_url }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>{initials(profile.name)}</Text>
              </View>
            )}
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.profileName}>{profile.name}</Text>
              {profile.bio ? (
                <Text style={styles.profileBio} numberOfLines={3}>
                  {profile.bio}
                </Text>
              ) : (
                <Text style={styles.profileBioEmpty}>No bio yet</Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={() => setEditVisible(true)}
          >
            <Text style={styles.editProfileBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>📚</Text>
            <Text style={styles.statNumber}>{books.length}</Text>
            <Text style={styles.statLabel}>Books</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>🛍️</Text>
            <Text style={styles.statNumber}>{totalSales}</Text>
            <Text style={styles.statLabel}>Total Sales</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>💰</Text>
            <Text style={[styles.statNumber, { fontSize: 15 }]}>
              {fmt(totalEarnings)}
            </Text>
            <Text style={styles.statLabel}>Earnings</Text>
          </View>
        </View>

        {/* Earnings Summary */}
        <View style={styles.earningsSummary}>
          <View style={styles.earningsRow}>
            <Text style={styles.earningsLabel}>Gross Sales</Text>
            <Text style={styles.earningsValue}>{fmt(totalGross)}</Text>
          </View>
          <View style={styles.earningsDivider} />
          <View style={styles.earningsRow}>
            <Text style={styles.earningsLabel}>Platform Fee (25%)</Text>
            <Text style={[styles.earningsValue, { color: "#FF6B6B" }]}>
              − {fmt(Math.round(totalGross * 0.25))}
            </Text>
          </View>
          <View style={styles.earningsDivider} />
          <View style={styles.earningsRow}>
            <Text style={[styles.earningsLabel, { color: "#E8E8FF" }]}>
              Your Earnings (75%)
            </Text>
            <Text style={[styles.earningsValue, { color: "#22BFA0" }]}>
              {fmt(totalEarnings)}
            </Text>
          </View>
        </View>

        {/* Tab Toggle */}
        <View style={styles.tabToggle}>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              activeTab === "books" && styles.toggleBtnActive,
            ]}
            onPress={() => setActiveTab("books")}
          >
            <Text
              style={[
                styles.toggleBtnText,
                activeTab === "books" && styles.toggleBtnTextActive,
              ]}
            >
              My Books
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              activeTab === "earnings" && styles.toggleBtnActive,
            ]}
            onPress={() => setActiveTab("earnings")}
          >
            <Text
              style={[
                styles.toggleBtnText,
                activeTab === "earnings" && styles.toggleBtnTextActive,
              ]}
            >
              Earnings Breakdown
            </Text>
          </TouchableOpacity>
        </View>

        {/* Books Tab */}
        {activeTab === "books" && (
          <>
            {loadingData ? (
              <ActivityIndicator color="#2E86AB" style={{ marginTop: 32 }} />
            ) : books.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📖</Text>
                <Text style={styles.emptyTitle}>No books yet</Text>
                <Text style={styles.emptyHint}>
                  Ask the admin to assign books to your author profile.
                </Text>
              </View>
            ) : (
              books.map((book) => <BookCard key={book.id} book={book} />)
            )}
          </>
        )}

        {/* Earnings Breakdown Tab */}
        {activeTab === "earnings" && (
          <>
            {loadingData ? (
              <ActivityIndicator color="#2E86AB" style={{ marginTop: 32 }} />
            ) : books.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>💸</Text>
                <Text style={styles.emptyTitle}>No earnings yet</Text>
                <Text style={styles.emptyHint}>
                  Earnings will appear once your books start selling.
                </Text>
              </View>
            ) : (
              <View style={styles.earningsTable}>
                {/* Table Header */}
                <View style={[styles.tableRow, styles.tableHeader]}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>Book</Text>
                  <Text style={[styles.tableCell, styles.tableCellRight]}>
                    Sales
                  </Text>
                  <Text style={[styles.tableCell, styles.tableCellRight]}>
                    Gross
                  </Text>
                  <Text style={[styles.tableCell, styles.tableCellRight]}>
                    Earned
                  </Text>
                </View>

                {books.map((book, i) => (
                  <View
                    key={book.id}
                    style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}
                  >
                    <Text
                      style={[styles.tableCell, { flex: 2 }]}
                      numberOfLines={2}
                    >
                      {book.title}
                    </Text>
                    <Text style={[styles.tableCell, styles.tableCellRight]}>
                      {book.sales}
                    </Text>
                    <Text style={[styles.tableCell, styles.tableCellRight]}>
                      {fmt(book.gross)}
                    </Text>
                    <Text
                      style={[
                        styles.tableCell,
                        styles.tableCellRight,
                        { color: "#22BFA0" },
                      ]}
                    >
                      {fmt(book.earnings)}
                    </Text>
                  </View>
                ))}

                {/* Totals Row */}
                <View style={[styles.tableRow, styles.tableTotalsRow]}>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.tableTotalLabel,
                      { flex: 2 },
                    ]}
                  >
                    Total
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.tableCellRight,
                      styles.tableTotalLabel,
                    ]}
                  >
                    {totalSales}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.tableCellRight,
                      styles.tableTotalLabel,
                    ]}
                  >
                    {fmt(totalGross)}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.tableCellRight,
                      { color: "#22BFA0", fontWeight: "700" },
                    ]}
                  >
                    {fmt(totalEarnings)}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>

      {/* Edit Profile Modal */}
      {profile && (
        <EditProfileModal
          visible={editVisible}
          profile={profile}
          onClose={() => setEditVisible(false)}
          onSaved={(updated) =>
            setProfile((p) => (p ? { ...p, ...updated } : p))
          }
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0F" },
  scroll: { padding: 20 },

  center: {
    flex: 1,
    backgroundColor: "#0A0A0F",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  // Access denied
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
    lineHeight: 20,
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

  // Header
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
  authorBadge: {
    backgroundColor: "#0A1A14",
    borderWidth: 1,
    borderColor: "#22BFA0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  authorBadgeText: { color: "#22BFA0", fontSize: 11, fontWeight: "700" },

  // Profile Card
  profileCard: {
    backgroundColor: "#12121A",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1E1E30",
    padding: 16,
    marginBottom: 16,
  },
  profileRow: { flexDirection: "row", alignItems: "flex-start" },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  avatarFallback: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#1E3A4A",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#2E86AB", fontSize: 22, fontWeight: "700" },
  profileName: {
    color: "#E8E8FF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  profileBio: { color: "#778899", fontSize: 13, lineHeight: 19 },
  profileBioEmpty: {
    color: "#445566",
    fontSize: 13,
    fontStyle: "italic",
  },
  editProfileBtn: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#1E1E30",
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
  },
  editProfileBtnText: { color: "#778899", fontSize: 13, fontWeight: "600" },

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
  statEmoji: { fontSize: 22, marginBottom: 6 },
  statNumber: {
    fontSize: 18,
    fontWeight: "800",
    color: "#E8E8FF",
    marginBottom: 2,
  },
  statLabel: { fontSize: 10, color: "#445566", fontWeight: "600" },

  // Earnings Summary
  earningsSummary: {
    backgroundColor: "#12121A",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E1E30",
    padding: 16,
    marginBottom: 20,
  },
  earningsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  earningsDivider: {
    height: 1,
    backgroundColor: "#1E1E30",
  },
  earningsLabel: { fontSize: 13, color: "#778899" },
  earningsValue: { fontSize: 14, fontWeight: "700", color: "#E8E8FF" },

  // Tab Toggle
  tabToggle: {
    flexDirection: "row",
    backgroundColor: "#12121A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E1E30",
    padding: 4,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    borderRadius: 9,
  },
  toggleBtnActive: { backgroundColor: "#1A2E3A" },
  toggleBtnText: { fontSize: 13, fontWeight: "600", color: "#445566" },
  toggleBtnTextActive: { color: "#2E86AB" },

  // Book Card
  bookCard: {
    flexDirection: "row",
    backgroundColor: "#12121A",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E1E30",
    padding: 14,
    marginBottom: 12,
    gap: 14,
  },
  bookCover: {
    width: 56,
    height: 76,
    borderRadius: 6,
  },
  bookCoverFallback: {
    backgroundColor: "#1A1A28",
    alignItems: "center",
    justifyContent: "center",
  },
  bookCoverEmoji: { fontSize: 22 },
  bookTitle: {
    color: "#E8E8FF",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 3,
    lineHeight: 20,
  },
  bookPrice: {
    color: "#445566",
    fontSize: 12,
    marginBottom: 10,
  },
  bookStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bookStat: { alignItems: "center" },
  bookStatValue: {
    color: "#E8E8FF",
    fontSize: 13,
    fontWeight: "700",
  },
  bookStatLabel: {
    color: "#445566",
    fontSize: 10,
    marginTop: 1,
  },
  bookStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#1E1E30",
  },

  // Earnings Table
  earningsTable: {
    backgroundColor: "#12121A",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E1E30",
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  tableHeader: {
    backgroundColor: "#0D0D18",
    borderBottomWidth: 1,
    borderBottomColor: "#1E1E30",
  },
  tableRowAlt: { backgroundColor: "#0F0F1A" },
  tableTotalsRow: {
    borderTopWidth: 1,
    borderTopColor: "#1E1E30",
    backgroundColor: "#0D0D18",
  },
  tableCell: {
    flex: 1,
    color: "#778899",
    fontSize: 12,
  },
  tableCellRight: {
    textAlign: "right",
  },
  tableTotalLabel: {
    color: "#E8E8FF",
    fontWeight: "700",
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: {
    color: "#E8E8FF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptyHint: {
    color: "#445566",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#13131C",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: "#2A2A3A",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  fieldLabel: {
    color: "#888",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#0A0A0F",
    color: "#fff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#1E1E2E",
  },
  inputMulti: {
    height: 100,
    textAlignVertical: "top",
    paddingTop: 10,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: "#2E86AB",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  btnPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  btnOutline: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#2A2A3A",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  btnOutlineText: { color: "#888", fontWeight: "600", fontSize: 15 },
  btnDisabled: { opacity: 0.5 },
  errorBox: {
    backgroundColor: "#1A0A0A",
    borderWidth: 1,
    borderColor: "#3A1A1A",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  errorText: { color: "#FF6B6B", fontSize: 13 },

  // Photo Picker
  photoPicker: {
    alignSelf: "center",
    marginBottom: 16,
    position: "relative",
  },
  photoPickerImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: "#2E86AB",
  },
  photoPickerPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#1E3A4A",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#2E86AB",
    borderStyle: "dashed",
  },
  photoPickerEmoji: { fontSize: 24 },
  photoPickerText: {
    color: "#2E86AB",
    fontSize: 9,
    marginTop: 4,
    fontWeight: "600",
  },
  photoPickerBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#2E86AB",
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  photoPickerBadgeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
});
