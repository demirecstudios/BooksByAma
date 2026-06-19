import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../supabase";
import BottomNav from "./components/BottomNav";
import { useStatusBarStyle, useTheme } from "./hooks/useTheme";
import type { Theme } from "./theme";

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

export default function BookstoreScreen() {
  const router = useRouter();
  const theme = useTheme();
  const statusBarStyle = useStatusBarStyle();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { colors: C } = theme;
  const [displayName, setDisplayName] = useState("");
  const [avatarLetter, setAvatarLetter] = useState("?");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthor, setIsAuthor] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  // Glow pulse animation
  const glowAnim = useRef(new Animated.Value(0.12)).current;

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const user = session?.user;
      if (!user) return;

      const meta = user.user_metadata ?? {};
      const name: string = meta.full_name?.trim() || user.email || "Reader";
      setDisplayName(name);
      setAvatarLetter(name[0].toUpperCase());

      const adminByMeta = meta.is_admin === true;
      const adminByEmail = user.email === "demirecstudios@gmail.com";
      setIsAdmin(adminByMeta || adminByEmail);

      // ← add this block below setIsAdmin
      const { data: authorData } = await supabase
        .from("authors")
        .select("id")
        .eq("user_id", user.id)
        .single();
      setIsAuthor(!!authorData);
    });

    fetchData();

    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();

    // Looping glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.35,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.12,
          duration: 1800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  async function fetchData() {
    setLoading(true);

    const [booksRes, categoriesRes] = await Promise.all([
      supabase
        .from("books")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true }),
    ]);

    if (!booksRes.error && booksRes.data) setBooks(booksRes.data);
    if (!categoriesRes.error && categoriesRes.data)
      setCategories(categoriesRes.data);

    setLoading(false);
  }

  function showAvatarMenu() {
    Alert.alert(displayName || "Account", "", [
      {
        text: "View Profile",
        onPress: () => router.push("/profile"),
      },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/");
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  const bookCountByCategory = books.reduce(
    (acc, b) => {
      acc[b.category] = (acc[b.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle={statusBarStyle} backgroundColor={C.background} />

      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View>
          <Text style={styles.greeting}>Hello 👋</Text>
          <Text style={styles.displayName} numberOfLines={1}>
            {displayName || "Reader"}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {isAdmin && (
            <TouchableOpacity
              style={styles.adminBtn}
              onPress={() => router.push("/admin")}
            >
              <Text style={styles.adminBtnText}>⚙️ Admin</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.avatarBtn} onPress={showAvatarMenu}>
            <Text style={styles.avatarText}>{avatarLetter}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Hero Banner */}
      <Animated.View style={[styles.hero, { opacity: fadeAnim }]}>
        {/* Animated glow blob — centred */}
        <Animated.View style={[styles.heroGlow, { opacity: glowAnim }]} />
        {/* Second glow on the left for depth */}
        <Animated.View style={[styles.heroGlowLeft, { opacity: glowAnim }]} />

        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>✨ NEW ARRIVALS</Text>
        </View>
        <Image
          source={require("../assets/BooksByAMA.png")}
          style={styles.heroLogo}
          resizeMode="contain"
        />
        <Text style={styles.heroSub}>Magical stories for little minds</Text>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Section Label */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Browse Categories</Text>
          <Text style={styles.sectionCount}>
            {loading ? "Loading..." : `${categories.length} categories`}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <Text style={styles.loadingEmoji}>📚</Text>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : categories.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>📚</Text>
            <Text style={styles.emptyTitle}>No categories yet</Text>
            <Text style={styles.emptyHint}>
              {isAdmin
                ? "Add categories from the Admin panel"
                : "Check back soon!"}
            </Text>
            {isAdmin && (
              <TouchableOpacity
                style={styles.adminShortcut}
                onPress={() => router.push("/admin")}
              >
                <Text style={styles.adminShortcutText}>⚙️ Go to Admin</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.grid}>
            {categories.map((cat) => {
              const count = bookCountByCategory[cat.name] || 0;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.card}
                  activeOpacity={0.75}
                  onPress={() =>
                    router.push({
                      pathname: "/category/[id]",
                      params: { id: cat.id, name: cat.name },
                    })
                  }
                >
                  {/* Cover */}
                  <View style={styles.cardCover}>
                    {cat.cover_url ? (
                      <Image
                        source={{ uri: cat.cover_url }}
                        style={StyleSheet.absoluteFillObject}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.cardCoverPlaceholder}>
                        <Text style={styles.cardPlaceholderEmoji}>📚</Text>
                      </View>
                    )}
                    <View style={styles.cardOverlay} />
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>
                        {count} {count === 1 ? "book" : "books"}
                      </Text>
                    </View>
                  </View>

                  {/* Body */}
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {cat.name}
                    </Text>
                    <Text style={styles.cardSub}>
                      {count === 0
                        ? "No books yet"
                        : `${count} title${count > 1 ? "s" : ""} available`}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
      {/* Floating Author Dashboard Button */}
      {isAuthor && (
        <TouchableOpacity
          style={styles.authorFab}
          onPress={() => router.push("/author")}
        >
          <Text style={styles.authorFabText}>✍️</Text>
        </TouchableOpacity>
      )}

      <BottomNav />
    </View>
  );
}

const createStyles = (theme: Theme) => {
  const C = theme.colors;
  const S = theme.spacing;
  const R = theme.radii;
  const F = theme.fonts;

  return StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: S.screen,
    paddingTop: S.headerTop,
    paddingBottom: S.sm,
    backgroundColor: C.background,
  },
  greeting: {
    fontSize: 12,
    color: C.textFaint,
    fontFamily: F.bodySemi,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  displayName: {
    fontSize: 15,
    color: C.textPrimary,
    fontFamily: F.bodyBold,
    fontWeight: "700",
    maxWidth: 200,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: S.sm + 2 },
  adminBtn: {
    backgroundColor: C.surfaceElevated,
    borderWidth: 1,
    borderColor: C.accent,
    paddingHorizontal: S.md,
    paddingVertical: 7,
    borderRadius: R.pill,
  },
  adminBtnText: {
    color: C.accent,
    fontSize: 12,
    fontFamily: F.bodyBold,
    fontWeight: "700",
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: C.accentMuted,
  },
  avatarText: {
    color: C.white,
    fontFamily: F.bodyBold,
    fontWeight: "bold",
    fontSize: 16,
  },
  hero: {
    marginHorizontal: S.screen,
    marginTop: S.md,
    marginBottom: S.screen,
    backgroundColor: C.surface,
    borderRadius: R.xl,
    padding: S["2xl"],
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    alignItems: "center",
  },
  heroGlow: {
    position: "absolute",
    top: -50,
    alignSelf: "center",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: C.accent,
  },
  heroGlowLeft: {
    position: "absolute",
    bottom: -40,
    left: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: C.accentMuted,
  },
  heroBadge: {
    backgroundColor: C.accentSoft,
    borderWidth: 1,
    borderColor: C.accent,
    alignSelf: "center",
    paddingHorizontal: S.sm + 2,
    paddingVertical: S.xs,
    borderRadius: R.pill,
    marginBottom: 1,
  },
  heroBadgeText: {
    color: C.accent,
    fontSize: 10,
    fontFamily: F.bodyBold,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  heroLogo: {
    width: 250,
    height: 120,
    marginBottom: 0,
  },
  heroSub: {
    fontSize: 13,
    fontFamily: F.body,
    color: C.textMuted,
    letterSpacing: 0.3,
    textAlign: "center",
  },
  scroll: { paddingTop: S.xs, paddingBottom: S.tabBar },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: S.screen,
    marginBottom: S.md + 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: F.bodyExtraBold,
    fontWeight: "800",
    color: C.textPrimary,
    letterSpacing: -0.3,
  },
  sectionCount: {
    fontSize: 12,
    fontFamily: F.body,
    color: C.textMuted,
  },
  loadingBox: { alignItems: "center", paddingVertical: 60 },
  loadingEmoji: { fontSize: 40, marginBottom: S.md },
  loadingText: { fontSize: 14, fontFamily: F.body, color: C.textFaint },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: S.md + 2,
    gap: S.md,
  },
  card: {
    width: "47%",
    backgroundColor: C.surface,
    borderRadius: R.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
  },
  cardCover: {
    aspectRatio: 0.9,
    backgroundColor: C.surfaceElevated,
    overflow: "hidden",
    position: "relative",
  },
  cardCoverPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surfaceElevated,
  },
  cardPlaceholderEmoji: { fontSize: 36 },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.overlay,
  },
  countBadge: {
    position: "absolute",
    bottom: S.sm,
    right: S.sm,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: R.sm + 2,
    paddingHorizontal: S.sm,
    paddingVertical: 3,
  },
  countBadgeText: {
    color: C.white,
    fontSize: 10,
    fontFamily: F.bodyBold,
    fontWeight: "700",
  },
  cardBody: { padding: S.md },
  cardTitle: {
    fontSize: 13,
    fontFamily: F.bodyBold,
    fontWeight: "700",
    color: C.textPrimary,
    marginBottom: S.xs,
  },
  cardSub: {
    fontSize: 10,
    fontFamily: F.bodySemi,
    color: C.textFaint,
    fontWeight: "500",
  },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyEmoji: { fontSize: 48, marginBottom: S.md },
  emptyTitle: {
    fontSize: 18,
    fontFamily: F.bodyBold,
    fontWeight: "700",
    color: C.textPrimary,
    marginBottom: 6,
  },
  emptyHint: {
    fontSize: 13,
    fontFamily: F.body,
    color: C.textFaint,
    marginBottom: S.lg,
  },
  adminShortcut: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.accent,
    paddingHorizontal: S.screen,
    paddingVertical: S.sm + 2,
    borderRadius: R.pill,
  },
  adminShortcutText: {
    color: C.accent,
    fontSize: 13,
    fontFamily: F.bodyBold,
    fontWeight: "700",
  },
  authorFab: {
    position: "absolute",
    bottom: S.tabBar,
    right: S.screen,
    backgroundColor: C.success,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadows.lg,
  },
  authorFabText: {
    fontSize: 24,
  },
});
};
