import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../supabase";
import { useCart } from "../context/CartContext";

const ADMIN_EMAIL = "demirecstudios@gmail.com";

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

type BookPage = {
  id: string;
  page_number: number;
  text: string | null;
  image_url: string | null;
};

export default function BookDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addToCart, cart } = useCart();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [reading, setReading] = useState(false);
  const [pages, setPages] = useState<BookPage[]>([]);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasPurchased, setHasPurchased] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const isAnimating = useRef(false);
  const currentPageRef = useRef(0);
  const pagesRef = useRef<BookPage[]>([]);
  const touchStartX = useRef(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email || "");
      if (session?.user?.id) checkPurchase(session.user.id);
    });
    fetchBook();
  }, []);

  async function checkPurchase(userId: string) {
    const { data } = await supabase
      .from("purchases")
      .select("id")
      .eq("user_id", userId)
      .eq("book_id", id)
      .single();
    if (data) setHasPurchased(true);
  }

  async function fetchBook() {
    const { data, error } = await supabase
      .from("books")
      .select("*")
      .eq("id", id)
      .single();
    if (error) {
      Alert.alert("Error", "Could not load book.");
      router.back();
    } else {
      setBook(data);
    }
    setLoading(false);
  }

  async function fetchPages() {
    if (!book) return;
    setPagesLoading(true);
    const { data, error } = await supabase
      .from("book_pages")
      .select("*")
      .eq("book_id", book.id)
      .order("page_number", { ascending: true });
    if (!error && data) {
      setPages(data);
      pagesRef.current = data;
    }
    setPagesLoading(false);
  }

  function openReader() {
    currentPageRef.current = 0;
    setCurrentPage(0);
    setReading(true);
    fetchPages();
  }

  function flipTo(nextPage: number) {
    if (isAnimating.current) return;
    const totalPages = pagesRef.current.length + 1;
    if (nextPage < 0 || nextPage >= totalPages) return;
    const direction = nextPage > currentPageRef.current ? 1 : -1;
    isAnimating.current = true;
    currentPageRef.current = nextPage;
    setCurrentPage(nextPage);
    slideAnim.setValue(direction * 400);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start(() => {
      isAnimating.current = false;
    });
  }

  function handleAddToCart() {
    if (!book) return;
    addToCart({
      id: book.id,
      title: book.title,
      author: book.author || "Unknown",
      category: book.category,
      price: book.price,
      color: book.color || "#1E3A5F",
    });
    Alert.alert(
      "Added to Cart 🛒",
      `"${book.title}" has been added to your cart.`,
      [
        { text: "Keep Browsing", style: "cancel" },
        { text: "View Cart", onPress: () => router.push("/cart") },
      ],
    );
  }

  if (loading || !book) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingEmoji}>📖</Text>
        <Text style={styles.loadingText}>Loading book...</Text>
      </View>
    );
  }

  const isAdmin = userEmail === ADMIN_EMAIL;
  const isFree = book.price === 0;
  const alreadyInCart = cart.some((i) => i.id === book.id);
  const canRead = isFree || isAdmin || hasPurchased;

  const totalPages = pagesRef.current.length + 1;
  const isCover = currentPage === 0;
  const currentBookPage = isCover ? null : pages[currentPage - 1];
  const progress = totalPages > 1 ? currentPage / (totalPages - 1) : 0;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />

      <View
        style={[styles.cover, { backgroundColor: book.color || "#1E3A5F" }]}
      >
        <View style={styles.coverGlow} />
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        {book.cover_image ? (
          <Image
            source={{ uri: book.cover_image }}
            style={styles.coverImage}
            resizeMode="cover"
          />
        ) : (
          <Text style={styles.coverEmoji}>📖</Text>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Age {book.age}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{book.category}</Text>
          </View>
        </View>

        <Text style={styles.title}>{book.title}</Text>
        <Text style={styles.price}>
          {isFree ? "Free" : `$${book.price.toFixed(2)}`}
        </Text>

        <View style={styles.divider} />
        <Text style={styles.sectionLabel}>About this book</Text>
        <Text style={styles.description}>{book.description}</Text>

        <View style={styles.infoRow}>
          <View style={styles.infoCard}>
            <Text style={styles.infoEmoji}>🎯</Text>
            <Text style={styles.infoLabel}>Age Range</Text>
            <Text style={styles.infoValue}>{book.age} years</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoEmoji}>📚</Text>
            <Text style={styles.infoLabel}>Category</Text>
            <Text style={styles.infoValue}>{book.category}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoEmoji}>🌟</Text>
            <Text style={styles.infoLabel}>Format</Text>
            <Text style={styles.infoValue}>Digital</Text>
          </View>
        </View>

        {book.author && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>✍️ Author</Text>
            <Text style={styles.metaValue}>{book.author}</Text>
          </View>
        )}
        {book.publisher && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>🏢 Publisher</Text>
            <Text style={styles.metaValue}>{book.publisher}</Text>
          </View>
        )}
        {isAdmin && (
          <Text style={styles.adminNote}>
            ⚙️ Admin — you can always read all books
          </Text>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {canRead ? (
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              { backgroundColor: book.color || "#2E86AB" },
            ]}
            onPress={openReader}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>📖 Read Now</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                {
                  flex: 1,
                  backgroundColor: alreadyInCart ? "#0D3B1A" : "#2E86AB",
                },
              ]}
              onPress={
                alreadyInCart ? () => router.push("/cart") : handleAddToCart
              }
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>
                {alreadyInCart
                  ? "🛒 View Cart"
                  : `🛒 Add to Cart · $${book.price.toFixed(2)}`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => Alert.alert("Preview", "Preview coming soon!")}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryBtnText}>Preview</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Reading Modal */}
      <Modal
        visible={reading}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setReading(false)}
      >
        <View style={styles.readerRoot}>
          <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />
          <View style={styles.readerHeader}>
            <TouchableOpacity
              onPress={() => setReading(false)}
              style={styles.readerClose}
            >
              <Text style={styles.readerCloseText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.readerTitle} numberOfLines={1}>
              {book.title}
            </Text>
            <Text style={styles.pageCounter}>
              {isCover ? "Cover" : `${currentPage} / ${pages.length}`}
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress * 100}%`, backgroundColor: book.color },
              ]}
            />
          </View>

          {pagesLoading ? (
            <View style={styles.readerCenter}>
              <Text style={styles.loadingEmoji}>📖</Text>
              <Text style={styles.loadingText}>Loading pages...</Text>
            </View>
          ) : pages.length === 0 ? (
            <View style={styles.readerCenter}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🚧</Text>
              <Text style={styles.noContentTitle}>No pages yet</Text>
              <Text style={styles.noContentSub}>
                {isAdmin
                  ? "Add pages from the Admin panel."
                  : "The author is still writing. Check back soon!"}
              </Text>
            </View>
          ) : (
            <Animated.View
              style={[
                styles.pageWrapper,
                { transform: [{ translateX: slideAnim }] },
              ]}
              onTouchStart={(e) => {
                touchStartX.current = e.nativeEvent.pageX;
              }}
              onTouchEnd={(e) => {
                const dx = e.nativeEvent.pageX - touchStartX.current;
                if (dx < -50) flipTo(currentPageRef.current + 1);
                else if (dx > 50) flipTo(currentPageRef.current - 1);
              }}
            >
              {isCover ? (
                <View style={styles.coverPage}>
                  {book.cover_image ? (
                    <Image
                      source={{ uri: book.cover_image }}
                      style={styles.coverPageImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={[
                        styles.coverPagePlaceholder,
                        { backgroundColor: book.color },
                      ]}
                    >
                      <Text style={{ fontSize: 80 }}>📖</Text>
                    </View>
                  )}
                  <View style={styles.coverPageOverlay}>
                    <Text style={styles.coverPageTitle}>{book.title}</Text>
                    <Text style={styles.coverPageSwipe}>
                      Swipe to start reading →
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.bookPage}>
                  {currentBookPage?.image_url ? (
                    <Image
                      source={{ uri: currentBookPage.image_url }}
                      style={styles.pageImage}
                      resizeMode="contain"
                    />
                  ) : null}
                  {currentBookPage?.text ? (
                    <View style={styles.pageTextOverlay}>
                      <Text style={styles.pageText}>
                        {currentBookPage.text}
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.pageNumberBadge}>
                    <Text style={styles.pageNumber}>{currentPage}</Text>
                  </View>
                </View>
              )}
            </Animated.View>
          )}

          {pages.length > 0 && (
            <View style={styles.navRow}>
              <TouchableOpacity
                style={[
                  styles.navBtn,
                  currentPage === 0 && styles.navBtnDisabled,
                ]}
                onPress={() => flipTo(currentPageRef.current - 1)}
                disabled={currentPage === 0}
              >
                <Text style={styles.navBtnText}>‹ Prev</Text>
              </TouchableOpacity>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dotsRow}
              >
                {Array.from({ length: totalPages }).map((_, i) => (
                  <TouchableOpacity key={i} onPress={() => flipTo(i)}>
                    <View
                      style={[
                        styles.dot,
                        i === currentPage && {
                          backgroundColor: book.color,
                          width: 16,
                        },
                      ]}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {currentPage === totalPages - 1 ? (
                <TouchableOpacity
                  style={[
                    styles.navBtn,
                    { backgroundColor: book.color, borderColor: book.color },
                  ]}
                  onPress={() => {
                    setReading(false);
                    router.push(
                      `/quiz/${book.id}?bookId=${book.id}&bookTitle=${encodeURIComponent(book.title)}`,
                    );
                  }}
                >
                  <Text style={[styles.navBtnText, { color: "#fff" }]}>
                    Finish ✓
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.navBtn,
                    currentPage === totalPages - 1 && styles.navBtnDisabled,
                  ]}
                  onPress={() => flipTo(currentPageRef.current + 1)}
                  disabled={currentPage === totalPages - 1}
                >
                  <Text style={styles.navBtnText}>Next ›</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0F" },
  loadingScreen: {
    flex: 1,
    backgroundColor: "#0A0A0F",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingEmoji: { fontSize: 48, marginBottom: 12 },
  loadingText: { color: "#445566", fontSize: 14 },
  cover: {
    height: 260,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  coverGlow: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#fff",
    opacity: 0.06,
  },
  coverImage: { position: "absolute", width: "100%", height: "100%" },
  backBtn: {
    position: "absolute",
    top: 52,
    left: 20,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  backText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  coverEmoji: { fontSize: 72 },
  scroll: { padding: 24 },
  badgeRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  badge: {
    backgroundColor: "#0D2233",
    borderWidth: 1,
    borderColor: "#1A3A55",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: { color: "#2E86AB", fontSize: 11, fontWeight: "700" },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#E8E8FF",
    letterSpacing: -0.5,
    marginBottom: 8,
    lineHeight: 32,
  },
  price: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2E86AB",
    marginBottom: 20,
  },
  divider: { height: 1, backgroundColor: "#1A1A28", marginBottom: 20 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2E86AB",
    letterSpacing: 1.5,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  description: {
    fontSize: 15,
    color: "#8899BB",
    lineHeight: 24,
    marginBottom: 28,
  },
  infoRow: { flexDirection: "row", gap: 10 },
  infoCard: {
    flex: 1,
    backgroundColor: "#12121A",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1A1A28",
    padding: 14,
    alignItems: "center",
  },
  infoEmoji: { fontSize: 22, marginBottom: 6 },
  infoLabel: {
    fontSize: 10,
    color: "#445566",
    fontWeight: "600",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 12,
    color: "#D0D0EE",
    fontWeight: "700",
    textAlign: "center",
  },
  adminNote: {
    marginTop: 20,
    textAlign: "center",
    fontSize: 12,
    color: "#334455",
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#12121A",
    backgroundColor: "#0A0A0F",
  },
  btnRow: { flexDirection: "row", gap: 10 },
  primaryBtn: { padding: 16, borderRadius: 14, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  secondaryBtn: {
    padding: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "#12121A",
    borderWidth: 1,
    borderColor: "#1E1E30",
  },
  secondaryBtnText: { color: "#E8E8FF", fontSize: 15, fontWeight: "700" },
  readerRoot: { flex: 1, backgroundColor: "#0A0A0F" },
  readerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#12121A",
  },
  readerClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#12121A",
    alignItems: "center",
    justifyContent: "center",
  },
  readerCloseText: { color: "#E8E8FF", fontSize: 14, fontWeight: "700" },
  readerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
    color: "#E8E8FF",
    marginHorizontal: 12,
  },
  pageCounter: {
    fontSize: 12,
    color: "#445566",
    fontWeight: "600",
    minWidth: 50,
    textAlign: "right",
  },
  progressTrack: { height: 3, backgroundColor: "#12121A", width: "100%" },
  progressFill: { height: 3, borderRadius: 2 },
  readerCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  noContentTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#E8E8FF",
    marginBottom: 8,
  },
  noContentSub: {
    fontSize: 14,
    color: "#445566",
    textAlign: "center",
    lineHeight: 22,
  },
  pageWrapper: { flex: 1, overflow: "hidden", backgroundColor: "#000" },
  coverPage: { flex: 1, position: "relative" },
  coverPageImage: { width: "100%", height: "100%" },
  coverPagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  coverPageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  coverPageTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 6,
  },
  coverPageSwipe: { fontSize: 13, color: "rgba(255,255,255,0.6)" },
  bookPage: { flex: 1, position: "relative", backgroundColor: "#000" },
  pageImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  pageTextOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingLeft: 28,
    paddingRight: 28,
    paddingVertical: 16,
  },
  pageText: {
    fontSize: 17,
    color: "#fff",
    lineHeight: 26,
    textAlign: "center",
    fontFamily: "serif",
  },
  pageNumberBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pageNumber: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    fontWeight: "600",
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#12121A",
    backgroundColor: "#0A0A0F",
    gap: 8,
  },
  navBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: "#12121A",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1E1E30",
  },
  navBtnDisabled: { opacity: 0.3 },
  navBtnText: { color: "#E8E8FF", fontSize: 14, fontWeight: "700" },
  dotsRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 8,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#1E1E30" },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#12121A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1A1A28",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 10,
  },
  metaLabel: { fontSize: 13, color: "#445566", fontWeight: "600" },
  metaValue: { fontSize: 13, color: "#D0D0EE", fontWeight: "700" },
});
