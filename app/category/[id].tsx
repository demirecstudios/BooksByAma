import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../supabase";

type Book = {
  id: string;
  title: string;
  description: string;
  age: string;
  category: string;
  color: string;
  price: number;
  cover_image: string | null;
};

type Category = {
  id: string;
  name: string;
  cover_url: string | null;
};

const SCREEN_WIDTH = Dimensions.get("window").width;
const GAP = 12;
const H_PADDING = 14;
const CARD_WIDTH = (SCREEN_WIDTH - H_PADDING * 2 - GAP) / 2;

export default function CategoryScreen() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const [books, setBooks] = useState<Book[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategoryAndBooks();
  }, []);

  async function fetchCategoryAndBooks() {
    setLoading(true);

    const [catRes, booksRes] = await Promise.all([
      supabase.from("categories").select("*").eq("id", id).single(),
      supabase
        .from("books")
        .select("*")
        .eq("category", name)
        .order("created_at", { ascending: false }),
    ]);

    if (!catRes.error && catRes.data) setCategory(catRes.data);
    if (!booksRes.error && booksRes.data) setBooks(booksRes.data);

    setLoading(false);
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />

      {/* Hero cover */}
      <View style={styles.hero}>
        {category?.cover_url ? (
          <Image
            source={{ uri: category.cover_url }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.heroPlaceholder}>
            <Text style={styles.heroPlaceholderEmoji}>📚</Text>
          </View>
        )}
        <View style={styles.heroOverlay} />
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>{name}</Text>
          <Text style={styles.heroSub}>
            {loading
              ? "Loading..."
              : `${books.length} book${books.length !== 1 ? "s" : ""}`}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <Text style={styles.loadingEmoji}>📖</Text>
            <Text style={styles.loadingText}>Loading books...</Text>
          </View>
        ) : books.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyTitle}>No books yet</Text>
            <Text style={styles.emptySub}>
              Check back soon for new titles in this category.
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {books.map((book) => (
              <TouchableOpacity
                key={book.id}
                style={styles.card}
                activeOpacity={0.75}
                onPress={() =>
                  router.push({
                    pathname: "/books/[id]",
                    params: { id: book.id },
                  })
                }
              >
                {/* Portrait book cover image */}
                <View
                  style={[styles.cardCover, { backgroundColor: book.color }]}
                >
                  {book.cover_image ? (
                    <Image
                      source={{ uri: book.cover_image }}
                      style={StyleSheet.absoluteFillObject}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={styles.cardEmoji}>📖</Text>
                  )}
                  {/* Price badge */}
                  <View style={styles.priceBadge}>
                    <Text style={styles.priceBadgeText}>
                      {book.price === 0 ? "Free" : `$${book.price.toFixed(2)}`}
                    </Text>
                  </View>
                </View>

                {/* Body */}
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {book.title}
                  </Text>
                  <View style={styles.cardMeta}>
                    <View style={styles.ageBadge}>
                      <Text style={styles.ageText}>Age {book.age}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0F" },

  hero: {
    height: 220,
    backgroundColor: "#12121A",
    overflow: "hidden",
    position: "relative",
    justifyContent: "flex-end",
  },
  heroPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#12121A",
  },
  heroPlaceholderEmoji: { fontSize: 64 },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  backBtn: {
    position: "absolute",
    top: 52,
    left: 20,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  backText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  heroContent: {
    padding: 20,
    paddingBottom: 24,
    zIndex: 1,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  heroSub: { fontSize: 13, color: "rgba(255,255,255,0.6)" },

  scroll: { paddingTop: 20 },

  loadingBox: { alignItems: "center", paddingVertical: 60 },
  loadingEmoji: { fontSize: 40, marginBottom: 12 },
  loadingText: { fontSize: 14, color: "#445566" },

  emptyBox: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#E8E8FF",
    marginBottom: 8,
  },
  emptySub: { fontSize: 13, color: "#445566", textAlign: "center" },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: H_PADDING,
    gap: GAP,
  },

  // Card is exactly half the screen width minus padding/gap
  card: {
    width: CARD_WIDTH,
    backgroundColor: "#12121A",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1A1A28",
  },

  // Portrait book cover (like a real paperback, taller than wide)
  cardCover: {
    width: CARD_WIDTH,
    aspectRatio: 0.7,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },

  cardEmoji: { fontSize: 48 },

  priceBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  priceBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },

  cardBody: { padding: 10 },
  cardTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#D0D0EE",
    marginBottom: 8,
    lineHeight: 17,
  },
  cardMeta: { flexDirection: "row" },
  ageBadge: {
    backgroundColor: "#0D2233",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#1A3A55",
  },
  ageText: { fontSize: 9, fontWeight: "700", color: "#2E86AB" },
});
